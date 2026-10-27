import { timingSafeEqual } from "node:crypto";
import { CheckError } from "./errors";
import type { ErrorCode } from "./schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requestIdFrom(request: Request): string {
  const inbound = request.headers.get("x-request-id")?.trim() ?? "";
  return UUID.test(inbound) ? inbound : crypto.randomUUID();
}

export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function adminOk(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET?.trim() ?? "";
  if (secret.length < 16) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return safeEqual(token, secret);
}

/** Read the body up to maxBytes, then parse JSON. Oversized bodies are rejected before JSON.parse. */
export async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new CheckError(413, "That request is too large.", "BAD_INPUT");
  }
  if (!request.body) throw new CheckError(400, "Send the message as JSON.", "BAD_INPUT");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new CheckError(413, "That request is too large.", "BAD_INPUT");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(bytes);
  if (!text.trim()) throw new CheckError(400, "Send the message as JSON.", "BAD_INPUT");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new CheckError(400, "Send the message as JSON.", "BAD_INPUT");
  }
}

export function jsonError(
  status: number,
  error: string,
  code: ErrorCode,
  requestId: string,
  extra?: Record<string, string>,
): Response {
  return Response.json(
    { error, code, requestId, ...extra },
    { status, headers: { "x-request-id": requestId } },
  );
}

export function codeForStatus(status: number, explicit?: string): ErrorCode {
  if (explicit === "RATE_LIMITED" || explicit === "BAD_INPUT" || explicit === "LLM_UNAVAILABLE" || explicit === "BUDGET_PAUSED" || explicit === "NOT_FOUND" || explicit === "INTERNAL") {
    return explicit;
  }
  if (status === 413 || status === 400 || status === 422) return "BAD_INPUT";
  if (status === 404) return "NOT_FOUND";
  if (status === 429) return "RATE_LIMITED";
  if (status === 503) return "BUDGET_PAUSED";
  if (status === 502 || status === 504) return "LLM_UNAVAILABLE";
  return "INTERNAL";
}
