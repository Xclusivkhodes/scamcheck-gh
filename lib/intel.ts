import { planSamples } from "./consistency";
import { safeHeadline } from "./copy";
import { groundClaims } from "./grounding";
import { matchPattern } from "./patterns";
import { inspectMessage } from "./precheck";
import { rememberCheck } from "./radar";
import { chooseRoute } from "./routing";
import type { CheckResult, ScamPattern, Verdict } from "./types";

export function attachIntel(result: CheckResult): CheckResult {
  const seeded = result.precheck?.reputation ?? [];
  const precheck = inspectMessage(result.inputText, seeded);
  const patternMatch = matchPattern(result.inputText);
  const maxAmount = precheck.amountsGhs.length > 0 ? Math.max(...precheck.amountsGhs) : null;
  const route = result.route ?? chooseRoute({ confidence: result.confidence, maxAmountGhs: maxAmount, points: precheck.points });
  const consistency = result.consistency ?? planSamples(result.verdict, result.confidence, result.mode === "live");
  const grounding = groundClaims(result.reasoning, result.evidence);
  const verdict = calibrateVerdict(result.verdict, result.confidence, precheck.points, consistency.agreement, result.pattern);
  const changed = verdict !== result.verdict;
  const hosts = precheck.links.filter((link) => link.host && !link.official).map((link) => link.host);
  if (result.mode === "demo" || result.mode === "live") {
    rememberCheck({
      pattern: patternMatch?.pattern ?? result.pattern,
      title: patternMatch?.title ?? result.patternLabel,
      phones: precheck.phones,
      hosts,
    });
  }
  return {
    ...result,
    verdict,
    headline: changed ? safeHeadline(verdict, result.pattern, result.language) : result.headline,
    reasoning: grounding.kept.length > 0 ? grounding.kept : result.reasoning,
    precheck,
    patternMatch,
    route,
    consistency,
    grounding,
  };
}

export function calibrateVerdict(
  verdict: Verdict,
  confidence: number,
  points: number,
  agreement: number,
  pattern: ScamPattern,
): Verdict {
  let next = verdict;
  if (pattern === "official_alert" && points < 20 && confidence >= 60 && verdict !== "scam") next = "looks_ok";
  if (points >= 45 && next === "suspicious" && confidence >= 60) next = "scam";
  if (points >= 20 && next === "looks_ok" && pattern !== "official_alert") next = "suspicious";
  if (agreement < 0.67 && confidence < 80) next = "unsure";
  return confidence < 60 ? "unsure" : next;
}
