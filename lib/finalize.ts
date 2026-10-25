import { providerKind } from "./confidence";
import { attachIntel } from "./intel";
import { buildActions } from "./official";
import type { CheckResult, Lang, TraceStep, Verdict } from "./types";

const RULES_MODEL = "scamcheck-rules";

export function settleVerdict(verdict: Verdict, confidence: number): Verdict {
  if (confidence < 60) return "unsure";
  return verdict;
}

export function finalizeCheck(result: CheckResult): CheckResult {
  const traced = { ...result, trace: withRules(result.trace.map(shapeStep), result.language), retention: "memory" as const };
  const intel = attachIntel(traced);
  const verdict = settleVerdict(intel.verdict, intel.confidence);
  const becameUnsure = verdict === "unsure" && result.verdict !== "unsure";
  return {
    ...intel,
    verdict,
    headline: becameUnsure ? unsureHeadline(result.language) : intel.headline,
    actions: buildActions(verdict, intel.pattern, intel.entities, intel.language, intel.inputText),
    retention: "memory",
  };
}

function unsureHeadline(lang: Lang): string {
  return lang === "tw"
    ? "Yɛnnye nni. Fa no sɛ ɛyɛ hu, na frɛ wo network wɔ 100 ansa na woatua."
    : "We're not sure. Treat it as suspicious, and call your network on 100 before you send anything.";
}

function shapeStep(step: TraceStep): TraceStep {
  const provider = providerKind(step.provider, step.model);
  return {
    ...step,
    label: step.label || step.title,
    ms: step.ms ?? step.durationMs,
    provider,
    input: step.input,
    output: step.output || step.summary,
  };
}

function withRules(steps: TraceStep[], lang: Lang): TraceStep[] {
  const kept = steps.filter((step) => step.id !== "rules");
  const rules: TraceStep = {
    id: "rules",
    title: lang === "tw" ? "Yɛpaw wo nneyɛe" : "Picked your next steps",
    label: lang === "tw" ? "Yɛpaw wo nneyɛe" : "Picked your next steps",
    model: RULES_MODEL,
    provider: "rules",
    status: "done",
    durationMs: 1,
    ms: 1,
    summary: "ScamCheck rules · no AI",
    input: "The verdict and the network named in the message",
    output:
      "Fixed contacts only: MTN *170# › 6 › 4, MTN care 100, Cyber Security Authority 292, Police 191 / 18555. AT Money is a placeholder.",
  };
  return [...kept, rules];
}
