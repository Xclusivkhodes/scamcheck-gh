import { TokenLedger } from "./budget";
import { breakerOpen } from "./breaker";
import { hasNebiusKey, hasTavilyKey, isDemoMode, models } from "./config";
import { aiSpendSnapshot, CAP_STORE_MISSING_MESSAGE } from "./ai-spend-cap";
import { patternLabel } from "./copy";
import { mergeEntities } from "./entities";
import { CheckError } from "./errors";
import { TEXT_LIMIT } from "./limits";
import { exampleById } from "./examples";
import { analyzeMessage } from "./heuristics";
import { nebiusChat, nebiusJson, spendCapError, type ChatReply } from "./nebius";
import { finalizeCheck } from "./finalize";
import { presentDemo, fallbackFromAnalysis } from "./present";
import { cachedExample } from "./prewarm";
import { noteStep, remainingMs } from "./request-context";
import { classificationSchema, sampleSchema, verdictSchema } from "./schemas";
import { matchPatterns } from "./patterns";
import { classifySystem, classifyUser, verdictSystem, verdictUser, visionPrompt } from "./prompts";
import { redactSecrets } from "./redact";
import { buildSearchQueries } from "./queries";
import { searchEvidence } from "./tavily";
import type {
  ActionItem,
  Analysis,
  CheckRequest,
  CheckResult,
  Entities,
  Lang,
  ScamPattern,
  TraceStep,
  Verdict,
} from "./types";
import { buildActions } from "./actions";
import { agreementOf, majority } from "./consistency";
import { evidenceNote } from "./evidence";
import { inspectMessage } from "./precheck";
import { lookupReputation, reputationEnabled } from "./reputation";
import { chooseRoute } from "./routing";

const PATTERNS = new Set<ScamPattern>([
  "fake_reversal",
  "pin_harvest",
  "prize_scam",
  "fake_tax",
  "job_fee",
  "relative_impersonation",
  "fake_official_link",
  "account_block",
  "official_alert",
  "payment_request",
  "unclear",
]);

const VERDICTS = new Set<Verdict>(["scam", "suspicious", "looks_ok", "unsure"]);

interface Classified {
  verdict: Verdict;
  confidence: number;
  pattern: ScamPattern;
  patternLabel: string;
  reasoning: string[];
  entities: Entities;
  searchQueries: string[];
}

interface Written {
  verdict: Verdict;
  confidence: number;
  headline: string;
  reasoning: string[];
  actions: ActionItem[];
}

export async function runCheck(input: CheckRequest): Promise<CheckResult> {
  try {
    return finalizeCheck(await executeCheck(input));
  } catch (error) {
    if (!(error instanceof CheckError) || (error.code !== "breaker_open" && error.code !== "DEADLINE" && error.code !== "spend_cap")) throw error;
    if (isDemoMode()) throw error;
    const capped = error.code === "spend_cap";
    const lang: Lang = input.language === "tw" ? "tw" : "en";
    const text = (input.text ?? "").trim().slice(0, TEXT_LIMIT) || "message";
    const demo = presentDemo(analyzeMessage(text), text, lang, {
      extractedFromImage: false,
      imageIgnored: false,
      skipSearch: true,
    });
    return {
      ...demo,
      mode: "fallback",
      demoNote: capped
        ? `${error.message} This answer used the on-device rules.`
        : "The live check is paused. This answer used the on-device rules.",
    };
  }
}

