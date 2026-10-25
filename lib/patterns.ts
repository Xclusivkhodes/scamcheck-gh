import type { PatternMatch, ScamPattern } from "./types";

export interface PatternCard extends PatternMatch {
  text: string;
}

/** Curated from MTN MoMo’s 2024 typology notes and CSA’s mobile-money guidance. Not a live feed. */
export const PATTERN_LIBRARY: PatternCard[] = [
  { id: "mtn-wrong-transfer", pattern: "fake_reversal", title: "Fake wrong transfer", source: "MTN MoMo", year: 2024, text: "you have received ghs kindly reverse the money sent by mistake call the agent and approve with your pin" },
  { id: "mtn-staff-pin", pattern: "pin_harvest", title: "Fake MTN staff asking for a PIN", source: "MTN MoMo", year: 2024, text: "this is mtn staff we need your momo pin to reverse a wrong transfer do not tell anyone" },
  { id: "mtn-promo", pattern: "prize_scam", title: "MoMo promo prize", source: "MTN MoMo", year: 2024, text: "congratulations you have won a promo draw pay a small activation fee to claim your prize" },
  { id: "loan-ghana-card", pattern: "pin_harvest", title: "Fake loan asking for a Ghana Card", source: "MTN MoMo", year: 2024, text: "instant loan approved send your ghana card number and momo pin to receive the money" },
  { id: "fake-vendor", pattern: "payment_request", title: "Fake online vendor", source: "MTN MoMo", year: 2024, text: "pay the full amount to my momo before delivery the item is reserved for you today" },
  { id: "ecash", pattern: "payment_request", title: "E-cash liquidation", source: "MTN MoMo", year: 2024, text: "i will send e-cash you must liquidate it and send the cash back to my number" },
  { id: "whatsapp-takeover", pattern: "relative_impersonation", title: "WhatsApp account takeover", source: "MTN MoMo", year: 2024, text: "hi i am using my friend's phone send momo now i will explain later do not call" },
  { id: "csa-pin", pattern: "pin_harvest", title: "Nobody official asks for a PIN", source: "CSA", year: 2024, text: "agents and telco staff never ask for your pin wait for the confirmation sms from the network" },
  { id: "gra-tax", pattern: "fake_tax", title: "Fake GRA tax link", source: "CSA", year: 2025, text: "ghana revenue authority penalty pay now or face arrest open the tax clearance link and send your ghana card" },
  { id: "relative-hospital", pattern: "relative_impersonation", title: "Relative in hospital", source: "BoG fraud notes", year: 2025, text: "uncle changed number mother is in hospital doctor wants money before treatment do not call the house" },
  { id: "job-fee", pattern: "job_fee", title: "Job that wants a fee first", source: "CSA", year: 2025, text: "you are hired pay the registration fee or uniform fee to this momo number before you start" },
  { id: "account-block", pattern: "account_block", title: "Wallet will be blocked", source: "CSA", year: 2025, text: "your momo wallet will be blocked in one hour unless you verify your pin on this link" },
  { id: "gcb-lookalike", pattern: "fake_official_link", title: "Bank lookalike link", source: "CSA", year: 2025, text: "gcb internet banking expired click the link and enter your password and otp" },
  { id: "real-credit", pattern: "official_alert", title: "Normal credit alert", source: "MTN MoMo", year: 2024, text: "payment received current balance available balance transaction id fee ghs reference no pin request" },
  { id: "real-debit", pattern: "official_alert", title: "Normal debit alert", source: "MTN MoMo", year: 2024, text: "payment made for current balance transaction id fee you did not share a pin" },
  { id: "dstv-approval", pattern: "payment_request", title: "Approve a pending merchant", source: "MTN help", year: 2025, text: "approve the pending request in your momo app merchant amount" },
  { id: "ecg-bill", pattern: "fake_official_link", title: "Fake ECG bill link", source: "CSA", year: 2025, text: "electricity company of ghana your power will be cut pay the bill on this link today" },
  { id: "romance-turn", pattern: "relative_impersonation", title: "Chat that turns into a payment", source: "CSA", year: 2025, text: "i need help with a parcel stuck at customs send momo so they release it i will pay you back" },
  { id: "agent-float", pattern: "fake_reversal", title: "Agent float reversal", source: "MTN MoMo", year: 2024, text: "momo agent float was sent to you by mistake reverse it now or the agent will report you" },
  { id: "otp-staff", pattern: "pin_harvest", title: "Staff asking for an OTP", source: "CSA", year: 2024, text: "telecel staff need the otp that just arrived to complete your sim swap do not share it with anyone else" },
  { id: "sim-swap", pattern: "account_block", title: "SIM swap threat", source: "CSA", year: 2025, text: "your sim will be blocked unless you confirm the otp we sent and your momo pin" },
  { id: "scholarship", pattern: "prize_scam", title: "Fake scholarship fee", source: "CSA", year: 2025, text: "you have won a scholarship pay the processing fee to this momo number before the deadline" },
  { id: "church-seed", pattern: "payment_request", title: "Pressure to seed money", source: "CSA", year: 2025, text: "pastor says sow a seed of ghs into this momo tonight and you will receive a breakthrough" },
  { id: "rent-deposit", pattern: "payment_request", title: "Fake landlord deposit", source: "CSA", year: 2025, text: "the room is still available pay the deposit to my momo now before another tenant takes it" },
  { id: "visa-fee", pattern: "job_fee", title: "Visa or travel fee", source: "CSA", year: 2025, text: "your visa interview is booked pay the embassy fee to this momo line or the appointment is cancelled" },
  { id: "customs-parcel", pattern: "fake_official_link", title: "Fake customs parcel", source: "CSA", year: 2025, text: "ghana post customs your parcel is held pay the duty on this link today or it returns to the sender" },
  { id: "ecg-cut", pattern: "fake_official_link", title: "Power cut threat", source: "CSA", year: 2025, text: "ecg your meter will be disconnected pay the arrears at the link in this sms before 6pm" },
  { id: "nhis-renew", pattern: "fake_official_link", title: "Fake NHIS renewal", source: "CSA", year: 2025, text: "nhis card expired renew now on this website and enter your ghana card to avoid hospital refusal" },
  { id: "ssnit-benefit", pattern: "fake_official_link", title: "Fake SSNIT benefit", source: "CSA", year: 2025, text: "ssnit a benefit is waiting pay a small release fee and send your ghana card photo" },
  { id: "bank-otp", pattern: "pin_harvest", title: "Bank OTP harvest", source: "BoG fraud notes", year: 2025, text: "gcb alert a transfer is pending reply with the otp and your password to stop it" },
  { id: "investment-double", pattern: "prize_scam", title: "Double your money", source: "BoG fraud notes", year: 2025, text: "invest ghs 200 on momo and receive ghs 2000 in one hour guaranteed profit send to the agent" },
  { id: "relative-bail", pattern: "relative_impersonation", title: "Relative needs bail", source: "CSA", year: 2025, text: "this is your brother i am at the police station send momo for bail do not call mum" },
  { id: "aunty-stuck", pattern: "relative_impersonation", title: "Auntie stranded", source: "CSA", year: 2025, text: "auntie new number i am stranded at the station please momo me transport i will pay you back tonight" },
  { id: "whatsapp-code", pattern: "pin_harvest", title: "WhatsApp verification code", source: "CSA", year: 2024, text: "send me the six digit whatsapp code that just arrived i am setting up the phone" },
  { id: "merchant-refund", pattern: "fake_reversal", title: "Merchant refund trick", source: "MTN MoMo", year: 2024, text: "a merchant payment failed kindly refund the customer by sending the amount back to this number" },
  { id: "gold-agent", pattern: "job_fee", title: "Gold or agent registration", source: "CSA", year: 2025, text: "become a momo agent pay the registration kit fee first and training starts on monday" },
  { id: "airtime-bonus", pattern: "prize_scam", title: "Airtime bonus claim", source: "MTN MoMo", year: 2024, text: "claim your airtime bonus worth ghs 100 pay the activation on the short link before it expires" },
  { id: "dstv-realish", pattern: "payment_request", title: "Approve a DStv debit", source: "MTN help", year: 2025, text: "approve the pending dstv request only inside the momo app do not send a pin by sms" },
  { id: "balance-only", pattern: "official_alert", title: "Balance message", source: "MTN MoMo", year: 2024, text: "your available balance is shown with a transaction id and a fee this is a normal alert" },
  { id: "school-fees-receipt", pattern: "official_alert", title: "School fees receipt", source: "MTN MoMo", year: 2024, text: "school fees payment received current balance transaction id no one asked for a pin" },
  { id: "wrong-name-mtn", pattern: "fake_official_link", title: "Misspelt MTN link", source: "MTN MoMo", year: 2024, text: "mttn momo security update open the link and enter your pin to keep the account" },
  { id: "loan-app", pattern: "pin_harvest", title: "Instant loan app", source: "BoG fraud notes", year: 2025, text: "loan approved in ten minutes send ghana card and momo pin to disburse into your wallet" },
  { id: "qr-vendor", pattern: "payment_request", title: "Pay before you see the goods", source: "CSA", year: 2025, text: "pay full ghs to my momo then i send the shoes no meet up the price goes up tomorrow" },
  { id: "funeral-levy", pattern: "relative_impersonation", title: "Fake funeral levy", source: "CSA", year: 2025, text: "family whatsapp group funeral levy send momo today or your name comes off the list" },
  { id: "police-fine", pattern: "fake_tax", title: "Fake police fine", source: "Ghana Police notes", year: 2025, text: "ghana police a traffic fine is unpaid pay on this link today or a warrant is issued" },
  { id: "bog-notice", pattern: "fake_official_link", title: "Fake Bank of Ghana notice", source: "BoG fraud notes", year: 2025, text: "bank of ghana your account is under review click here and confirm your password and otp" },
];

