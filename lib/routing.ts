import { MODEL_IDS } from "./budget";
import { models } from "./config";
import type { RoutePlan } from "./types";

const PRICE: Record<string, { in: number; out: number }> = {
  [MODEL_IDS.nano]: { in: 0.06, out: 0.24 },
  [MODEL_IDS.lightning]: { in: 0.06, out: 0.24 },
  [MODEL_IDS.super]: { in: 0.3, out: 0.9 },
  [MODEL_IDS.vision]: { in: 0.3, out: 0.9 },
};

/**
 * Lightning classifies. Nano writes the answer.
 * Super is used only when the first pass is unsure or the amount is at least GH¢500.
 * Ultra is never selected. Nebius has no separate guard model.
 */
export function chooseRoute(input: { confidence: number; maxAmountGhs: number | null; points: number }): RoutePlan {
  const ids = models();
  const amount = input.maxAmountGhs != null && input.maxAmountGhs >= 500;
  const unsure = input.confidence < 70 || (input.points >= 15 && input.points < 45 && input.confidence < 80);
  const escalated = amount || unsure;
  const reasons: string[] = [];
  if (amount) reasons.push("the amount is at least GH¢500");
  if (unsure) reasons.push("the first pass is not sure enough");
  const verdictModel = escalated ? MODEL_IDS.super : ids.verdict;
  const classifyIn = 700;
  const classifyOut = 180;
  const verdictIn = 900;
  const verdictOut = escalated ? 400 : 220;
  return {
    classifyModel: ids.classify,
    verdictModel,
    escalated,
    reason: escalated
      ? `Super writes this answer because ${reasons.join(" and ")}. Lightning still does the first read.`
      : "Lightning reads the message. Nano writes the answer. Super was not needed.",
    estimatedUsd: roundUsd(cost(ids.classify, classifyIn, classifyOut) + cost(verdictModel, verdictIn, verdictOut)),
    needsSamples: input.confidence < 70,
  };
}

export function estimateUsd(model: string, inputTokens: number, outputTokens: number): number {
  return roundUsd(cost(model, inputTokens, outputTokens));
}

function cost(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICE[model] ?? PRICE[MODEL_IDS.nano];
  return (inputTokens / 1_000_000) * price.in + (outputTokens / 1_000_000) * price.out;
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
