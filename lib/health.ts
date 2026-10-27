import { breakerLabel } from "./breaker";
import { isDemoMode } from "./config";
import { hardTripped, llmEnabled } from "./spend";

export function readiness(): { ok: true; mode: "demo" | "live"; llm: "ok" | "paused" | "breaker_open" } {
  const open = breakerLabel() === "breaker_open";
  const llm = open ? "breaker_open" : !isDemoMode() && llmEnabled() && !hardTripped() ? "ok" : "paused";
  return { ok: true, mode: isDemoMode() ? "demo" : "live", llm };
}
