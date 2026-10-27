import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RadarHit, ScamPattern } from "./types";

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
  { id: "seed-reversal", pattern: "fake_reversal", title: "Fake wrong transfer", mask: "024 ••• 456", count: 18, kind: "number", sample: true },
  { id: "seed-prize", pattern: "prize_scam", title: "Promo prize fee", mask: "mtn-ghana-reward.support", count: 11, kind: "link", sample: true },
  { id: "seed-tax", pattern: "fake_tax", title: "Fake GRA tax link", mask: "gra-tax-clearance.pay-gh.com", count: 9, kind: "link", sample: true },
  { id: "seed-pin", pattern: "pin_harvest", title: "PIN request", mask: "055 ••• 776", count: 7, kind: "number", sample: true },
  { id: "seed-relative", pattern: "relative_impersonation", title: "Relative on a new number", mask: "027 ••• 122", count: 6, kind: "number", sample: true },
  { id: "seed-job", pattern: "job_fee", title: "Job fee", mask: "059 ••• 440", count: 4, kind: "number", sample: true },
];

/** Demo numbers that match the sample rows. The raw value is not written to disk. */
const SAMPLE_PHONES: Array<{ phone: string; count: number }> = [
  { phone: "0244123456", count: 18 },
  { phone: "0551988776", count: 7 },
  { phone: "0593342211", count: 11 },
  { phone: "0277001122", count: 6 },
];

const SAMPLE_HOSTS: Array<{ host: string; count: number }> = [
  { host: "mtn-ghana-reward.support", count: 11 },
  { host: "gra-tax-clearance.pay-gh.com", count: 9 },
];

const recorded = new Map<string, RadarRow>();
let loaded = false;

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("233") ? `0${digits.slice(3)}` : digits;
  if (local.length < 8) return "hidden number";
  return `${local.slice(0, 3)} ••• ${local.slice(-3)}`;
}

/** HMAC of the local number. Null when RADAR_SALT is missing or shorter than 16 characters. */
export function phoneHash(phone: string): string | null {
  const salt = process.env.RADAR_SALT?.trim() ?? "";
  if (salt.length < 16) return null;
  return createHmac("sha256", salt).update(localPhone(phone)).digest("hex");
}

function localPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("233") ? `0${digits.slice(3)}` : digits;
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
  const hash = phoneHash(phone);
  const extra = hash ? recorded.get(`phone:${hash}`)?.count ?? 0 : 0;
  const sample = SAMPLE_PHONES.find((row) => row.phone === localPhone(phone))?.count ?? 0;
  return extra + sample;
}

export function reportsForHost(host: string): number {
  load();
  const key = host.toLowerCase();
  const extra = recorded.get(`host:${key}`)?.count ?? 0;
  const sample = SAMPLE_HOSTS.find((row) => row.host === key)?.count ?? 0;
  return extra + sample;
}

/** Counts already on the radar. Call this before rememberCheck so the current paste is not included. */
export function radarHitsFor(input: { phones: string[]; links: Array<{ host: string; official: boolean }> }): RadarHit[] {
  const hits: RadarHit[] = [];
  const seen = new Set<string>();
  for (const phone of input.phones) {
    const count = reportsForPhone(phone);
    const label = maskPhone(phone);
    if (count > 0 && !seen.has(label)) {
      seen.add(label);
      hits.push({ kind: "number", label, count });
    }
  }
  for (const link of input.links) {
    if (!link.host || link.official) continue;
    const count = reportsForHost(link.host);
    if (count > 0 && !seen.has(link.host)) {
      seen.add(link.host);
      hits.push({ kind: "link", label: link.host, count });
    }
  }
  return hits.sort((a, b) => b.count - a.count).slice(0, 4);
}

/** Stores a mask and a hash. The message text and the full number are not kept. */
const seenToday = new Set<string>();

export function rememberCheck(input: { pattern: ScamPattern; title: string; phones: string[]; hosts: string[]; ip?: string }): void {
  if (process.env.VITEST) return;
  recordRadar(input);
}

/** In-memory record used by tests. Disk writes stay off under Vitest. One ip counts once per target per UTC day. */
export function recordRadar(input: { pattern: ScamPattern; title: string; phones: string[]; hosts: string[]; ip?: string }): void {
  load();
  const day = new Date().toISOString().slice(0, 10);
  const ipKey = createHmac("sha256", "radar-ip").update(input.ip || "direct").digest("hex").slice(0, 16);
  const phoneTargets = input.phones.slice(0, 3).flatMap((phone) => {
    const hash = phoneHash(phone);
    if (!hash) return [];
    return [{ id: `phone:${hash}`, mask: maskPhone(phone), kind: "number" as const }];
  });
  const targets: Array<{ id: string; mask: string; kind: RadarRow["kind"] }> = [
    ...phoneTargets,
    ...input.hosts.slice(0, 2).map((host) => {
      const key = host.toLowerCase();
      return { id: `host:${key}`, mask: key, kind: "link" as const };
    }),
  ];
  if (targets.length === 0) {
    targets.push({ id: `pattern:${input.pattern}`, mask: "pattern only", kind: "pattern" });
  }
  let changed = false;
  for (const target of targets) {
    const dedupe = `${ipKey}:${target.id}:${day}`;
    if (seenToday.has(dedupe)) continue;
    seenToday.add(dedupe);
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
    changed = true;
  }
  if (changed) persist();
}

export function resetRadarForTests(): void {
  recorded.clear();
  seenToday.clear();
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

let radarChain: Promise<void> = Promise.resolve();

function persist(): void {
  if (process.env.VITEST) return;
  const snapshot = JSON.stringify([...recorded.values()], null, 2);
  radarChain = radarChain
    .then(async () => {
      await mkdir(path.dirname(FILE), { recursive: true });
      const tmp = `${FILE}.${process.pid}.tmp`;
      await writeFile(tmp, snapshot);
      await rename(tmp, FILE);
    })
    .catch(() => undefined);
}
