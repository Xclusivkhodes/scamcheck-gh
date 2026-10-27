import { connection } from "next/server";
import { adminOk, jsonError, requestIdFrom } from "@/lib/http";
import { metricSnapshot } from "@/lib/observe";
import { spendSnapshot } from "@/lib/spend";

export async function GET(request: Request) {
  await connection();
  const requestId = requestIdFrom(request);
  if (!adminOk(request)) return jsonError(404, "Not found.", "NOT_FOUND", requestId);
  return Response.json({ requestId, ...metricSnapshot(), spend: spendSnapshot() }, { headers: { "x-request-id": requestId } });
}
