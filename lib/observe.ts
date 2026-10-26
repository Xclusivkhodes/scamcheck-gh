import { createHash } from "node:crypto";

export interface RequestLog {
  ts: string;
  level: "info" | "error";
  requestId: string;
  route: string;
  status: number;
  ms: number;
  mode?: string;
  ipHash: string;
}

export interface LlmLog {
  ts: string;
  requestId?: string;
  model: string;
  purpose: string;
  attempt: number;
  ms: number;
  promptTokens: number;
  completionTokens: number;
  usd: number;
  outcome: string;
  cacheHit: boolean;
}

const durations: number[] = [];
const llmEvents: LlmLog[] = [];

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export function textFingerprint(text: string): { sha256: string; length: number } {
  return { sha256: createHash("sha256").update(text).digest("hex").slice(0, 16), length: text.length };
}

export function logRequest(entry: RequestLog): void {
  durations.push(entry.ms);
  if (durations.length > 4000) durations.shift();
  console.log(JSON.stringify(entry));
}

export function logLlm(entry: LlmLog): void {
  llmEvents.push(entry);
  if (llmEvents.length > 400) llmEvents.shift();
  console.log(JSON.stringify({ kind: "llm", ...entry }));
}

export function metricSnapshot() {
  const sorted = [...durations].sort((a, b) => a - b);
  return {
    requests: sorted.length,
    p50Ms: percentile(sorted, 0.5),
    p99Ms: percentile(sorted, 0.99),
    recentLlm: llmEvents.slice(-20),
  };
}

export function resetMetrics(): void {
  durations.length = 0;
  llmEvents.length = 0;
}

function percentile(sorted: number[], ratio: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1);
  return sorted[Math.max(0, index)];
}
