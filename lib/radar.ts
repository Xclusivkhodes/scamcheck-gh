import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ScamPattern } from "./types";

export interface RadarRow {
  id: string;
  pattern: ScamPattern;
  title: string;
  mask: string;
  count: number;
  kind: "number" | "link" | "pattern";
  sample: boolean;
}

const FILE = path.join(process.cwd(), "data", "radar.json");

/** Illustrative counts so the page is not empty. Live checks add rows that are not marked sample. */
const SEED: RadarRow[] = [
  { id: "seed-reversal", pattern: "fake_reversal", title: "Fake wrong transfer", mask: "024 ••• 776", count: 18, kind: "number", sample: true },
  { id: "seed-prize", pattern: "prize_scam", title: "Promo prize fee", mask: "mtn-ghana-reward.support", count: 11, kind: "link", sample: true },
  { id: "seed-tax", pattern: "fake_tax", title: "Fake GRA tax link", mask: "gra-tax-clearance.pay-gh.com", count: 9, kind: "link", sample: true },
  { id: "seed-pin", pattern: "pin_harvest", title: "PIN request", mask: "055 ••• 111", count: 7, kind: "number", sample: true },
  { id: "seed-relative", pattern: "relative_impersonation", title: "Relative on a new number", mask: "027 ••• 122", count: 6, kind: "number", sample: true },
  { id: "seed-job", pattern: "job_fee", title: "Job fee", mask: "059 ••• 440", count: 4, kind: "number", sample: true },
];

const recorded = new Map<string, RadarRow>();
let loaded = false;

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("233") ? `0${digits.slice(3)}` : digits;
  if (local.length < 8) return "hidden number";
  return `${local.slice(0, 3)} ••• ${local.slice(-3)}`;
}

export function phoneHash(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("233") ? `0${digits.slice(3)}` : digits;
  const salt = process.env.RADAR_SALT || "scamcheck-gh-demo";
  return createHash("sha256").update(`${salt}:${local}`).digest("hex").slice(0, 16);
}

export function listRadar(): RadarRow[] {
  load();
  const rows = [...SEED];
  for (const row of recorded.values()) {
    const seed = rows.find((item) => item.id === row.id);
    if (seed) seed.count += row.count;
    else rows.push(row);
  }
  return rows.sort((a, b) => b.count - a.count);
}

export function reportsForPhone(phone: string): number {
  load();
  const id = `phone:${phoneHash(phone)}`;
  const extra = recorded.get(id)?.count ?? 0;
  return extra;
}

/** Stores a mask and a hash. The message text and the full number are not kept. */
export function rememberCheck(input: { pattern: ScamPattern; title: string; phones: string[]; hosts: string[] }): void {
  if (process.env.VITEST) return;
  load();
  const targets: Array<{ id: string; mask: string; kind: RadarRow["kind"] }> = [
    ...input.phones.slice(0, 3).map((phone) => ({ id: `phone:${phoneHash(phone)}`, mask: maskPhone(phone), kind: "number" as const })),
    ...input.hosts.slice(0, 2).map((host) => ({ id: `host:${host}`, mask: host, kind: "link" as const })),
  ];
  if (targets.length === 0) {
    targets.push({ id: `pattern:${input.pattern}`, mask: "pattern only", kind: "pattern" });
  }
  for (const target of targets) {
    const current = recorded.get(target.id);
    recorded.set(target.id, {
      id: target.id,
      pattern: input.pattern,
      title: input.title,
      mask: target.mask,
      count: (current?.count ?? 0) + 1,
      kind: target.kind,
      sample: false,
    });
  }
  persist();
}

export function resetRadarForTests(): void {
  recorded.clear();
  loaded = true;
}

function load(): void {
  if (loaded) return;
  loaded = true;
  if (process.env.VITEST) return;
  try {
    const parsed = JSON.parse(readFileSync(FILE, "utf8")) as RadarRow[];
    for (const row of parsed) {
      if (!row?.id || row.sample) continue;
      recorded.set(row.id, row);
    }
  } catch {
    loaded = true;
  }
}

function persist(): void {
  if (process.env.VITEST) return;
  try {
    mkdirSync(path.dirname(FILE), { recursive: true });
    writeFileSync(FILE, JSON.stringify([...recorded.values()], null, 2));
  } catch {
    // The radar still works in memory if the disk is read-only.
  }
}
