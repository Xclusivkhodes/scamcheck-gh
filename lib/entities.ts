import type { Entities } from "./types";

const OFFICIAL_DOMAINS = [
  "mtn.com.gh",
  "mtn.com",
  "momo.mtn.com",
  "telecel.com.gh",
  "telecel.com",
  "at.com.gh",
  "bog.gov.gh",
  "csa.gov.gh",
  "cybersecurity.gov.gh",
  "gra.gov.gh",
  "ghana.gov.gh",
  "gcb.com.gh",
  "gcbbank.com.gh",
  "ecobank.com",
  "absa.com.gh",
  "absa.africa",
  "stanbicbank.com.gh",
  "calbank.net",
  "myfidelitybank.net",
  "fidelitybank.com.gh",
  "ghana.accessbankplc.com",
  "zenithbank.com.gh",
  "republicghana.com",
  "ssnit.org.gh",
  "ghipss.com",
  "ecg.com.gh",
  "police.gov.gh",
  "ghanapost.com.gh",
  "nhis.gov.gh",
];

const SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "cutt.ly",
  "rb.gy",
  "shorturl.at",
  "tiny.cc",
  "is.gd",
  "goo.gl",
  "rebrand.ly",
]);

const ORG_RULES: { name: string; re: RegExp; authority: boolean }[] = [
  { name: "MTN MoMo", re: /\b(mtn\s*momo|mtn mobile money|mobile money)\b/i, authority: true },
  { name: "MoMo", re: /\bmomo\b/i, authority: true },
  { name: "MTN", re: /\bmtn\b/i, authority: true },
  { name: "Telecel Cash", re: /\b(telecel|vodafone cash)\b/i, authority: true },
  { name: "AT Money", re: /\b(at money|airteltigo)\b/i, authority: true },
  { name: "Bank of Ghana", re: /\b(bank of ghana|bog)\b/i, authority: true },
  { name: "GRA", re: /\b(gra|ghana revenue authority)\b/i, authority: true },
  { name: "GCB Bank", re: /\bgcb\b/i, authority: true },
  { name: "Ecobank", re: /\becobank\b/i, authority: true },
  { name: "Absa", re: /\babsa\b/i, authority: true },
  { name: "Stanbic", re: /\bstanbic\b/i, authority: true },
  { name: "CalBank", re: /\bcalbank\b/i, authority: true },
  { name: "Fidelity Bank", re: /\bfidelity bank\b/i, authority: true },
  { name: "Access Bank", re: /\baccess bank\b/i, authority: true },
  { name: "Zenith Bank", re: /\bzenith bank\b/i, authority: true },
  { name: "Republic Bank", re: /\brepublic bank\b/i, authority: true },
  { name: "SSNIT", re: /\bssnit\b/i, authority: true },
  { name: "Cyber Security Authority", re: /\b(cyber security authority|cert-gh)\b/i, authority: true },
  { name: "ECG", re: /\b(ecg|electricity company of ghana)\b/i, authority: true },
  { name: "Ghana Police", re: /\bghana police\b/i, authority: true },
  { name: "Ghana Post", re: /\b(ghana post|customs)\b/i, authority: true },
  { name: "NHIS", re: /\bnhis\b/i, authority: true },
  { name: "DStv", re: /\bdstv\b/i, authority: false },
];

export function emptyEntities(): Entities {
  return { phones: [], names: [], amounts: [], links: [], organisations: [] };
}

export function extractEntities(text: string): Entities {
  return {
    phones: extractPhones(text),
    names: extractNames(text),
    amounts: extractAmounts(text),
    links: extractLinks(text),
    organisations: extractOrganisations(text),
  };
}

export function extractPhones(text: string): string[] {
  const found = new Set<string>();
  const re = /(?<!\d)(?:\+233|233|0)[\s-]?([235]\d{2})[\s-]?(\d{3})[\s-]?(\d{3})(?!\d)/g;
  for (const match of text.matchAll(re)) {
    found.add(`0${match[1]}${match[2]}${match[3]}`);
  }
  return [...found];
}

export function extractAmounts(text: string): string[] {
  const found = new Set<string>();
  const re =
    /(?:(?:GHS|GH₵|GHC|₵)\s?\d{1,3}(?:[, ]\d{3})*(?:\.\d{1,2})?|\d{1,3}(?:,\d{3})*(?:\.\d{2})\s*(?:cedis|GHS))/gi;
  for (const match of text.matchAll(re)) {
    found.add(match[0].replace(/\s+/g, " ").trim());
  }
  return [...found];
}

export function extractLinks(text: string): string[] {
  const found = new Set<string>();
  const re = /https?:\/\/[^\s<>"')\]]+/gi;
  for (const match of text.matchAll(re)) {
    found.add(match[0].replace(/[.,;:]+$/, ""));
  }
  return [...found];
}

export function extractNames(text: string): string[] {
  const found = new Set<string>();
  const titled =
    /\b(?:Mr|Mrs|Miss|Ms|Alhaji|Hajia|Dr|Pastor|Uncle|Auntie)\.?\s+[A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+){0,2}/gi;
  for (const match of text.matchAll(titled)) found.add(match[0].replace(/\s+/g, " "));
  const shouted = /\bfrom\s+([A-Z]{2,}(?:\s+[A-Z]{2,}){0,2})\b/g;
  for (const match of text.matchAll(shouted)) {
    const name = match[1];
    if (!/^(MTN|GRA|GCB|ATM|PIN|SMS)$/.test(name)) found.add(toTitle(name));
  }
  return [...found];
}

export function extractOrganisations(text: string): string[] {
  const found: string[] = [];
  for (const rule of ORG_RULES) {
    if (rule.re.test(text)) found.push(rule.name);
  }
  const hasMomo = found.includes("MTN MoMo") || found.includes("MoMo");
  return found.filter((name) => !(name === "MTN" && hasMomo));
}

export function claimsAuthority(text: string): boolean {
  return ORG_RULES.some((rule) => rule.authority && rule.re.test(text));
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function isOfficialHost(host: string): boolean {
  return OFFICIAL_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function isShortener(host: string): boolean {
  return SHORTENERS.has(host);
}

export function suspiciousLinks(links: string[], authorityClaim: boolean): string[] {
  return links.filter((link) => {
    const host = hostOf(link);
    if (!host) return false;
    if (isShortener(host)) return true;
    if (authorityClaim && !isOfficialHost(host)) return true;
    return false;
  });
}

export function mergeEntities(primary: Entities, extra: Entities): Entities {
  return {
    phones: unique([...primary.phones, ...extra.phones]),
    names: unique([...primary.names, ...extra.names]),
    amounts: unique([...primary.amounts, ...extra.amounts]),
    links: unique([...primary.links, ...extra.links]),
    organisations: unique([...primary.organisations, ...extra.organisations]),
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function toTitle(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
