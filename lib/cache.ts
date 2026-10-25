import { createHash } from "node:crypto";

interface Entry<T> {
  value: T;
  expires: number;
}

export class TtlCache<T> {
  private items = new Map<string, Entry<T>>();

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
  ) {}

  get(key: string): T | undefined {
    const hit = this.items.get(key);
    if (!hit) return undefined;
    if (hit.expires <= Date.now()) {
      this.items.delete(key);
      return undefined;
    }
    this.items.delete(key);
    this.items.set(key, hit);
    return hit.value;
  }

  set(key: string, value: T): void {
    if (this.items.has(key)) this.items.delete(key);
    this.items.set(key, { value, expires: Date.now() + this.ttlMs });
    while (this.items.size > this.maxEntries) {
      const oldest = this.items.keys().next().value;
      if (oldest === undefined) break;
      this.items.delete(oldest);
    }
  }

  clear(): void {
    this.items.clear();
  }
}

export function cacheKey(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
