import { connection } from "next/server";
import { readiness } from "@/lib/health";

export async function GET() {
  await connection();
  return Response.json(readiness());
}
