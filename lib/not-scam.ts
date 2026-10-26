import { asksForSecret } from "./heuristics";
import type { ScamPattern, Verdict } from "./types";

const KEY = "scamcheck-not-scam";
export const NOT_SCAM_EVENT = "scamcheck-not-scam";

export interface NotScamMark {
  key: string;
  pattern: ScamPattern;
  at: string;
  label: string;
}

export interface NotScamDecision {
  verdict: Verdict;
  confidence: number;
  applied: boolean;
  note: string | null;
  tone: "info" | "warn";
}

/** Official alerts share one key. A PIN request is a different key and cannot borrow the note. */
export function notScamKey(pattern: ScamPattern): string {
  return pattern;
}

export function readNotScamMarks(raw: string): NotScamMark[] {
  try {
    const parsed = JSON.parse(raw) as NotScamMark[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((mark) => mark && typeof mark.key === "string" && typeof mark.pattern === "string").slice(0, 24);
  } catch {
    return [];
  }
}

export function loadNotScamMarks(): NotScamMark[] {
  if (typeof window === "undefined") return [];
  return readNotScamMarks(localStorage.getItem(KEY) || "[]");
}

export function saveNotScamMark(mark: NotScamMark): void {
  if (typeof window === "undefined") return;
  const next = [mark, ...loadNotScamMarks().filter((item) => item.key !== mark.key)].slice(0, 24);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(NOT_SCAM_EVENT));
}

export function subscribeNotScam(onStoreChange: () => void): () => void {
  window.addEventListener(NOT_SCAM_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(NOT_SCAM_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function notScamSnapshot(): string {
  return localStorage.getItem(KEY) || "[]";
}

/**
 * A saved "not a scam" note can soften the next similar official alert.
 * It never changes a PIN, OTP, or password request, and it never hides a Scam band.
 */
export function applyNotScam(input: {
  verdict: Verdict;
  confidence: number;
  pattern: ScamPattern;
  text: string;
  hasSecretSignal?: boolean;
  marks: NotScamMark[];
}): NotScamDecision {
  const unchanged: NotScamDecision = {
    verdict: input.verdict,
    confidence: input.confidence,
    applied: false,
    note: null,
    tone: "info",
  };
  const mark = input.marks.find((item) => item.key === notScamKey(input.pattern));
  if (!mark) return unchanged;

  const secret = input.hasSecretSignal || input.pattern === "pin_harvest" || asksForSecret(input.text);
  if (secret) {
    return {
      ...unchanged,
      note: "You marked a similar message as not a scam on this phone. That note does not apply here, because this message asks for a PIN or a code.",
      tone: "warn",
    };
  }

  if (input.pattern !== "official_alert" || input.verdict === "scam") {
    return {
      ...unchanged,
      note:
        input.verdict === "scam"
          ? "You marked a similar message as not a scam. This one still scores as a scam, so the warning stays."
          : "Saved on this phone. It can soften a later official alert. It does not hide a payment request.",
      tone: input.verdict === "scam" ? "warn" : "info",
    };
  }

  return {
    verdict: "looks_ok",
    confidence: input.verdict === "looks_ok" ? input.confidence : Math.max(input.confidence, 74),
    applied: input.verdict !== "looks_ok",
    note: "You marked a similar official alert as not a scam on this phone. A PIN request would still stay a warning.",
    tone: "info",
  };
}
