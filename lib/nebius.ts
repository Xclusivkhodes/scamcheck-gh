import { clampRequestTokens, isUltra } from "./budget";
import { beginModelCall, noteBreakerFailure, noteBreakerSuccess } from "./breaker";
import { cacheKey, TtlCache } from "./cache";
import { hasNebiusKey, isDemoMode, nebiusBaseUrl } from "./config";
import { CheckError } from "./errors";
import { allowPaidCall } from "./limits";
import { messageText, parseModelJson } from "./json";
import { logLlm } from "./observe";
import { currentContext } from "./request-context";
import { hardTripped, llmEnabled, priceFor, recordUsage, type Usage } from "./spend";
import type { z } from "zod";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
}

export interface ChatReply {
  content: string;
  reasoning?: string;
  cached: boolean;
  maxTokens: number;
  usage: Usage;
}

interface ChatOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  signal?: AbortSignal;
  purpose?: string;
  /** JSON calls cache only after the schema accepts the reply. */
  cacheResult?: boolean;
  deadlineAt?: number;
}

interface StoredReply {
  content: string;
  reasoning?: string;
  maxTokens: number;
  usage: Usage;
}

const completionCache = new TtlCache<StoredReply>(80, 15 * 60 * 1000);

export function clearCompletionCache(): void {
  completionCache.clear();
}

export async function nebiusChat(options: ChatOptions): Promise<ChatReply> {
  assertModelCallAllowed(options.model);
  if (!hasNebiusKey()) throw new CheckError(503, "NEBIUS_API_KEY is not set.", "BUDGET_PAUSED");

  const maxTokens = clampRequestTokens(options.maxTokens);
  const temperature = options.temperature ?? 0.2;
  const key = replyKey(options, maxTokens, temperature);
  const cached = completionCache.get(key);
  if (cached && options.cacheResult !== false) {
    logLlm(llmEntry(options, 0, 0, cached.usage, "ok", true));
    return { ...cached, cached: true };
  }

  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (options.json) body.response_format = { type: "json_object" };

  const reply = await fetchWithRetry(options, body);
  if (options.cacheResult !== false) {
    completionCache.set(key, {
      content: reply.content,
      reasoning: reply.reasoning,
      maxTokens,
      usage: reply.usage,
    });
  }
  return { ...reply, cached: false, maxTokens };
}

/** Parse, validate, then cache. A malformed 200 is not stored and is not retried. */
export async function nebiusJson<T>(options: ChatOptions, schema: z.ZodType<T>): Promise<T> {
  const maxTokens = clampRequestTokens(options.maxTokens);
  const temperature = options.temperature ?? 0.2;
  const key = replyKey({ ...options, json: true }, maxTokens, temperature);
  const cached = completionCache.get(key);
  if (cached) {
    const again = schema.safeParse(parseModelJson(cached.content));
    if (again.success) {
      logLlm(llmEntry(options, 0, 0, cached.usage, "ok", true));
      return again.data;
    }
  }

  const reply = await nebiusChat({ ...options, json: true, cacheResult: false });
  let parsed: unknown;
  try {
    parsed = parseModelJson(reply.content);
  } catch {
    throw new CheckError(502, "The model did not return JSON.", "LLM_UNAVAILABLE");
  }
  const checked = schema.safeParse(parsed);
  if (!checked.success) {
    throw new CheckError(502, "The model reply did not match the expected shape.", "LLM_UNAVAILABLE");
  }
  completionCache.set(key, {
    content: reply.content,
    reasoning: reply.reasoning,
    maxTokens: reply.maxTokens,
    usage: reply.usage,
  });
  return checked.data;
}

