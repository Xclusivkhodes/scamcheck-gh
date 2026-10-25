import { cacheKey } from "./cache";
import { EXAMPLES } from "./examples";
import { analyzeMessage } from "./heuristics";
import { presentDemo } from "./present";
import type { CheckResult, Lang } from "./types";

const PIPELINE_VERSION = "2";
const byText = new Map<string, CheckResult>();
const byId = new Map<string, CheckResult>();

function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function textKey(text: string, lang: Lang): string {
  return cacheKey({ app: "scamcheck", v: PIPELINE_VERSION, text: normalise(text), lang });
}

export function prewarmExamples(): void {
  if (byText.size > 0) return;
  for (const example of EXAMPLES) {
    for (const lang of ["en", "tw"] as const) {
      const result = presentDemo(analyzeMessage(example.text), example.text, lang, {
        extractedFromImage: false,
        imageIgnored: false,
      });
      result.cacheHit = true;
      result.demoNote =
        lang === "tw"
          ? "Nhwɛso a yɛakora so. Yɛanfrɛ model biara."
          : "Cached example. No model call.";
      byText.set(textKey(example.text, lang), result);
      byId.set(`${example.id}:${lang}`, result);
    }
  }
}

export function cachedExample(input: { exampleId?: string; text?: string; language?: Lang }): CheckResult | undefined {
  prewarmExamples();
  const lang: Lang = input.language === "tw" ? "tw" : "en";
  if (input.exampleId && byId.has(`${input.exampleId}:${lang}`)) {
    return structuredClone(byId.get(`${input.exampleId}:${lang}`));
  }
  const text = input.text?.trim();
  if (!text) return undefined;
  const hit = byText.get(textKey(text, lang));
  return hit ? structuredClone(hit) : undefined;
}

prewarmExamples();