async function executeCheck(input: CheckRequest): Promise<CheckResult> {
  const lang: Lang = input.language === "tw" ? "tw" : "en";
  const typed = (input.text ?? "").trim();
  if (typed.length > TEXT_LIMIT) {
    throw new CheckError(413, "That message is too long. Paste 2000 characters or fewer.", "BAD_INPUT");
  }
  const image = input.imageDataUrl?.trim();
  if (image) validateImage(image);

  if (input.exampleId) {
    const example = exampleById(input.exampleId);
    if (!example) throw new CheckError(404, "That example is not in the list.", "NOT_FOUND");
    const cached = cachedExample({ exampleId: input.exampleId, language: lang });
    if (cached) return emitTrace(cached);
    return emitTrace(presentDemo(analyzeMessage(example.text), example.text, lang, {
      extractedFromImage: false,
      imageIgnored: false,
      skipSearch: input.skipSearch,
    }));
  }

  if (!typed && !image) {
    throw new CheckError(400, "Paste a message or add a photo.");
  }
  if (typed && typed.length < 8 && !image) {
    throw new CheckError(400, "Paste the whole message, including any number or link.");
  }

  if (isDemoMode()) {
    if (image && !typed) {
      throw new CheckError(
        422,
        "We can't read this photo. Type the words you see, then check.",
        "blurry_photo",
      );
    }
    return emitTrace(presentDemo(analyzeMessage(typed), typed, lang, {
      extractedFromImage: false,
      imageIgnored: Boolean(image),
      skipSearch: input.skipSearch,
    }));
  }

  if (!hasNebiusKey()) {
    throw new CheckError(503, "Live mode needs NEBIUS_API_KEY. Set DEMO_MODE=true to use sample checks.", "BUDGET_PAUSED");
  }
  {
    const cap = await aiSpendSnapshot();
    if (cap.capReached) throw spendCapError();
    if (!cap.liveAllowedByStore) throw spendCapError(CAP_STORE_MISSING_MESSAGE);
  }

  return runLive(typed, image, lang, Boolean(input.skipSearch) || !hasTavilyKey());
}

