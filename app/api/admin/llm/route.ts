import { connection } from "next/server";
import { adminOk, jsonError, readJson, requestIdFrom } from "@/lib/http";
import { llmEnabled, setLlmPaused } from "@/lib/spend";

export async function POST(request: Request) {
  await connection();
  const requestId = requestIdFrom(request);
  if (!adminOk(request)) return jsonError(404, "Not found.", "NOT_FOUND", requestId);
  const body = (await readJson(request, 4_096)) as { paused?: boolean };
  if (typeof body?.paused !== "boolean") {
    return jsonError(400, "Send {\"paused\": true} or {\"paused\": false}.", "BAD_INPUT", requestId);
  }
  setLlmPaused(body.paused);
  return Response.json({ ok: true, paused: body.paused, llmEnabled: llmEnabled(), requestId }, { headers: { "x-request-id": requestId } });
}
