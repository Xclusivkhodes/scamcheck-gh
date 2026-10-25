import { verdictWord } from "./copy";
import type { Lang, Verdict } from "./types";

export interface CardPayload {
  verdict: Verdict;
  headline: string;
  pattern: string;
  lang?: Lang;
}

export function cardQuery(payload: CardPayload): string {
  const params = new URLSearchParams({
    verdict: payload.verdict,
    headline: payload.headline.slice(0, 180),
    pattern: payload.pattern.slice(0, 80),
    lang: payload.lang ?? "en",
  });
  return `/family/card?${params.toString()}`;
}

export function cardSvg(payload: CardPayload): string {
  const lang = payload.lang ?? "en";
  const word = escapeXml(verdictWord(payload.verdict, lang));
  const headline = escapeXml(payload.headline.slice(0, 140));
  const pattern = escapeXml(payload.pattern.slice(0, 60));
  const band = payload.verdict === "scam" ? "#B8301B" : payload.verdict === "looks_ok" ? "#167D4A" : payload.verdict === "unsure" ? "#52525B" : "#A85605";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <rect width="1080" height="1350" fill="#FAFAFA"/>
  <rect width="1080" height="12" fill="#F0AE2E"/>
  <text x="72" y="140" fill="#18181B" font-family="Arial, sans-serif" font-size="36" font-weight="700">ScamCheck GH</text>
  <text x="72" y="190" fill="#52525B" font-family="Arial, sans-serif" font-size="28">Check for family · the full message is not on this card</text>
  <rect x="72" y="250" width="936" height="620" rx="28" fill="#FFFFFF" stroke="${band}" stroke-width="6"/>
  <text x="120" y="360" fill="${band}" font-family="Arial, sans-serif" font-size="92" font-weight="700">${word}</text>
  <text x="120" y="450" fill="#18181B" font-family="Arial, sans-serif" font-size="40">${headline}</text>
  <text x="120" y="540" fill="#52525B" font-family="Arial, sans-serif" font-size="32">${pattern}</text>
  <text x="120" y="680" fill="#18181B" font-family="Arial, sans-serif" font-size="36" font-weight="700">Do not send money or share a PIN.</text>
  <text x="120" y="760" fill="#18181B" font-family="Arial, sans-serif" font-size="32">Call CSA on 292 · MTN balance *170#</text>
  <text x="72" y="1000" fill="#52525B" font-family="Arial, sans-serif" font-size="28">Twi text, if any, is a beta translation and has not been checked by a native speaker.</text>
  <text x="72" y="1220" fill="#71717A" font-family="Arial, sans-serif" font-size="26">Advice, not a guarantee. Not from MTN or the Cyber Security Authority.</text>
</svg>`;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