async function runLive(
  typed: string,
  image: string | undefined,
  lang: Lang,
  skipSearch: boolean,
): Promise<CheckResult> {
  if (breakerOpen() || remainingMs() < 500) {
    throw new CheckError(503, "Live checks are paused for a moment.", remainingMs() < 500 ? "DEADLINE" : "breaker_open");
  }
  const ids = models();
  const ledger = new TokenLedger();
  const trace: TraceStep[] = [];
  let text = typed;
  let extractedFromImage = false;

  if (image && !typed) {
    const started = Date.now();
    const visionTokens = ledger.grant(ids.vision, "vision");
    try {
      if (visionTokens < 256) throw new CheckError(429, "This check hit the token cap before the photo could be read.");
      const extracted = await nebiusChat({
        model: ids.vision,
        temperature: 0.1,
        maxTokens: visionTokens,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: visionPrompt() },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      });
      const readable = extracted.content.trim();
      if (!readable || /UNREADABLE/i.test(readable) || readable.length < 8) {
        if (!typed) {
          throw new CheckError(
            422,
            "We can't read this photo. Type the words you see, then check.",
            "blurry_photo",
          );
        }
        pushStep(trace, {
          id: "extract",
          title: "Reading your screenshot",
          label: "Reading your screenshot",
          model: ids.vision,
          provider: "nemotron",
          status: "error",
          durationMs: Date.now() - started,
          summary: "The photo model could not read enough text. The typed message was used.",
        });
      } else {
        text = readable.slice(0, TEXT_LIMIT);
        extractedFromImage = true;
        pushStep(trace, {
          id: "extract",
          title: "Reading your screenshot",
          label: "Reading your screenshot",
          model: ids.vision,
          provider: "nemotron",
          status: "done",
          durationMs: Date.now() - started,
          summary: extracted.cached
            ? "Cached read of this photo. No new vision tokens were spent."
            : "Nemotron read the words in the photo.",
          detail: [redactSecrets(text).text.slice(0, 500), callNote(extracted)].filter(Boolean).join("\n"),
          cached: extracted.cached,
          maxTokens: extracted.maxTokens,
        });
      }
    } catch (error) {
      rethrowLiveStop(error);
      if (!typed) {
        if (error instanceof CheckError) throw error;
        throw new CheckError(502, "The photo could not be read. Type the message instead.");
      }
      pushStep(trace, {
        id: "extract",
        title: "Reading your screenshot",
        label: "Reading your screenshot",
        model: ids.vision,
        provider: "nemotron",
        status: "error",
        durationMs: Date.now() - started,
        summary: "The photo step failed. The typed message was used.",
      });
    }
  }

  const local = analyzeMessage(text);
  const privacy = redactSecrets(text);
  const modelText = privacy.text;
  const patternMatches = matchPatterns(text);
  const draftPre = inspectMessage(text);
  const reputation = reputationEnabled()
    ? await lookupReputation(draftPre.links, {
        rdap: process.env.SCAMCHECK_RDAP === "1",
        safeBrowsingKey: process.env.SAFE_BROWSING_API_KEY,
      })
    : draftPre.reputation;
  const precheck = inspectMessage(text, reputation);
  pushStep(trace, {
    id: "precheck",
    title: "Reading numbers and links",
    label: "Reading numbers and links",
    model: "scamcheck-rules",
    provider: "rules",
    status: "done",
    durationMs: 1,
    summary: privacy.redacted
      ? "Rules read numbers, short codes, and links before any model. PIN and OTP values were removed from the model prompt."
      : "Rules read numbers, short codes, and links before any model.",
    output: precheck.signals.map((signal) => signal.label).join(" · ") || "No risky tokens in the pre-check.",
    detail: precheck.reputation.map((note) => `${note.kind}: ${note.status}. ${note.detail}`).join("\n"),
  });
  let classified = classificationFromAnalysis(local);
  const classStarted = Date.now();
  const classTokens = ledger.grant(ids.classify, "classify");
  try {
    if (classTokens < 128) throw new CheckError(429, "This check hit the token cap before classification.");
    const raw = await nebiusJson({
      model: ids.classify,
      temperature: 0.1,
      maxTokens: classTokens,
      purpose: "classify",
      messages: [
        { role: "system", content: classifySystem(lang) },
        { role: "user", content: classifyUser(modelText, patternMatches) },
      ],
    }, classificationSchema);
    classified = normalizeClassification(raw as Record<string, unknown>, local);
    pushStep(trace, {
      id: "classify",
      title: "Reading the message",
      label: "Reading the message",
      model: ids.classify,
      provider: "nemotron",
      status: "done",
      durationMs: Date.now() - classStarted,
      summary: `Nemotron labelled this as ${classified.patternLabel}.`,
      detail: classified.reasoning.join(" "),
      maxTokens: classTokens,
    });
  } catch (error) {
    rethrowLiveStop(error);
    pushStep(trace, {
      id: "classify",
      title: "Reading the message",
      label: "Reading the message",
      model: ids.classify,
      provider: "nemotron",
      status: "error",
      durationMs: Date.now() - classStarted,
      summary: "Nemotron did not return a usable classification. Local pattern rules were used.",
      detail: local.signals.join(" "),
    });
  }

  const queries = buildSearchQueries(modelText, classified.entities, classified.pattern).map((query) => redactSecrets(query).text);
  const searchStarted = Date.now();
  const searched = skipSearch
    ? { evidence: [], queries: [] as string[] }
    : await searchEvidence(
        (classified.searchQueries.length > 0 ? classified.searchQueries : queries).map((query) => redactSecrets(query).text),
      );
  const queryList = searched.queries.length > 0 ? searched.queries : queries;
  pushStep(trace, {
    id: "search",
    title: "Searching the web for proof",
    label: "Searching the web for proof",
    model: "Tavily Search",
    provider: "tavily",
    status: skipSearch ? "skipped" : searched.evidence.length > 0 ? "done" : "error",
    durationMs: skipSearch ? 0 : Date.now() - searchStarted,
    summary: skipSearch
      ? "Checked without web sources."
      : searched.evidence.length > 0
        ? `Tavily returned ${searched.evidence.length} public pages.`
        : "Web search didn’t answer. Nothing is wrong with your message.",
    output: skipSearch
      ? "Checked without web sources."
      : searched.evidence.map((item) => item.source).join(", "),
    detail: skipSearch ? "Checked without web sources." : queryList.map((query) => `Query: ${query}`).join("\n"),
    input: queryList[0],
  });

  const maxAmount = precheck.amountsGhs.length > 0 ? Math.max(...precheck.amountsGhs) : null;
  const route = chooseRoute({ confidence: classified.confidence, maxAmountGhs: maxAmount, points: precheck.points });
  const consistency = route.needsSamples ? await sampleConsistency(ids.classify, modelText, ledger) : undefined;
  const verdictStarted = Date.now();
  const verdictTokens = ledger.grant(route.verdictModel, "verdict");
  try {
    if (verdictTokens < 128) throw new CheckError(429, "This check hit the token cap before the verdict.");
    const written = await nebiusJson({
      model: route.verdictModel,
      temperature: 0.3,
      maxTokens: verdictTokens,
      purpose: "verdict",
      messages: [
        { role: "system", content: verdictSystem(lang) },
        {
          role: "user",
          content: verdictUser({
            text: modelText,
            classification: classified,
            evidence: searched.evidence,
            entities: classified.entities,
            matches: patternMatches,
          }),
        },
      ],
    }, verdictSchema);
    const final = normalizeVerdict(written as Record<string, unknown>, classified);
    const guarded = guardDisagreement(final, classified);
    pushStep(trace, {
      id: "verdict",
      title: "Weighing the evidence",
      label: "Weighing the evidence",
      model: route.verdictModel,
      provider: "nemotron",
      status: "done",
      durationMs: Date.now() - verdictStarted,
      summary: `Nemotron verdict: ${guarded.verdict} (${guarded.confidence}%). ${route.reason}`,
      detail: guarded.headline,
      maxTokens: verdictTokens,
    });
    return {
      verdict: guarded.verdict,
      confidence: guarded.confidence,
      pattern: classified.pattern,
      patternLabel: classified.patternLabel,
      headline: guarded.headline,
      reasoning: guarded.reasoning,
      entities: classified.entities,
      evidence: searched.evidence,
      evidenceNote: evidenceNote(searched.evidence.length > 0 ? "tavily" : "none", lang),
      actions: buildActions(guarded.verdict, classified.pattern, classified.entities, lang, text),
      trace,
      language: lang,
      mode: "live",
      inputText: text,
      extractedFromImage,
      retention: "memory",
      checkedWithoutWeb: skipSearch || searched.evidence.length === 0,
      precheck,
      route,
      consistency,
    };
  } catch (error) {
    rethrowLiveStop(error);
    pushStep(trace, {
      id: "verdict",
      title: "Weighing the evidence",
      label: "Weighing the evidence",
      model: route.verdictModel,
      provider: "nemotron",
      status: "error",
      durationMs: Date.now() - verdictStarted,
      summary: "Nemotron did not return a usable verdict. The pattern rules wrote the answer.",
    });
    return fallbackFromAnalysis(local, text, lang, trace, searched.evidence, extractedFromImage);
  }
}

