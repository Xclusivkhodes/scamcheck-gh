import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface FamilyAlert {
  verdict: "scam" | "suspicious";
  pattern: string;
  at: string;
}

const FILE = path.join(process.cwd(), "data", "family-alerts.json");
const CODE = /^[abcdefghjkmnpqrstuvwxyz23456789]{8}$/;

const byCode = new Map<string, FamilyAlert[]>();
let loaded = false;

export function familyCodeOk(code: string): boolean {
  return CODE.test(code);
}

/** Band, pattern title, and time. Never the message, a phone number, or a PIN. */
export function rememberFamilyAlert(code: string, input: { verdict: string; pattern: string }): FamilyAlert | null {
  const normalised = code.trim().toLowerCase();
  if (!familyCodeOk(normalised)) return null;
  if (input.verdict !== "scam" && input.verdict !== "suspicious") return null;
  const pattern = cleanPattern(input.pattern);
  if (!pattern) return null;
  load();
  const alert: FamilyAlert = { verdict: input.verdict, pattern, at: new Date().toISOString() };
  const next = [alert, ...(byCode.get(normalised) ?? [])].slice(0, 30);
  byCode.set(normalised, next);
  persist();
  return alert;
}

export function listFamilyAlerts(code: string): FamilyAlert[] {
  const normalised = code.trim().toLowerCase();
  if (!familyCodeOk(normalised)) return [];
  load();
  return [...(byCode.get(normalised) ?? [])];
}

export function resetFamilyAlertsForTests(): void {
  byCode.clear();
  loaded = true;
}

function cleanPattern(value: string): string {
  const cleaned = value.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!cleaned || cleaned.split(" ").length > 12) return "";
  if (/\d{6,}/.test(cleaned)) return "";
  return cleaned;
}

function load(): void {
  if (loaded) return;
  loaded = true;
  if (process.env.VITEST) return;
  try {
    const parsed = JSON.parse(readFileSync(FILE, "utf8")) as Record<string, FamilyAlert[]>;
    for (const [code, alerts] of Object.entries(parsed)) {
      if (!familyCodeOk(code) || !Array.isArray(alerts)) continue;
      const kept = alerts
        .filter((alert) => (alert.verdict === "scam" || alert.verdict === "suspicious") && typeof alert.pattern === "string")
        .map((alert) => ({ verdict: alert.verdict, pattern: alert.pattern.slice(0, 80), at: String(alert.at || "") }))
        .slice(0, 30);
      if (kept.length > 0) byCode.set(code, kept);
    }
  } catch {
    loaded = true;
  }
}

function persist(): void {
  if (process.env.VITEST) return;
  try {
    mkdirSync(path.dirname(FILE), { recursive: true });
    writeFileSync(FILE, JSON.stringify(Object.fromEntries(byCode), null, 2));
  } catch {
    // The list still works in memory if the disk is read-only.
  }
}
