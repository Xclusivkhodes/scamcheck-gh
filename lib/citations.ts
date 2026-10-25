import type { EvidenceItem } from "./types";

/** Keep only citation numbers and URLs that match the sources we actually fetched. */
export function sanitizeCitations(
  lines: string[],
  citations: number[],
  sources: EvidenceItem[],
): { lines: string[]; citations: number[] } {
  const valid = new Set<number>();
  const cleaned = lines.map((line) =>
    line
      .replace(/\[(\d+)\]/g, (token, raw: string) => {
        const number = Number(raw);
        if (number >= 1 && number <= sources.length) {
          valid.add(number);
          return token;
        }
        return "";
      })
      .replace(/https?:\/\/[^\s)]+/g, (url) => (sources.some((source) => source.url === stripTrail(url)) ? url : ""))
      .replace(/\s{2,}/g, " ")
      .trim(),
  );
  for (const number of citations) {
    if (number >= 1 && number <= sources.length) valid.add(number);
  }
  return {
    lines: cleaned.filter(Boolean),
    citations: [...valid].sort((a, b) => a - b),
  };
}

export function numberedSources(sources: EvidenceItem[]): Array<EvidenceItem & { number: number }> {
  return sources.slice(0, 5).map((source, index) => ({ ...source, number: index + 1 }));
}

function stripTrail(url: string): string {
  return url.replace(/[.,;:]+$/, "");
}