async function sampleConsistency(model: string, text: string, ledger: TokenLedger) {
  if (remainingMs() < 4_000) return undefined;
  const grants = [0, 1, 2]
    .map(() => ledger.grant(model, "classify"))
    .filter((tokens) => tokens >= 64);
  const votes: Verdict[] = [];
  const samples = await Promise.all(
    grants.map(async (tokens) => {
      try {
        return await nebiusJson({
          model,
          temperature: 0.7,
          maxTokens: Math.min(160, tokens),
          purpose: "sample",
          messages: [
            { role: "system", content: 'Reply with JSON {"verdict":"scam|suspicious|looks_ok|unsure"} only.' },
            { role: "user", content: text.slice(0, 1500) },
          ],
        }, sampleSchema);
      } catch (error) {
        if (error instanceof CheckError && (error.code === "breaker_open" || error.code === "DEADLINE" || error.code === "spend_cap")) throw error;
        return null;
      }
    }),
  );
  for (const raw of samples) {
    if (raw) votes.push(raw.verdict);
  }
  if (votes.length < 2) return undefined;
  const top = majority(votes);
  const agreed = votes.filter((vote) => vote === top).length;
  return {
    samples: votes.length,
    agreement: agreementOf(votes),
    votes,
    live: true,
    note: `${agreed} of ${votes.length} Lightning samples agreed.`,
  };
}

function callNote(reply: ChatReply): string {
  if (reply.reasoning) return "This model reasoned before it answered.";
  return "";
}

function classificationFromAnalysis(analysis: Analysis): Classified {
  return {
    verdict: analysis.verdict,
    confidence: analysis.confidence,
    pattern: analysis.pattern,
    patternLabel: patternLabel.en[analysis.pattern],
    reasoning: analysis.signals,
    entities: analysis.entities,
    searchQueries: [],
  };
}

