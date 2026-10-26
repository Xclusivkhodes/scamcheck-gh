import type { CheckResult } from "./types";

export const FAMILY_KEY = "scamcheck-family";
export const FAMILY_CODE_KEY = "scamcheck-family-code";
export const FAMILY_ALERTS_KEY = "scamcheck-family-alerts";
export const FAMILY_EVENT = "scamcheck-family";

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export interface Relative {
  id: string;
  name: string;
}

export interface LocalFamilyAlert {
  id: string;
  at: string;
  name: string;
  verdict: "scam" | "suspicious";
  pattern: string;
  headline: string;
}

export function newFamilyCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (value) => ALPHABET[value % ALPHABET.length]).join("");
}

export function readPeople(raw: string): Relative[] {
  try {
    const saved = JSON.parse(raw) as Relative[];
    if (!Array.isArray(saved)) return [];
    return saved.filter((person) => person?.name && person?.id);
  } catch {
    return [];
  }
}

export function readLocalAlerts(raw: string): LocalFamilyAlert[] {
  try {
    const saved = JSON.parse(raw) as LocalFamilyAlert[];
    if (!Array.isArray(saved)) return [];
    return saved.filter((alert) => alert?.verdict === "scam" || alert?.verdict === "suspicious");
  } catch {
    return [];
  }
}

export function subscribeFamily(onStoreChange: () => void): () => void {
  window.addEventListener(FAMILY_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(FAMILY_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function familySnapshot(): string {
  return localStorage.getItem(FAMILY_KEY) || "[]";
}

export function familyCodeSnapshot(): string {
  return localStorage.getItem(FAMILY_CODE_KEY) || "";
}

export function familyAlertsSnapshot(): string {
  return localStorage.getItem(FAMILY_ALERTS_KEY) || "[]";
}

export function ensureFamilyCode(): string {
  const current = localStorage.getItem(FAMILY_CODE_KEY) || "";
  if (/^[abcdefghjkmnpqrstuvwxyz23456789]{8}$/.test(current)) return current;
  const code = newFamilyCode();
  localStorage.setItem(FAMILY_CODE_KEY, code);
  window.dispatchEvent(new Event(FAMILY_EVENT));
  return code;
}

/** On this phone, and a mask-only copy on the server when a watch code exists. */
export function noteHighRiskCheck(result: CheckResult): void {
  if (typeof window === "undefined") return;
  if (result.verdict !== "scam" && result.verdict !== "suspicious") return;
  const people = readPeople(localStorage.getItem(FAMILY_KEY) || "[]");
  if (people.length === 0) return;
  const alert: LocalFamilyAlert = {
    id: `${Date.now()}`,
    at: new Date().toISOString(),
    name: people[0]?.name || "Family",
    verdict: result.verdict,
    pattern: (result.patternMatch?.title || result.patternLabel).slice(0, 80),
    headline: result.headline.slice(0, 180),
  };
  const next = [alert, ...readLocalAlerts(localStorage.getItem(FAMILY_ALERTS_KEY) || "[]")].slice(0, 20);
  localStorage.setItem(FAMILY_ALERTS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(FAMILY_EVENT));
  const code = localStorage.getItem(FAMILY_CODE_KEY) || "";
  if (!/^[abcdefghjkmnpqrstuvwxyz23456789]{8}$/.test(code)) return;
  void fetch("/api/family", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, verdict: alert.verdict, pattern: alert.pattern }),
  }).catch(() => undefined);
}
