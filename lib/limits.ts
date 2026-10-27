const minuteHits = new Map<string, number[]>();
const dayHits = new Map<string, number[]>();
const paidHits: number[] = [];
let inFlight = 0;

export function resetLimits(): void {
  minuteHits.clear();
  dayHits.clear();
  paidHits.length = 0;
  inFlight = 0;
}

export function clientIp(headers: Headers | Record<string, string | string[] | undefined>, socketIp = ""): string {
  const trust = process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true";
  if (!trust) return socketIp || "direct";
  const raw = header(headers, "x-forwarded-for");
  const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
  return parts[parts.length - 1] || socketIp || "direct";
}

export function allowIp(ip: string, now = Date.now()): { ok: true } | { ok: false; error: string } {
  const perMinute = cap("RATE_LIMIT_PER_MINUTE", 5);
  const perDay = cap("RATE_LIMIT_PER_DAY", 30);
  const minute = prune(minuteHits, ip, now, 60_000);
  const day = prune(dayHits, ip, now, 24 * 60 * 60 * 1000);
  if (minute.length >= perMinute) {
    return { ok: false, error: "Too many checks from this connection. Wait a minute, or try an example." };
  }
  if (day.length >= perDay) {
    return { ok: false, error: "This connection has used today's checks. Try an example." };
  }
  minute.push(now);
  day.push(now);
  minuteHits.set(ip, minute);
  dayHits.set(ip, day);
  evict(minuteHits, now, 60_000);
  evict(dayHits, now, 24 * 60 * 60 * 1000);
  return { ok: true };
}

/** Paid model calls across every visitor. Cache hits do not count. */
export function allowPaidCall(now = Date.now()): boolean {
  const limit = cap("PAID_CALLS_PER_MINUTE", 20);
  const recent = paidHits.filter((stamp) => now - stamp < 60_000);
  paidHits.length = 0;
  paidHits.push(...recent);
  if (recent.length >= limit) return false;
  paidHits.push(now);
  return true;
}

export function pipelineSlots(): number {
  return cap("PIPELINE_CONCURRENCY", 4);
}

export function tryEnterPipeline(): boolean {
  if (inFlight >= pipelineSlots()) return false;
  inFlight += 1;
  return true;
}

export function leavePipeline(): void {
  inFlight = Math.max(0, inFlight - 1);
}

export const TEXT_LIMIT = 2000;
export const IMAGE_CHAR_LIMIT = 2_000_000;

function cap(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}

function prune(store: Map<string, number[]>, ip: string, now: number, windowMs: number): number[] {
  return (store.get(ip) ?? []).filter((stamp) => now - stamp < windowMs);
}

/** Drop idle keys so the maps cannot grow for every address that ever called. */
function evict(store: Map<string, number[]>, now: number, windowMs: number): void {
  if (store.size < 2000) return;
  for (const [key, stamps] of store) {
    const fresh = stamps.filter((stamp) => now - stamp < windowMs);
    if (fresh.length === 0) store.delete(key);
    else store.set(key, fresh);
  }
}

function header(headers: Headers | Record<string, string | string[] | undefined>, name: string): string {
  if (headers instanceof Headers) return headers.get(name) ?? "";
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
