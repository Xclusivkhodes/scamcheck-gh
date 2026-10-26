import { connection } from "next/server";
import { listFamilyAlerts, rememberFamilyAlert } from "@/lib/family-alerts";
import { jsonError, readJson, requestIdFrom } from "@/lib/http";
import { allowIp, clientIp } from "@/lib/limits";
import { familyBodySchema } from "@/lib/schemas";

export async function GET(request: Request) {
  await connection();
  const requestId = requestIdFrom(request);
  const ip = clientIp(request.headers);
  if (!allowIp(`family:${ip}`).ok) return jsonError(429, "Too many requests. Wait a minute.", "RATE_LIMITED", requestId);
  const code = new URL(request.url).searchParams.get("code") || "";
  if (!/^[abcdefghjkmnpqrstuvwxyz23456789]{8}$/.test(code.trim().toLowerCase())) {
    return jsonError(400, "That watch code is not valid.", "BAD_INPUT", requestId);
  }
  return Response.json({
    alerts: listFamilyAlerts(code),
    requestId,
    note: "Each alert is a band and a pattern title. The message is not stored.",
  });
}

export async function POST(request: Request) {
  await connection();
  const requestId = requestIdFrom(request);
  const ip = clientIp(request.headers);
  if (!allowIp(`family-write:${ip}`).ok) return jsonError(429, "Too many requests. Wait a minute.", "RATE_LIMITED", requestId);
  let raw: unknown;
  try {
    raw = await readJson(request, 64 * 1024);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send JSON with a code, a verdict, and a pattern.";
    const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 400;
    return jsonError(status || 400, message, status === 413 ? "BAD_INPUT" : "BAD_INPUT", requestId);
  }
  if (raw && typeof raw === "object" && ("text" in raw || "message" in raw)) {
    return jsonError(400, "Do not send the message. Send the verdict and the pattern title only.", "BAD_INPUT", requestId);
  }
  const parsed = familyBodySchema.safeParse(raw);
  if (!parsed.success) return jsonError(400, "Send JSON with a code, a verdict, and a pattern.", "BAD_INPUT", requestId);
  const saved = rememberFamilyAlert(parsed.data.code, { verdict: parsed.data.verdict, pattern: parsed.data.pattern });
  if (!saved) return jsonError(400, "That alert could not be saved.", "BAD_INPUT", requestId);
  return Response.json({ ok: true, alert: saved, requestId });
}
