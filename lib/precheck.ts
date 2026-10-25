import {
  extractAmounts,
  extractLinks,
  extractPhones,
  hostOf,
  isOfficialHost,
  isShortener,
} from "./entities";
import type { LinkFact, PrecheckReport, PrecheckSignal, ReputationNote } from "./types";

const BRANDS = ["mtn", "momo", "telecel", "vodafone", "airteltigo", "ecobank", "gcb", "gra", "ecg", "absa", "stanbic", "calbank", "zeepay", "ssnit"] as const;

const STOP = new Set([
  "the", "and", "for", "you", "your", "this", "that", "with", "from", "have", "has", "was", "are", "not", "but", "please", "kindly", "send", "call", "now", "dear", "hello",
]);

/** Characters fraudsters swap. Folded before the edit-distance check. */
const CONFUSABLES: Record<string, string> = {
  "0": "o",
  "1": "l",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "€": "e",
  "а": "a",
  "е": "e",
  "о": "o",
  "р": "p",
  "с": "c",
  "у": "y",
  "х": "x",
  "і": "i",
  "ї": "i",
  "ј": "j",
  "ѕ": "s",
};

export function inspectMessage(text: string, reputation: ReputationNote[] = []): PrecheckReport {
  const normalised = text.normalize("NFKC");
  const phones = extractPhones(normalised);
  const shortCodes = extractShortCodes(normalised);
  const links = extractLinks(normalised).map(describeLink);
  const amountsGhs = extractAmounts(normalised).map(parseGhs).filter((value): value is number => value != null);
  const lookalikes = findLookalikes(normalised);
  const signals = scoreSignals(normalised, links, lookalikes, reputation);
  const points = signals.reduce((sum, signal) => sum + signal.points, 0);
  return { phones, shortCodes, links, amountsGhs, lookalikes, signals, points, reputation };
}

export function extractShortCodes(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(/\*\d{2,4}(?:\*\d{1,4})*#/g)) found.add(match[0]);
  return [...found];
}

export function parseGhs(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").replace(/[^\d.]/g, "");
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0 || value > 10_000_000) return null;
  return value;
}

export function describeLink(url: string): LinkFact {
  const host = hostOf(url) ?? "";
  return {
    url,
    host,
    shortener: host ? isShortener(host) : false,
    official: host ? isOfficialHost(host) : false,
    punycode: host.startsWith("xn--") || url.toLowerCase().includes("xn--"),
  };
}

export function findLookalikes(text: string): Array<{ token: string; brand: string; distance: number }> {
  const hits: Array<{ token: string; brand: string; distance: number }> = [];
  const seen = new Set<string>();
  for (const raw of text.split(/[^\p{L}\p{N}]+/u)) {
    if (raw.length < 3 || raw.length > 14) continue;
    const folded = fold(raw);
    if (folded.length < 3 || STOP.has(folded)) continue;
    for (const brand of BRANDS) {
      const plain = raw.toLowerCase().replace(/[^a-z]/g, "");
      if (plain === brand) continue;
      const limit = brand.length >= 6 ? 2 : 1;
      const distance = folded === brand ? 1 : levenshtein(folded, brand);
      if (distance === 0 || distance > limit) continue;
      const key = `${raw.toLowerCase()}:${brand}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ token: raw, brand, distance });
    }
  }
  return hits.slice(0, 6);
}

export function levenshtein(left: string, right: string): number {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const grid = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let row = 0; row < rows; row += 1) grid[row][0] = row;
  for (let col = 0; col < cols; col += 1) grid[0][col] = col;
  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      grid[row][col] = Math.min(grid[row - 1][col] + 1, grid[row][col - 1] + 1, grid[row - 1][col - 1] + cost);
    }
  }
  return grid[left.length][right.length];
}

function scoreSignals(
  text: string,
  links: LinkFact[],
  lookalikes: Array<{ token: string; brand: string }>,
  reputation: ReputationNote[],
): PrecheckSignal[] {
  const signals: PrecheckSignal[] = [];
  if (/\b(pin|otp|one[- ]time|password|ghana\s*card|ghanacard)\b/i.test(text) && !/\b(do not|don't|never)\s+(share|give|send)\b/i.test(text)) {
    signals.push({
      id: "secret",
      label: "Asks for a PIN, OTP, or Ghana Card",
      points: 28,
      detail: "A real network or bank does not ask for that in a message.",
    });
  }
  if (lookalikes[0]) {
    signals.push({
      id: "lookalike",
      label: `Lookalike brand: ${lookalikes[0].token} ≈ ${lookalikes[0].brand.toUpperCase()}`,
      points: 22,
      detail: "The spelling is one or two edits from a known Ghana brand.",
    });
  }
  if (links.some((link) => link.shortener)) {
    signals.push({
      id: "shortener",
      label: "Short link",
      points: 12,
      detail: "The real site is hidden. ScamCheck does not open short links.",
    });
  }
  if (links.some((link) => link.punycode)) {
    signals.push({
      id: "punycode",
      label: "Punycode domain",
      points: 18,
      detail: "The host uses xn-- encoding, which can disguise a brand.",
    });
  }
  const authority = /\b(mtn|momo|telecel|gra|gcb|ecobank|ecg|bank)\b/i.test(text);
  if (authority && links.some((link) => link.host && !link.official && !link.shortener)) {
    signals.push({
      id: "unofficial-link",
      label: "Brand name with a site that is not theirs",
      points: 16,
      detail: "The message names a brand, and the link is not on that brand’s domain.",
    });
  }
  if (links.some((link) => link.official) && !signals.some((signal) => signal.id === "secret")) {
    signals.push({
      id: "official-host",
      label: "Link is on an official domain",
      points: -12,
      detail: "The host matches a known bank, network, or .gov.gh site.",
    });
  }
  const lines = text.split(/\n/).map((line) => line.trim()).filter(Boolean);
  const later = lines.slice(1).join(" ");
  if (lines.length >= 3 && /\b(send|pay|momo|pin|ghs|cedis)\b/i.test(later) && !/\b(current balance|transaction id)\b/i.test(text)) {
    signals.push({
      id: "thread",
      label: "A chat that turns into a payment",
      points: 14,
      detail: "Later lines ask for money or a PIN. Romance and job chats often turn this way.",
    });
  }
  if (/\b(do not|don't|never)\s+(share|give|send)\b[^.]*\b(pin|otp|password)\b/i.test(text)) {
    signals.push({
      id: "safety-line",
      label: "Tells you not to share a PIN",
      points: -10,
      detail: "Real alerts often include this line. It is a signal, not proof.",
    });
  }
  for (const note of reputation) {
    if (note.status === "young") {
      signals.push({ id: `age-${note.host}`, label: `New domain: ${note.host}`, points: 20, detail: note.detail });
    }
    if (note.status === "hit") {
      signals.push({ id: `sb-${note.host}`, label: `Safe Browsing hit: ${note.host}`, points: 40, detail: note.detail });
    }
  }
  return signals;
}

function fold(token: string): string {
  const lower = token.normalize("NFKD").toLowerCase();
  let out = "";
  for (const char of lower) out += CONFUSABLES[char] ?? char;
  return out.replace(/[^a-z]/g, "");
}
