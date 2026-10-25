import { cacheKey, TtlCache } from "./cache";
import { hasTavilyKey, isDemoMode } from "./config";
import type { EvidenceItem } from "./types";

const searchCache = new TtlCache<EvidenceItem[]>(60, 15 * 60 * 1000);

export function clearSearchCache(): void {
  searchCache.clear();
}

export interface TavilyQueryResult {
  evidence: EvidenceItem[];
  queries: string[];
}

const PREFERRED_DOMAINS = [
  "csa.gov.gh",
  "bog.gov.gh",
  "mtn.com.gh",
  "telecel.com.gh",
  "gra.gov.gh",
  "ghana.gov.gh",
];

export async function searchEvidence(queries: string[]): Promise<TavilyQueryResult> {
  const clean = [...new Set(queries.map((query) => query.trim()).filter((query) => query.length > 3))].slice(
    0,
    3,
  );
  if (isDemoMode() || clean.length === 0 || !hasTavilyKey()) return { evidence: [], queries: clean };
  if (process.env.NODE_ENV === "test" && process.env.SCAMCHECK_ALLOW_MOCK_NETWORK !== "1") {
    return { evidence: [], queries: clean };
  }

  const batches = await Promise.all(clean.map((query, index) => searchOne(query, index === 0)));
  const seen = new Set<string>();
  const evidence: EvidenceItem[] = [];
  for (const batch of batches) {
    for (const item of batch) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      evidence.push(item);
    }
  }
  return { evidence: evidence.slice(0, 6), queries: clean };
}

async function searchOne(query: string, preferOfficial: boolean): Promise<EvidenceItem[]> {
  const body: Record<string, unknown> = {
    query,
    search_depth: "fast",
    max_results: 4,
    topic: "general",
    include_answer: false,
  };
  if (preferOfficial) {
    body.include_domains = PREFERRED_DOMAINS;
    body.include_domains_mode = "prefer";
  }

  const key = cacheKey({ query, preferOfficial });
  const cached = searchCache.get(key);
  if (cached) return cached;

  try {
    let response = await postSearch(body);
    if (!response.ok && preferOfficial) {
      delete body.include_domains;
      delete body.include_domains_mode;
      response = await postSearch(body);
    }
    if (!response.ok) return [];
    const payload = (await response.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };
    const items = (payload.results ?? [])
      .filter((item) => typeof item.url === "string" && /^https?:\/\//i.test(item.url))
      .map((item) => ({
        title: (item.title || item.url || "Web page").slice(0, 160),
        url: item.url as string,
        snippet: (item.content || "").replace(/\s+/g, " ").trim().slice(0, 320),
        source: hostLabel(item.url as string),
        origin: "tavily" as const,
      }));
    if (items.length > 0) searchCache.set(key, items);
    return items;
  } catch {
    return [];
  }
}

async function postSearch(body: Record<string, unknown>): Promise<Response> {
  return fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Web";
  }
}