function normalizeClassification(raw: Record<string, unknown>, local: Analysis): Classified {
  const pattern = PATTERNS.has(raw.pattern as ScamPattern) ? (raw.pattern as ScamPattern) : local.pattern;
  const verdict = VERDICTS.has(raw.verdict as Verdict) ? (raw.verdict as Verdict) : local.verdict;
  const entities = mergeEntities(local.entities, readEntities(raw.entities));
  const reasoning = readStrings(raw.reasoning);
  const searchQueries = readStrings(raw.searchQueries)
    .filter((query) => !/\b(pin|otp|password)\b/i.test(query))
    .slice(0, 3);
  return {
    verdict,
    confidence: clampNumber(raw.confidence, local.confidence),
    pattern,
    patternLabel:
      typeof raw.patternLabel === "string" && raw.patternLabel.trim()
        ? raw.patternLabel.trim().slice(0, 80)
        : patternLabel.en[pattern],
    reasoning: reasoning.length > 0 ? reasoning.slice(0, 4) : local.signals,
    entities,
    searchQueries,
  };
}

function normalizeVerdict(raw: Record<string, unknown>, classified: Classified): Written {
  const verdict = VERDICTS.has(raw.verdict as Verdict) ? (raw.verdict as Verdict) : classified.verdict;
  const reasoning = readStrings(raw.reasoning).slice(0, 4);
  const actions = readActions(raw.actions);
  const headline = typeof raw.headline === "string" ? raw.headline.trim().slice(0, 180) : "";
  return {
    verdict,
    confidence: clampNumber(raw.confidence, classified.confidence),
    headline: headline || classified.patternLabel,
    reasoning: reasoning.length > 0 ? reasoning : classified.reasoning,
    actions,
  };
}

function guardDisagreement(written: Written, classified: Classified): Written {
  if (classified.verdict === "scam" && written.verdict === "looks_ok") {
    return {
      ...written,
      verdict: "suspicious",
      confidence: Math.min(written.confidence, 64),
      reasoning: [
        "The two checks did not fully agree, so treat this as risky.",
        ...written.reasoning,
      ].slice(0, 4),
    };
  }
  return written;
}

function readEntities(value: unknown): Entities {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    phones: readStrings(record.phones),
    names: readStrings(record.names),
    amounts: readStrings(record.amounts),
    links: readStrings(record.links).filter((link) => /^https?:\/\//i.test(link)),
    organisations: readStrings(record.organisations),
  };
}

function readActions(value: unknown): ActionItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const title = typeof record.title === "string" ? record.title.trim() : "";
      const detail = typeof record.detail === "string" ? record.detail.trim() : "";
      if (!title || !detail) return null;
      return { title: title.slice(0, 120), detail: detail.slice(0, 320) };
    })
    .filter((item): item is ActionItem => Boolean(item))
    .slice(0, 4);
}

function readStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function clampNumber(value: unknown, fallback: number): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function pushStep(trace: TraceStep[], step: TraceStep): void {
  trace.push(step);
  noteStep(step);
}

function emitTrace(result: CheckResult): CheckResult {
  for (const step of result.trace) noteStep(step);
  return result;
}

function rethrowLiveStop(error: unknown): void {
  if (error instanceof CheckError && (error.code === "breaker_open" || error.code === "DEADLINE" || error.code === "spend_cap")) throw error;
}

function validateImage(dataUrl: string): void {
  if (/svg|gif/i.test(dataUrl.slice(0, 80))) {
    throw new CheckError(400, "Use a JPG, PNG, or WEBP photo.", "BAD_INPUT");
  }
  const match = /^data:image\/(png|jpe?g|webp);base64,([a-z0-9+/=\s]+)$/i.exec(dataUrl.trim());
  if (!match) throw new CheckError(400, "Use a JPG, PNG, or WEBP photo.", "BAD_INPUT");
  if (dataUrl.length > 2_500_000) {
    throw new CheckError(413, "That photo is too large. Crop it and try again.", "BAD_INPUT");
  }
  const bytes = Buffer.from(match[2].replace(/\s/g, "").slice(0, 32), "base64");
  const kind = match[1].toLowerCase();
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const webp = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  const ok = kind === "png" ? png : kind === "webp" ? webp : jpeg;
  if (!ok) throw new CheckError(400, "Use a JPG, PNG, or WEBP photo.", "BAD_INPUT");
}
