import { connection } from "next/server";
import { verdictWord } from "@/lib/copy";
import { isDemoMode } from "@/lib/config";
import { CheckError } from "@/lib/errors";
import { codeForStatus, jsonError, requestIdFrom } from "@/lib/http";
import { allowIp, clientIp } from "@/lib/limits";
import { runCheck } from "@/lib/pipeline";
import { verifyTokenMatch, hubSignature, signaturesMatch } from "@/lib/whatsapp-sign";

const MAX_BYTES = 64 * 1024;

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && verifyTokenMatch(expected, token) && challenge && challenge.length < 256) {
    return new Response(challenge, { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  return Response.json(
    {
      ready: false,
      needs: ["WHATSAPP_VERIFY_TOKEN", "WHATSAPP_APP_SECRET", "WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID"],
      note: "The bot is not connected to Meta. POST {\"text\":\"...\"} runs a local check when no app secret is set.",
    },
    { status: expected ? 403 : 200 },
  );
}

export async function POST(request: Request) {
  await connection();
  const requestId = requestIdFrom(request);
  const ip = clientIp(request.headers);
  const gate = allowIp(`wa:${ip}`);
  if (!gate.ok) return jsonError(429, gate.error, "RATE_LIMITED", requestId);

  const raw = await readRaw(request);
  if (raw == null) return jsonError(413, "That request is too large.", "BAD_INPUT", requestId);
  let body: { text?: string; entry?: unknown };
  try {
    body = JSON.parse(raw) as { text?: string; entry?: unknown };
  } catch {
    return jsonError(400, "Send JSON with a text field.", "BAD_INPUT", requestId);
  }

  const secret = process.env.WHATSAPP_APP_SECRET?.trim() ?? "";
  const signature = request.headers.get("x-hub-signature-256");
  const metaShaped = Array.isArray(body.entry);
  if (metaShaped) {
    if (!secret || !signaturesMatch(hubSignature(secret, raw), signature)) {
      return jsonError(401, "The WhatsApp signature did not match.", "BAD_INPUT", requestId);
    }
  } else if (secret && !signaturesMatch(hubSignature(secret, raw), signature)) {
    return jsonError(401, "The WhatsApp signature did not match.", "BAD_INPUT", requestId);
  }

  const text = readText(body);
  if (text.length < 8) return jsonError(400, "Paste the whole message.", "BAD_INPUT", requestId);
  if (text.length > 2000) return jsonError(413, "That message is too long.", "BAD_INPUT", requestId);

  try {
    const result = await runCheck({ text, language: "en" });
    const reply = `${verdictWord(result.verdict, "en")}. ${result.headline} Do not send money or share your PIN. Call 292 if you already did.`;
    return Response.json({ reply, sent: false, mode: isDemoMode() ? "demo" : result.mode, requestId });
  } catch (error) {
    if (error instanceof CheckError) {
      return jsonError(error.status, error.message, codeForStatus(error.status, error.code), requestId);
    }
    return jsonError(500, "The check did not finish.", "INTERNAL", requestId);
  }
}

async function readRaw(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BYTES) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function readText(body: { text?: string; entry?: unknown }): string {
  if (typeof body.text === "string" && body.text.trim()) return body.text.trim();
  const entry = body.entry as Array<{ changes?: Array<{ value?: { messages?: Array<{ text?: { body?: string } }> } }> }> | undefined;
  return entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body?.trim() || "";
}