async function fetchWithRetry(options: ChatOptions, body: Record<string, unknown>): Promise<StoredReply> {
  const maxAttempts = 2;
  let lastError: CheckError | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (!beginModelCall()) {
      throw new CheckError(503, "Live checks are paused for a moment.", "breaker_open");
    }
    if (!allowPaidCall()) {
      throw new CheckError(429, "Too many live checks right now. Try an example.", "RATE_LIMITED");
    }
    const started = Date.now();
    try {
      const result = await postChat(body, callSignal(options));
      if (result.ok) {
        noteBreakerSuccess();
        logLlm(llmEntry(options, attempt + 1, Date.now() - started, result.reply.usage, "ok", false));
        return result.reply;
      }
      const dropFormat = Boolean(options.json && result.status === 400 && body.response_format && attempt === 0);
      if (dropFormat) {
        delete body.response_format;
        logLlm(llmEntry(options, attempt + 1, Date.now() - started, emptyUsage(), "drop_format", false));
        continue;
      }
      noteBreakerFailure();
      const retryable = result.status === 429 || result.status >= 500;
      lastError = new CheckError(
        result.status === 429 ? 429 : 502,
        result.status === 429 ? "Too many live checks right now. Try an example." : "Nebius Token Factory could not complete this step.",
        result.status === 429 ? "RATE_LIMITED" : "LLM_UNAVAILABLE",
      );
      logLlm(llmEntry(options, attempt + 1, Date.now() - started, emptyUsage(), `http_${result.status}`, false));
      if (!retryable || attempt === maxAttempts - 1) throw lastError;
      await sleep(waitMs(attempt, result.retryAfterMs), options.signal);
    } catch (error) {
      if (error instanceof CheckError) throw error;
      noteBreakerFailure();
      const aborted = isAbort(error);
      lastError = new CheckError(
        aborted ? 504 : 502,
        aborted ? "This check took too long." : "Nebius Token Factory could not complete this step.",
        aborted ? "DEADLINE" : "LLM_UNAVAILABLE",
      );
      logLlm(llmEntry(options, attempt + 1, Date.now() - started, emptyUsage(), aborted ? "timeout" : "network", false));
      if (aborted || attempt === maxAttempts - 1 || !isRetryableNetwork(error)) throw lastError;
      await sleep(waitMs(attempt, null), options.signal);
    }
  }
  throw lastError ?? new CheckError(502, "Nebius Token Factory could not complete this step.", "LLM_UNAVAILABLE");
}

