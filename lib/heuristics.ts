import { claimsAuthority, extractEntities, isOfficialHost, suspiciousLinks } from "./entities";
import type { Analysis, ScamPattern, Verdict } from "./types";

interface Signal {
  pattern: ScamPattern;
  points: number;
  detail: string;
}

export function asksForSecret(text: string): boolean {
  const window = text.replace(/\s+/g, " ");
  const request =
    /\b(send|share|tell|give|provide|enter|confirm|reply|type|forward)\b[^.]{0,70}\b(pin|otp|password|verification code|cvv|secret number|ghana card(?: number)?)\b/gi;
  let found = false;
  for (const match of window.matchAll(request)) {
    const prefix = window.slice(Math.max(0, match.index - 48), match.index);
    if (!/\b(do not|don't|never|must not|will never|won't|not|without)\b/i.test(prefix)) {
      found = true;
    }
  }
  const withYour = /\bwith your (pin|otp|password|verification code|cvv)\b/i;
  const withMatch = withYour.exec(window);
  if (withMatch?.index !== undefined) {
    const prefix = window.slice(Math.max(0, withMatch.index - 48), withMatch.index);
    if (!/\b(do not|don't|never|without|not)\b/i.test(prefix)) found = true;
  }
  if (/\b(fa|bre|brɛ|ma)\s+wo\s+(pin|otp|password)\b/i.test(window)) found = true;
  return found;
}

export function isReversalPush(text: string): boolean {
  return /\b(reverse it|reverse the|approve the reversal|send (?:it |the money |them )?back|refund|sent (?:this |it )?by mistake|wrong(?:ly)? (?:transfer|sent|payment))\b/i.test(
    text,
  );
}

export function analyzeMessage(text: string): Analysis {
  const entities = extractEntities(text);
  const authority = claimsAuthority(text);
  const badLinks = suspiciousLinks(entities.links, authority);
  const hasBadLink = badLinks.length > 0;
  const signals: Signal[] = [];

  const add = (pattern: ScamPattern, points: number, detail: string) => {
    signals.push({ pattern, points, detail });
  };

  const secret = asksForSecret(text);
  const reversal = isReversalPush(text) || (/\brevers/i.test(text) && secret);
  const prize =
    /\b(you have won|you've won|you won|winner|anniversary draw|claim your (?:prize|reward|cash)|won GHS|won a)\b/i.test(
      text,
    );
  const blocked =
    /\b(will be blocked|be blocked in|account (?:is|will be) (?:blocked|suspended|closed)|wallet will be blocked|suspend(?:ed)? (?:your|the) (?:account|wallet|sim))\b/i.test(
      text,
    );
  const tax = /\b(gra|ghana revenue authority|tax clearance|tax penalty)\b/i.test(text);
  const job =
    /(registration fee|training fee|uniform fee|embassy fee|processing fee|activation fee|release fee|kit fee|pay\b[^.]{0,50}\b(?:to )?(?:become|start training|get (?:the |this )?job)|hiring[^.]{0,80}(?:fee|pay|momo)|you are hired[^.]{0,120}\b(?:pay|fee)\b)/i.test(
      text,
    );
  const relative =
    /\b(uncle|auntie|mum|mom|mother|dad|father|brother|sister|cousin|grandma|grandmother|grandfather)\b/i.test(
      text,
    );
  const distress =
    /\b(hospital|accident|arrested|stranded|police|doctor|changed my number|new number)\b/i.test(text);
  const receipt =
    /\b(current balance|available balance|transaction id|fee charged|you have (?:received|sent)|credited to|debited from)\b/i.test(
      text,
    );
  const safety =
    /\b(do not share your (?:pin|otp)|will never ask for your (?:pin|otp)|never ask for your (?:pin|otp)|never share your (?:pin|otp))\b/i.test(
      text,
    );

  if (secret) add("pin_harvest", 46, "The message asks for a PIN, OTP, password, or Ghana Card number.");
  if (reversal) add("fake_reversal", 48, "It pushes a MoMo reversal or asks you to send money back.");
  if (prize && (hasBadLink || secret || entities.phones.length > 0 || /\bfee\b/i.test(text))) {
    add("prize_scam", 50, "A prize is tied to a fee, a phone number, a PIN, or a link.");
  } else if (prize) {
    add("prize_scam", 26, "It talks about a prize you did not ask for.");
  }
  if (tax && (hasBadLink || secret || /\b(arrest|pay now)\b/i.test(text))) {
    add("fake_tax", 55, "A tax or GRA message asks for payment, a link, or your Ghana Card.");
  } else if (tax) {
    add("fake_tax", 18, "It mentions tax or GRA without a clear official path.");
  }
  if (job) add("job_fee", 46, "A job, visa, or agent offer asks for a fee up front.");
  const upfrontDeposit =
    /\b(deposit|before delivery|reserved)\b/i.test(text) &&
    entities.phones.length > 0 &&
    entities.amounts.length > 0 &&
    /\b(pay|send|momo)\b/i.test(text);
  if (upfrontDeposit) {
    add("payment_request", 36, "It wants the money before you have the room, the item, or the service.");
  }
  const fastReturn =
    /\b(invest|double your money|guaranteed profit|in one hour)\b/i.test(text) &&
    (entities.amounts.length > 0 || entities.phones.length > 0);
  if (fastReturn) add("prize_scam", 48, "It promises a fast return if you send money first.");
  const billOrFine =
    /\b(power will be cut|electricity company|your meter will|parcel|customs|duty|traffic fine|warrant|ghana police|nhis)\b/i.test(
      text,
    ) && entities.links.some((link) => {
      const host = link.replace(/^https?:\/\//i, "").split("/")[0] ?? "";
      return host.length > 0 && !isOfficialHost(host.replace(/^www\./, ""));
    });
  if (billOrFine) {
    add("fake_official_link", 48, "A bill, a parcel, or a fine points at a site that is not the official one.");
  }
  if (relative && distress && (entities.amounts.length > 0 || entities.phones.length > 0 || /\bsend\b/i.test(text))) {
    let points = 34;
    if (/\b(do not call|changed my number|new number)\b/i.test(text)) points += 16;
    add("relative_impersonation", points, "A relative seems to be in trouble and wants money on a new number.");
  }
  if (blocked && (hasBadLink || secret)) {
    add("account_block", 48, "It threatens to block an account and adds a link or a PIN request.");
  } else if (blocked) {
    add("account_block", 22, "It threatens to block an account.");
  }
  if (hasBadLink && authority) {
    add("fake_official_link", 42, "A named bank, wallet, or agency uses a link that is not its official site.");
  } else if (hasBadLink) {
    add("fake_official_link", 24, "The link is a short link or an unfamiliar site.");
  }
  if (/\bapprove the (?:pending )?(?:request|payment|transaction)\b/i.test(text)) {
    add("payment_request", 22, "It asks you to approve a payment in the app.");
  }
  if (entities.amounts.length > 0 && entities.phones.length > 0 && !receipt && !reversal) {
    add("payment_request", 18, "It asks for money to be sent to a phone number.");
  }
  if (receipt && !secret && !hasBadLink && !reversal && !/\brevers/i.test(text) && !prize) {
    add("official_alert", -52, "It reads like a normal debit or credit alert.");
  }
  if (safety && !hasBadLink && !reversal && !secret) {
    add("official_alert", -18, "It tells you not to share a PIN.");
  }

  const total = signals.reduce((sum, signal) => sum + signal.points, 0);
  const strongest = signals
    .filter((signal) => signal.points > 0)
    .sort((a, b) => b.points - a.points)[0];
  const pattern: ScamPattern =
    strongest?.pattern ??
    (signals.some((signal) => signal.pattern === "official_alert") ? "official_alert" : "unclear");

  let verdict: Verdict;
  let confidence: number;
  if (total >= 40) {
    verdict = "scam";
    confidence = clamp(72 + Math.round(total / 5), 82, 96);
  } else if (total >= 15) {
    verdict = "suspicious";
    confidence = clamp(52 + total, 62, 84);
  } else {
    verdict = "looks_ok";
    confidence = receipt || safety ? 86 : entities.amounts.length > 0 ? 70 : 58;
  }

  return {
    verdict,
    confidence,
    pattern,
    entities,
    signals: signals.map((signal) => signal.detail),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
