/** Public Token Factory model IDs. Cheap models are the default. */
export const MODEL_IDS = {
  nano: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
  lightning: "nvidia/Nemotron-3_5-Lightning",
  super: "nvidia/nemotron-3-super-120b-a12b",
  ultra: "nvidia/Nemotron-3-Ultra-550b-a55b",
  vision: "nvidia/Nemotron-3.5-Super-VL",
} as const;

const HARD_REQUEST_CEILING = 1000;

/** One call cannot ask for more than this. Super’s verdict cap is the ceiling. */
export function requestTokenCap(): number {
  return readCap("NEBIUS_MAX_TOKENS", 1000, 128, HARD_REQUEST_CEILING);
}

export function checkTokenCap(): number {
  return readCap("NEBIUS_CHECK_TOKEN_CAP", 2400, 512, 4000);
}

export function modelNeedsReasoningRoom(model: string): boolean {
  return /super/i.test(model) && !/vl/i.test(model) && !/ultra/i.test(model);
}

export function isUltra(model: string): boolean {
  return /ultra/i.test(model);
}

/**
 * Classify stays short. Nano’s verdict is 500 tokens.
 * Super, used only when confidence is low, is capped at 1000 because it
 * spends tokens on reasoning before the answer.
 * The vision model runs only for photos.
 */
export function desiredTokens(model: string, role: "vision" | "classify" | "verdict"): number {
  const cap = requestTokenCap();
  if (role === "vision") return Math.min(800, cap);
  if (role === "classify") return Math.min(300, cap);
  if (role === "verdict" && modelNeedsReasoningRoom(model)) return Math.min(1000, cap);
  return Math.min(500, cap);
}

export function clampRequestTokens(requested: number | undefined): number {
  const cap = requestTokenCap();
  const asked = requested ?? cap;
  return Math.min(cap, Math.max(1, Math.floor(asked)));
}

/** Stops one check from stacking a vision call and a large verdict call. */
export class TokenLedger {
  used = 0;

  constructor(private readonly checkCap = checkTokenCap()) {}

  grant(model: string, role: "vision" | "classify" | "verdict"): number {
    const room = this.checkCap - this.used;
    const granted = Math.max(0, Math.min(desiredTokens(model, role), room, requestTokenCap()));
    this.used += granted;
    return granted;
  }
}

function readCap(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(raw)));
}