async function postChat(
  body: Record<string, unknown>,
  signal: AbortSignal,
): Promise<{ ok: true; reply: StoredReply } | { ok: false; status: number; retryAfterMs: number | null }> {
  const response = await fetch(`${nebiusBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    return { ok: false, status: response.status, retryAfterMs: retryAfter(response) };
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: unknown; reasoning_content?: unknown } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const message = payload.choices?.[0]?.message;
  const reasoning = typeof message?.reasoning_content === "string" ? message.reasoning_content.trim() : "";
  const content = resolveContent(messageText(message?.content), reasoning, Number(body.max_tokens));
  const usage = readUsage(payload.usage, body, content);
  recordUsage(String(body.model), usage);
  return {
    ok: true,
    reply: { content, reasoning: reasoning || undefined, maxTokens: Number(body.max_tokens), usage },
  };
}

function callSignal(options: ChatOptions): AbortSignal {
  const context = currentContext();
  const parent = options.signal ?? context?.signal;
  const deadlineAt = options.deadlineAt ?? (context ? context.startedAt + context.deadlineMs : undefined);
  const cap = /super/i.test(options.model) && !/vl/i.test(options.model) ? 15_000 : 8_000;
  const remaining = deadlineAt ? deadlineAt - Date.now() : cap;
  if (remaining < 250) {
    throw new CheckError(504, "This check took too long.", "DEADLINE");
  }
  const timeout = AbortSignal.timeout(Math.min(cap, remaining));
  if (!parent) return timeout;
  return AbortSignal.any([parent, timeout]);
}

function waitMs(attempt: number, retryAfterMs: number | null): number {
  if (retryAfterMs != null) return Math.min(2000, Math.max(0, retryAfterMs));
  const cap = Math.min(2000, 250 * 2 ** attempt);
  return Math.random() * cap;
}

function retryAfter(response: Response): number | null {
  const raw = response.headers?.get?.("retry-after");
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const when = Date.parse(raw);
  if (Number.isNaN(when)) return null;
  return Math.max(0, when - Date.now());
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function isAbort(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  const code = "code" in error ? String(error.code) : "";
  return name === "AbortError" || name === "TimeoutError" || code === "ABORT_ERR";
}

function isRetryableNetwork(error: unknown): boolean {
  if (isAbort(error)) return true;
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  return code === "ECONNRESET" || code === "ECONNREFUSED" || code === "ETIMEDOUT";
}

function replyKey(options: ChatOptions, maxTokens: number, temperature: number): string {
  return cacheKey({
    v: "3",
    model: options.model,
    temperature,
    maxTokens,
    json: Boolean(options.json),
    messages: options.messages,
  });
}

function llmEntry(
  options: ChatOptions,
  attempt: number,
  ms: number,
  usage: Usage,
  outcome: string,
  cacheHit: boolean,
): Parameters<typeof logLlm>[0] {
  const price = priceFor(options.model);
  const usd = (usage.promptTokens * price.in + usage.completionTokens * price.out) / 1_000_000;
  return {
    ts: new Date().toISOString(),
    requestId: currentContext()?.requestId,
    model: options.model,
    purpose: options.purpose ?? "chat",
    attempt,
    ms,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    usd: Math.round(usd * 1_000_000) / 1_000_000,
    outcome,
    cacheHit,
  };
}

function emptyUsage(): Usage {
  return { promptTokens: 0, completionTokens: 0, estimated: true };
}

function readUsage(
  usage: { prompt_tokens?: number; completion_tokens?: number } | undefined,
  body: Record<string, unknown>,
  content: string,
): Usage {
  const prompt = usage?.prompt_tokens;
  const completion = usage?.completion_tokens;
  if (typeof prompt === "number" && typeof completion === "number") {
    return { promptTokens: prompt, completionTokens: completion, estimated: false };
  }
  const promptChars = JSON.stringify(body.messages ?? "").length;
  return {
    promptTokens: Math.ceil(promptChars / 4),
    completionTokens: Math.ceil(content.length / 4),
    estimated: true,
  };
}

function resolveContent(content: string, reasoning: string, maxTokens: number): string {
  if (content.trim()) return content.trim();
  const fromReasoning = jsonSlice(reasoning);
  if (fromReasoning) return fromReasoning;
  if (reasoning && reasoning.length <= 2500) return reasoning;
  throw new CheckError(
    502,
    `The model spent its token budget on reasoning and returned no answer. This call allowed ${maxTokens} tokens. Super and the vision model need a high NEBIUS_MAX_TOKENS.`,
    "LLM_UNAVAILABLE",
  );
}

function jsonSlice(text: string): string | null {
  if (!text.includes("{")) return null;
  try {
    parseModelJson(text);
  } catch {
    return null;
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return text.slice(start, end + 1);
}

function assertModelCallAllowed(model: string): void {
  if (isUltra(model)) {
    throw new CheckError(503, "Ultra is not on the live path.", "BUDGET_PAUSED");
  }
  if (isDemoMode() || !llmEnabled() || hardTripped()) {
    throw new CheckError(503, "Live model calls are paused.", "BUDGET_PAUSED");
  }
  if (!hasNebiusKey()) throw new CheckError(503, "NEBIUS_API_KEY is not set.", "BUDGET_PAUSED");
  if (process.env.NODE_ENV === "test" && process.env.SCAMCHECK_ALLOW_MOCK_NETWORK !== "1") {
    throw new CheckError(503, "Tests cannot call Nebius. Use DEMO_MODE or a mocked fetch.");
  }
}
