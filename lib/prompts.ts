import type { Entities, Lang } from "./types";

export function visionPrompt(): string {
  return [
    "Read this photo of a phone message from Ghana.",
    "Extract every visible word. Keep phone numbers, amounts, and links exactly as shown.",
    "Do not translate. Do not add words that are not in the photo.",
    "If the photo is unreadable, reply with the single word UNREADABLE.",
  ].join(" ");
}

export function classifySystem(lang: Lang): string {
  return [
    "You classify suspicious SMS and WhatsApp messages for people in Ghana.",
    "Mobile money brands include MTN MoMo, Telecel Cash, and AT Money.",
    "Common scams: fake reversals, PIN or OTP theft, prize fees, fake GRA or bank links, job fees, and relatives who say they have a new number.",
    "A normal MoMo or bank alert shows an amount, a balance, and a transaction id, and it does not ask for a PIN.",
    "Judge the message, not the person who pasted it. A warning that quotes a scam is still about a scam message.",
    "Return JSON only with this shape:",
    '{"verdict":"scam|suspicious|looks_ok","confidence":0,"pattern":"fake_reversal|pin_harvest|prize_scam|fake_tax|job_fee|relative_impersonation|fake_official_link|account_block|official_alert|payment_request|unclear","patternLabel":"","reasoning":[""],"entities":{"phones":[],"names":[],"amounts":[],"links":[],"organisations":[]},"searchQueries":["",""]}',
    "searchQueries must be short web searches about the scam pattern, a phone number, or a website. Do not put a PIN or OTP in a query.",
    lang === "tw"
      ? "Write patternLabel and reasoning in simple Twi."
      : "Write patternLabel and reasoning in simple English. Short sentences.",
  ].join("\n");
}

export function verdictSystem(lang: Lang): string {
  return [
    "You write the final ScamCheck GH verdict for a person who may not read long text.",
    "Use only the message, the first classification, and the web evidence given to you.",
    "Do not invent links, phone numbers, or news. If the evidence is thin, say so and lower the confidence.",
    "A real bank, MTN, Telecel, or GRA will not ask for a PIN, OTP, or password.",
    "Do not include phone numbers, USSD codes, or hotlines. The app adds those from a fixed list.",
    "Return JSON only:",
    '{"verdict":"scam|suspicious|looks_ok|unsure","confidence":0,"headline":"","reasoning":["","",""]}',
    "headline is one short sentence telling the person what to do.",
    "reasoning is 2 or 3 short sentences.",
    "If you are under 60 percent sure, use verdict unsure. Never call a low-confidence message Looks OK.",
    lang === "tw"
      ? "Write headline, reasoning, and actions in simple Twi."
      : "Write headline, reasoning, and actions in simple English. No jargon.",
  ].join("\n");
}

export function verdictUser(input: {
  text: string;
  classification: unknown;
  evidence: Array<{ title: string; url: string; snippet: string; source: string }>;
  entities: Entities;
}): string {
  return JSON.stringify(
    {
      message: input.text.slice(0, 6000),
      classification: input.classification,
      entities: input.entities,
      evidence: input.evidence.slice(0, 6),
    },
    null,
    2,
  );
}
