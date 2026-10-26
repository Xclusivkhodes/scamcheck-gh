import { connection } from "next/server";

/** Liveness only. No config, no disk, no model calls. */
export async function GET() {
  await connection();
  return Response.json({ ok: true });
}
