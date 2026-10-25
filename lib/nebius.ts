import { clampRequestTokens, isUltra } from "./budget";
import { cacheKey, TtlCache } from "./cache";
import { hasNebiusKey, isDemoMode, nebiusBaseUrl } from "./config";
import { CheckError } from "./errors";
import { allowPaidCall } from "./limits";
import { messageText, parseModelJson } from "./json";
import { hardTripped, llmEnabled, recordUsage, type Usage } from "./spend";

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
  if (!hasNebiusKey()) throw new CheckError(503, "NEBIUS_API_KEY is not set.");

  const maxTokens = clampRequestTokens(options.maxTokens);
  const temperature = options.temperature ?? 0.2;
  const key = cacheKey({
    v: "2",
    model: options.model,
    temperature,
    maxTokens,
    json: Boolean(options.json),
    messages: options.messages,
  });
  const cached = completionCache.get(key);
  if (cached) return { ...cached, cached: true };

  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (options.json) body.response_format = { type: "json_object" };
  if (!allowPaidCall()) {
    throw new CheckError(429, "Too many live checks right now. Try an example.");
  }

  const first = await postChat(body, options.signal);
  const reply = first.ok ? first.reply : await retryWithoutJson(options, body, first.status, options.signal);
  completionCache.set(key, {
    content: reply.content,
    reasoning: reply.reasoning,
    maxTokens,
    usage: reply.usage,
  });
  return { ...reply, cached: false, maxTokens };
}

export async function nebiusJson<T>(options: ChatOptions): Promise<T> {
  const reply = await nebiusChat({ ...options, json: true });
  return parseModelJson(reply.content) as T;
}

async function retryWithoutJson(
  options: ChatOptions,
  body: Record<string, unknown>,
  status: number,
  signal?: AbortSignal,
): Promise<StoredReply> {
  if (!(options.json && status === 400)) {
    throw new CheckError(502, "Nebius Token Factory could not complete this step.");
  }
  delete body.response_format;
  const second = await postChat(body, signal);
  if (!second.ok) throw new CheckError(502, "Nebius Token Factory rejected the model request.");
  return second.reply;
}

async function postChat(
  body: Record<string, unknown>,
  parent?: AbortSignal,
): Promise<{ ok: true; reply: StoredReply } | { ok: false; status: number }> {
  const response = await fetch(`${nebiusBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: combineSignals(parent, AbortSignal.timeout(8_000)),
  });
  if (!response.ok) return { ok: false, status: response.status };

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

function combineSignals(parent: AbortSignal | undefined, timeout: AbortSignal): AbortSignal {
  if (!parent) return timeout;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (parent.aborted || timeout.aborted) {
    controller.abort();
    return controller.signal;
  }
  parent.addEventListener("abort", abort, { once: true });
  timeout.addEventListener("abort", abort, { once: true });
  return controller.signal;
}

function resolveContent(content: string, reasoning: string, maxTokens: number): string {
  if (content.trim()) return content.trim();
  const fromReasoning = jsonSlice(reasoning);
  if (fromReasoning) return fromReasoning;
  if (reasoning && reasoning.length <= 2500) return reasoning;
  throw new CheckError(
    502,
    `The model spent its token budget on reasoning and returned no answer. This call allowed ${maxTokens} tokens. Super and the vision model need a high NEBIUS_MAX_TOKENS.`,
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
    throw new CheckError(503, "Ultra is not on the live path.");
  }
  if (isDemoMode() || !llmEnabled() || hardTripped()) {
    throw new CheckError(503, "Live model calls are paused.");
  }
  if (!hasNebiusKey()) throw new CheckError(503, "NEBIUS_API_KEY is not set.");
  if (process.env.NODE_ENV === "test" && process.env.SCAMCHECK_ALLOW_MOCK_NETWORK !== "1") {
    throw new CheckError(503, "Tests cannot call Nebius. Use DEMO_MODE or a mocked fetch.");
  }
}
