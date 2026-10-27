import { readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODEL_IDS } from "./budget";

/**
 * Catalog list prices in USD per 1,000,000 tokens, read from the Token Factory
 * model catalog on 25 Oct 2026. They are estimates for the kill switch, not an invoice.
 * Override a model with PRICE_IN_USD_PER_MILLION and PRICE_OUT_USD_PER_MILLION only if you
 * re-check the catalog. Unknown models use the Super output price so we over-count.
 */
const PRICE_PER_MILLION: Record<string, { in: number; out: number }> = {
  [MODEL_IDS.nano]: { in: 0.06, out: 0.24 },
  [MODEL_IDS.lightning]: { in: 0.06, out: 0.24 },
  [MODEL_IDS.super]: { in: 0.3, out: 0.9 },
  [MODEL_IDS.vision]: { in: 0.3, out: 0.9 },
};

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  estimated: boolean;
}

interface SpendState {
  promptTokens: number;
  completionTokens: number;
  estimatedUsd: number;
  calls: number;
  /** null follows LLM_ENABLED. false is the phone switch. */
  paused: boolean | null;
  updatedAt: string;
}

const empty = (): SpendState => ({
  promptTokens: 0,
  completionTokens: 0,
  estimatedUsd: 0,
  calls: 0,
  paused: null,
  updatedAt: new Date(0).toISOString(),
});

let state: SpendState = empty();
let loaded = false;

function shouldPersist(): boolean {
  return process.env.NODE_ENV !== "test" || Boolean(process.env.SPEND_FILE);
}

function spendPath(): string {
  return process.env.SPEND_FILE || path.join(process.cwd(), "data", "spend.json");
}

function load(): void {
  if (loaded) return;
  loaded = true;
  if (!shouldPersist()) return;
  try {
    const parsed = JSON.parse(readFileSync(/*turbopackIgnore: true*/ spendPath(), "utf8")) as Partial<SpendState>;
    state = { ...empty(), ...parsed };
  } catch {
    state = empty();
  }
}

let saveChain: Promise<void> = Promise.resolve();

/** Atomic rename, queued off the request path. Free hosts wipe this file on restart. */
function save(): void {
  if (!shouldPersist()) return;
  const snapshot = JSON.stringify(state, null, 2);
  const file = spendPath();
  saveChain = saveChain
    .then(async () => {
      const dir = path.dirname(file);
      await mkdir(dir, { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      await writeFile(tmp, snapshot);
      await rename(tmp, file);
    })
    .catch((error: unknown) => {
      console.error("spend file was not saved", error instanceof Error ? error.name : "error");
    });
}

export function budgetUsd(): number {
  const value = Number(process.env.BUDGET_USD);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function ratio(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value) || value <= 0 || value > 1) return fallback;
  return value;
}

export function softLimitUsd(): number {
  return budgetUsd() * ratio("BUDGET_SOFT_RATIO", 0.7);
}

export function hardLimitUsd(): number {
  return budgetUsd() * ratio("BUDGET_HARD_RATIO", 0.9);
}

export function estimatedUsd(): number {
  load();
  return state.estimatedUsd;
}

export function softTripped(): boolean {
  return estimatedUsd() >= softLimitUsd();
}

export function hardTripped(): boolean {
  return estimatedUsd() >= hardLimitUsd();
}

export function llmEnabled(): boolean {
  load();
  const flag = process.env.LLM_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "no") return false;
  if (state.paused === false) return false;
  return true;
}

export function setLlmPaused(paused: boolean): void {
  load();
  state.paused = paused ? false : null;
  state.updatedAt = new Date().toISOString();
  save();
}

export function recordUsage(model: string, usage: Usage): void {
  load();
  const price = PRICE_PER_MILLION[model] ?? { in: 0.3, out: 0.9 };
  const cost = (usage.promptTokens * price.in + usage.completionTokens * price.out) / 1_000_000;
  state.promptTokens += usage.promptTokens;
  state.completionTokens += usage.completionTokens;
  state.estimatedUsd = round(state.estimatedUsd + cost);
  state.calls += 1;
  state.updatedAt = new Date().toISOString();
  save();
}

export function spendSnapshot() {
  load();
  return {
    promptTokens: state.promptTokens,
    completionTokens: state.completionTokens,
    estimatedUsd: round(state.estimatedUsd),
    calls: state.calls,
    budgetUsd: budgetUsd(),
    softLimitUsd: round(softLimitUsd()),
    hardLimitUsd: round(hardLimitUsd()),
    softTripped: softTripped(),
    hardTripped: hardTripped(),
    llmEnabled: llmEnabled(),
    paused: hardTripped() || !llmEnabled(),
  };
}

export function resetSpend(partial?: Partial<SpendState>): void {
  state = { ...empty(), ...partial, updatedAt: new Date().toISOString() };
  loaded = true;
  save();
}

export function priceFor(model: string): { in: number; out: number } {
  return PRICE_PER_MILLION[model] ?? { in: 0.3, out: 0.9 };
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
