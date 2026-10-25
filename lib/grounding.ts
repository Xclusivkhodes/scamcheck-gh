import type { EvidenceItem, GroundingReport } from "./types";

/**
 * Second pass, with no model call. A sentence stays only when it does not
 * name a link or a source number we did not fetch. Pattern-library lines have
 * no web URL, so they stay, and the note says when the web had nothing.
 */
export function groundClaims(lines: string[], sources: EvidenceItem[]): GroundingReport {
  const allowed = new Set(sources.map((source) => source.url));
  const kept: string[] = [];
  let dropped = 0;
  for (const line of lines) {
    const urls = line.match(/https?:\/\/[^\s)]+/g) ?? [];
    const badUrl = urls.some((url) => !allowed.has(url.replace(/[.,;:]+$/, "")));
    const cites = [...line.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
    const badCite = cites.some((number) => number < 1 || number > sources.length);
    const inventsWeb = sources.length === 0 && /\b(according to|news (?:site|article)|reported online)\b/i.test(line);
    if (badUrl || badCite || inventsWeb) {
      dropped += 1;
      continue;
    }
    kept.push(line.trim());
  }
  const note =
    sources.length === 0
      ? dropped > 0
        ? "No web evidence found. Claims that pointed at a page were removed."
        : "No web evidence found. These lines are from the Ghana pattern library, not a web page."
      : dropped > 0
        ? `${dropped} ${dropped === 1 ? "line was" : "lines were"} removed because a link or source number was not in the pages we fetched.`
        : "Every line maps to a fetched page or to the pattern library.";
  return { kept, dropped, note };
}
