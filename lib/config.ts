import { MODEL_IDS } from "./budget";

/** Nebius Token Factory is OpenAI-compatible. Model IDs match the public catalog. */
export const DEFAULT_NEBIUS_BASE_URL = "https://api.tokenfactory.nebius.com/v1";

export const DEFAULT_MODELS = {
  vision: MODEL_IDS.vision,
  /** Lightning classifies. Nano writes the verdict unless the check is uncertain. */
  classify: MODEL_IDS.lightning,
  verdict: MODEL_IDS.nano,
} as const;

export function nebiusBaseUrl(): string {
  const raw = process.env.NEBIUS_BASE_URL?.trim() || DEFAULT_NEBIUS_BASE_URL;
  return raw.replace(/\/$/, "");
}

export function models() {
  return {
    vision: allowedModel(process.env.NEBIUS_MODEL_VISION, DEFAULT_MODELS.vision),
    classify: allowedModel(process.env.NEBIUS_MODEL_CLASSIFY, DEFAULT_MODELS.classify),
    verdict: allowedModel(process.env.NEBIUS_MODEL_VERDICT, DEFAULT_MODELS.verdict),
  };
}

/** Ultra is never selected. A bad override falls back to the cheap default. */
function allowedModel(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed || /ultra/i.test(trimmed)) return fallback;
  return trimmed;
}

export function hasNebiusKey(): boolean {
  return Boolean(process.env.NEBIUS_API_KEY?.trim());
}

export function hasTavilyKey(): boolean {
  return Boolean(process.env.TAVILY_API_KEY?.trim());
}

/**
 * Live Nebius and Tavily calls run only when DEMO_MODE is explicitly false.
 * Unset, true, or a local dev server without that opt-in stays on sample checks.
 */
export function isDemoMode(): boolean {
  const flag = process.env.DEMO_MODE?.trim().toLowerCase();
  return flag !== "false" && flag !== "0" && flag !== "no";
}
