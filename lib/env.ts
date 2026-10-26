import { z } from "zod";
import { isDemoMode } from "./config";

const liveEnv = z.looseObject({
  NEBIUS_API_KEY: z.string().min(8),
  RADAR_SALT: z.string().min(16),
  NEBIUS_BASE_URL: z.string().url().optional(),
});

/** Demo mode stays the default and does not require keys. Live mode fails fast. */
export function assertEnv(): void {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (isDemoMode()) return;
  const parsed = liveEnv.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Live mode is missing or invalid: ${fields}`);
  }
}
