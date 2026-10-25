import { hostOf } from "./entities";
import type { Entities, ScamPattern } from "./types";
import { patternLabel } from "./copy";

export function buildSearchQueries(text: string, entities: Entities, pattern: ScamPattern): string[] {
  const queries: string[] = [];
  const label = patternLabel.en[pattern];
  if (pattern !== "unclear" && pattern !== "official_alert") {
    queries.push(`${label} Ghana mobile money scam`);
  } else {
    queries.push("Ghana mobile money fraud advisory Bank of Ghana Cyber Security Authority");
  }
  if (entities.phones[0]) queries.push(`"${entities.phones[0]}" Ghana scam OR fraud`);
  const host = entities.links.map(hostOf).find((value): value is string => Boolean(value));
  if (host) queries.push(`${host} official site OR scam Ghana`);
  if (!host && entities.organisations[0]) {
    queries.push(`${entities.organisations[0]} Ghana official fraud warning`);
  }
  const fromText = text.match(/\b[a-z0-9.-]+\.(?:support|promo|xyz|top|click|loan)\b/i);
  if (fromText && !queries.some((query) => query.includes(fromText[0]))) {
    queries.push(`${fromText[0]} scam Ghana`);
  }
  return [...new Set(queries)].slice(0, 3);
}
