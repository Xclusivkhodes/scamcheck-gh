import { createHmac, timingSafeEqual } from "node:crypto";

export function hubSignature(secret: string, rawBody: string): string {
  return `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
}

export function signaturesMatch(expected: string, presented: string | null): boolean {
  if (!presented) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(presented);
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyTokenMatch(expected: string | undefined, presented: string | null): boolean {
  if (!expected || !presented) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(presented);
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
