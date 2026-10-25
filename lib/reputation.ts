import type { LinkFact, ReputationNote } from "./types";

export interface ReputationOptions {
  /** Public RDAP. Off unless SCAMCHECK_RDAP=1. Never required. */
  rdap?: boolean;
  /** Google Safe Browsing v4 key. Lookups are skipped when this is empty. */
  safeBrowsingKey?: string;
  fetchImpl?: typeof fetch;
  now?: Date;
}

/**
 * External lookups are optional. With no key and no RDAP flag, this returns
 * skipped notes and does not touch the network.
 */
export async function lookupReputation(links: LinkFact[], options: ReputationOptions = {}): Promise<ReputationNote[]> {
  const hosts = [...new Set(links.map((link) => link.host).filter(Boolean))];
  if (hosts.length === 0) return [];
  const notes: ReputationNote[] = [];
  const fetchImpl = options.fetchImpl ?? fetch;

  for (const host of hosts.slice(0, 3)) {
    if (!options.rdap) {
      notes.push({
        host,
        kind: "domain_age",
        status: "skipped",
        detail: "Domain age was not checked. Set SCAMCHECK_RDAP=1 to use public RDAP.",
      });
    } else {
      notes.push(await domainAge(host, fetchImpl, options.now ?? new Date()));
    }

    if (!options.safeBrowsingKey) {
      notes.push({
        host,
        kind: "safe_browsing",
        status: "skipped",
        detail: "Safe Browsing was not checked. Add SAFE_BROWSING_API_KEY to enable it.",
      });
    }
  }

  if (options.safeBrowsingKey && hosts.length > 0) {
    notes.push(...(await safeBrowsing(hosts.slice(0, 3), options.safeBrowsingKey, fetchImpl)));
  }

  return notes;
}

export function reputationEnabled(): boolean {
  return process.env.SCAMCHECK_RDAP === "1" || Boolean(process.env.SAFE_BROWSING_API_KEY?.trim());
}

async function domainAge(host: string, fetchImpl: typeof fetch, now: Date): Promise<ReputationNote> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetchImpl(`https://rdap.org/domain/${encodeURIComponent(host)}`, {
      signal: controller.signal,
      headers: { accept: "application/rdap+json, application/json" },
    });
    if (!response.ok) {
      return { host, kind: "domain_age", status: "unavailable", detail: "RDAP did not return this domain." };
    }
    const body = (await response.json()) as { events?: Array<{ eventAction?: string; eventDate?: string }> };
    const registered = body.events?.find((event) => event.eventAction === "registration")?.eventDate;
    if (!registered) return { host, kind: "domain_age", status: "unavailable", detail: "RDAP had no registration date." };
    const ageDays = (now.getTime() - new Date(registered).getTime()) / 86_400_000;
    if (!Number.isFinite(ageDays)) return { host, kind: "domain_age", status: "unavailable", detail: "The registration date could not be read." };
    if (ageDays < 14) {
      return { host, kind: "domain_age", status: "young", detail: `Registered ${Math.max(0, Math.floor(ageDays))} days ago. New domains are a signal, not a verdict.` };
    }
    return { host, kind: "domain_age", status: "old", detail: `Registered about ${Math.floor(ageDays)} days ago.` };
  } catch {
    return { host, kind: "domain_age", status: "unavailable", detail: "RDAP could not be reached. The check continued without it." };
  } finally {
    clearTimeout(timer);
  }
}

async function safeBrowsing(hosts: string[], key: string, fetchImpl: typeof fetch): Promise<ReputationNote[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetchImpl(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(key)}`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client: { clientId: "scamcheck-gh", clientVersion: "1.1.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: hosts.map((host) => ({ url: `http://${host}/` })),
        },
      }),
    });
    if (!response.ok) {
      return hosts.map((host) => ({ host, kind: "safe_browsing" as const, status: "unavailable" as const, detail: "Safe Browsing did not answer." }));
    }
    const body = (await response.json()) as { matches?: Array<{ threat?: { url?: string } }> };
    const hitHosts = new Set((body.matches ?? []).map((match) => hostFromThreat(match.threat?.url)).filter(Boolean));
    return hosts.map((host) =>
      hitHosts.has(host)
        ? { host, kind: "safe_browsing", status: "hit", detail: "Google Safe Browsing lists this host." }
        : { host, kind: "safe_browsing", status: "clean", detail: "Safe Browsing returned no match. That is not proof the site is safe." },
    );
  } catch {
    return hosts.map((host) => ({ host, kind: "safe_browsing" as const, status: "unavailable" as const, detail: "Safe Browsing could not be reached." }));
  } finally {
    clearTimeout(timer);
  }
}

function hostFromThreat(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
