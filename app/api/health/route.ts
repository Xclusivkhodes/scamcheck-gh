import { connection } from "next/server";
import { checkTokenCap, requestTokenCap } from "@/lib/budget";
import { hasNebiusKey, hasTavilyKey, isDemoMode, models, nebiusBaseUrl } from "@/lib/config";

export async function GET() {
  await connection();
  return Response.json({
    demoMode: isDemoMode(),
    nebiusConfigured: hasNebiusKey(),
    tavilyConfigured: hasTavilyKey(),
    baseUrl: nebiusBaseUrl(),
    models: models(),
    requestTokenCap: requestTokenCap(),
    checkTokenCap: checkTokenCap(),
  });
}
