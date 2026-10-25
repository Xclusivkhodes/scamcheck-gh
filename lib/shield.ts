import type { CheckResult } from "./types";

export interface ShieldEntry {
  id: string;
  at: string;
  verdict: CheckResult["verdict"];
  headline: string;
  pattern: string;
  amountGhs: number;
  text: string;
}

const KEY = "scamcheck-shield";

export function readShield(): ShieldEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]") as ShieldEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** On this phone only. The server does not keep this list. */
export function rememberShield(result: CheckResult): void {
  if (typeof window === "undefined") return;
  const entry: ShieldEntry = {
    id: `${Date.now()}`,
    at: new Date().toISOString(),
    verdict: result.verdict,
    headline: result.headline,
    pattern: result.patternMatch?.title || result.patternLabel,
    amountGhs: Math.max(0, ...(result.precheck?.amountsGhs ?? [0])),
    text: result.inputText.slice(0, 600),
  };
  const next = [entry, ...readShield()].slice(0, 40);
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function shieldSummary(entries: ShieldEntry[]) {
  const dodged = entries.filter((entry) => entry.verdict === "scam" || entry.verdict === "suspicious");
  const protectedGhs = dodged.reduce((sum, entry) => sum + entry.amountGhs, 0);
  return { checks: entries.length, dodged: dodged.length, protectedGhs };
}