const STOP = new Set(["the", "and", "for", "you", "your", "this", "that", "with", "from", "have", "will", "your"]);

export function matchPattern(text: string): PatternMatch | null {
  const query = tokens(text);
  if (query.length < 4) return null;
  let best: { card: PatternCard; score: number } | null = null;
  const docs = PATTERN_LIBRARY.map((card) => tokens(card.text));
  const avg = docs.reduce((sum, doc) => sum + doc.length, 0) / docs.length;
  for (let index = 0; index < PATTERN_LIBRARY.length; index += 1) {
    const score = bm25(query, docs[index], docs, avg);
    if (!best || score > best.score) best = { card: PATTERN_LIBRARY[index], score };
  }
  if (!best || best.score < 1.2) return null;
  const { id, title, source, year, pattern } = best.card;
  return { id, title, source, year, pattern };
}

function bm25(query: string[], doc: string[], docs: string[][], avg: number): number {
  const k = 1.2;
  const b = 0.75;
  let score = 0;
  for (const term of new Set(query)) {
    const tf = doc.filter((token) => token === term).length;
    if (tf === 0) continue;
    const df = docs.filter((other) => other.includes(term)).length;
    const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5));
    score += idf * ((tf * (k + 1)) / (tf + k * (1 - b + (b * doc.length) / avg)));
  }
  return score;
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP.has(token));
}

export function patternId(pattern: ScamPattern): string {
  return pattern;
}
