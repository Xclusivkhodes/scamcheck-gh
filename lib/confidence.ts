/** Four segments. The panel shows the word, never a percentage. */
export function confidenceMeter(confidence: number): { words: string; segments: number } {
  if (confidence >= 90) return { words: "Very sure", segments: 4 };
  if (confidence >= 75) return { words: "Sure", segments: 3 };
  if (confidence >= 60) return { words: "Fairly sure", segments: 2 };
  return { words: "Not sure", segments: 1 };
}

export function modelShortName(model: string): string {
  if (model === "scamcheck-rules" || /rules/i.test(model)) return "ScamCheck rules";
  if (/tavily/i.test(model)) return "Tavily Search";
  if (/vl/i.test(model)) return "Nemotron VL";
  if (/ultra/i.test(model)) return "Nemotron Ultra";
  if (/super/i.test(model)) return "Nemotron 3 Super";
  if (/lightning/i.test(model)) return "Nemotron Lightning";
  if (/nano/i.test(model)) return "Nemotron 3 Nano";
  if (/nemotron/i.test(model)) return "Nemotron";
  return model;
}

export function providerKind(provider: string, model: string): "nemotron" | "tavily" | "rules" {
  if (provider === "rules" || model === "scamcheck-rules") return "rules";
  if (/tavily/i.test(provider) || /tavily/i.test(model)) return "tavily";
  return "nemotron";
}
