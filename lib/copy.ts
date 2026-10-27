import type { Lang, ScamPattern, Verdict } from "./types";

export const patternLabel: Record<Lang, Record<ScamPattern, string>> = {
  en: {
    fake_reversal: "Fake MoMo reversal",
    pin_harvest: "PIN or OTP request",
    prize_scam: "Fake prize",
    fake_tax: "Fake tax demand",
    job_fee: "Job fee scam",
    relative_impersonation: "Family member in trouble",
    fake_official_link: "Fake official link",
    account_block: "Fake account block",
    official_alert: "Normal alert",
    payment_request: "Payment request",
    unclear: "No clear pattern",
  },
  tw: {
    fake_reversal: "MoMo reversal nnaadaa",
    pin_harvest: "Wɔpɛ wo PIN",
    prize_scam: "Akatua nnaadaa",
    fake_tax: "Tow nnaadaa",
    job_fee: "Adwuma ho ka nnaadaa",
    relative_impersonation: "Busuani a ɔrehwehwɛ sika",
    fake_official_link: "Link a ɛnyɛ nokware",
    account_block: "Account block nnaadaa",
    official_alert: "Alert a ɛte sɛ nokware",
    payment_request: "Sika a wɔpɛ",
    unclear: "Yɛnhunu nnaadaa pɔtee",
  },
};

export const headlines: Record<Lang, Record<ScamPattern, string>> = {
  en: {
    fake_reversal: "Do not send the money back.",
    pin_harvest: "Do not share your PIN.",
    prize_scam: "You did not win this prize.",
    fake_tax: "Do not pay this tax link.",
    job_fee: "Do not pay a fee to get this job.",
    relative_impersonation: "Call your family on a number you already know.",
    fake_official_link: "Do not open this link.",
    account_block: "This message cannot block your wallet.",
    official_alert: "This looks like a normal alert.",
    payment_request: "Call the person before you pay.",
    unclear: "We do not see a clear scam.",
  },
  tw: {
    fake_reversal: "Mma wo nnsan sika no.",
    pin_harvest: "Mma wo mfa wo PIN mma obiara.",
    prize_scam: "Wonnim saa akatua yi.",
    fake_tax: "Mma wo ntua saa tow link yi.",
    job_fee: "Mma wo ntua ka bi ansa na woanya adwuma.",
    relative_impersonation: "Frɛ wo busuani wɔ nɔma a wonim dada.",
    fake_official_link: "Mma wo mmue link yi.",
    account_block: "Saa nkrasɛm yi ntumi nsi wo wallet ano.",
    official_alert: "Ɛte sɛ alert ankasa.",
    payment_request: "Frɛ onipa no ansa na woatua.",
    unclear: "Yɛnhunu nnaadaa pɔtee wɔ mu.",
  },
};

export const reasons: Record<Lang, Record<ScamPattern, string[]>> = {
  en: {
    fake_reversal: [
      "This is a common MoMo trick in Ghana.",
      "They want you to reverse money or share a PIN.",
      "The first payment can come back out later. You can lose twice.",
    ],
    pin_harvest: [
      "The sender wants a PIN, OTP, password, or Ghana Card number.",
      "MTN, Telecel, your bank, and GRA will not ask for that in a message.",
      "If you share it, they can empty the wallet.",
    ],
    prize_scam: [
      "A real prize does not ask you to pay a fee first.",
      "The link or number is not an official MTN or Telecel page.",
      "Do not claim it, even if the logo looks right.",
    ],
    fake_tax: [
      "GRA does not collect tax on a strange link in SMS or WhatsApp.",
      "Threats of arrest are there to scare you into paying fast.",
      "Check tax only on gra.gov.gh or ghana.gov.gh, or at a GRA office.",
    ],
    job_fee: [
      "A real employer does not ask you to MoMo a registration fee.",
      "The job may not exist.",
      "Stop if they rush you.",
    ],
    relative_impersonation: [
      "The sender says they are family and need money now.",
      "They may say the number is new, or tell you not to call the house.",
      "Call or see the person on a number you saved before.",
    ],
    fake_official_link: [
      "The name says a bank, MoMo, or a government office.",
      "The link is not their real website.",
      "Logos and colours are easy to copy.",
    ],
    account_block: [
      "Fear is the trick. They say the account will close soon.",
      "Do not tap the link or send a code.",
      "Open the official app yourself, or call the provider.",
    ],
    official_alert: [
      "This reads like a normal money alert.",
      "It does not ask you to send a PIN or open a strange link.",
      "If you did not make the payment, call the provider on a number you trust.",
    ],
    payment_request: [
      "Someone is asking you to send money or approve a payment.",
      "It may be real, such as food or a bill. It may also be a trick.",
      "Confirm on a call to a saved number before you pay.",
    ],
    unclear: [
      "We do not see a prize, a reversal, a PIN request, or a fake link.",
      "That does not mean every message is safe.",
      "If it asks for money later, check again.",
    ],
  },
  tw: {
    fake_reversal: [
      "Saa nnaadaa yi taa ba wɔ MoMo so wɔ Ghana.",
      "Wɔpɛ sɛ wosan sika no anaa wo PIN.",
      "Sika a edi kan no betumi asan akɔ. Wubetumi ahwere sika no mmɔho abien.",
    ],
    pin_harvest: [
      "Ɔpɛ wo PIN, OTP, password, anaa Ghana Card nɔma.",
      "MTN, Telecel, wo bank, ne GRA remmisa saa nneɛma yi wɔ nkrasɛm mu.",
      "Sɛ woma wɔn a, wɔbetumi agye wo wallet mu sika nyinaa.",
    ],
    prize_scam: [
      "Akatua ankasa remmisa ka ansa na woanya.",
      "Link no anaa nɔma no nyɛ MTN anaa Telecel kratafa ankasa.",
      "Mma wo nnye, sɛ logo no te sɛ nokware mpo a.",
    ],
    fake_tax: [
      "GRA mfa link a wonnim no nntow tow wɔ SMS anaa WhatsApp so.",
      "Wɔde ahintasɛm bɔ wo hu sɛ wobɛtua ntɛm.",
      "Hwɛ tow wɔ gra.gov.gh anaa ghana.gov.gh, anaa GRA office.",
    ],
    job_fee: [
      "Adwumawura ankasa remmisa MoMo ka ansa na woayɛ adwuma.",
      "Adwuma no betumi nyɛ hɔ.",
      "Sɛ wɔhyɛ wo a, gyae.",
    ],
    relative_impersonation: [
      "Obi se ɔyɛ wo busuani na ɔpɛ sika seesei.",
      "Wɔbetumi aka sɛ nɔma no yɛ foforo, anaa sɛ mma wo nfrɛ fie.",
      "Frɛ onipa no wɔ nɔma a wosiee no dada.",
    ],
    fake_official_link: [
      "Edin no se bank, MoMo, anaa aban adwumayɛbea.",
      "Link no nyɛ wɔn website ankasa.",
      "Logo ne kɔla yɛ mmerɛw sɛ wɔbɛfa.",
    ],
    account_block: [
      "Wɔde hu na ɛyɛ adwuma. Wɔse account no bɛto mu ntɛm.",
      "Mma wo mmue link no, na mma wo mfa code bi nso.",
      "Bue app ankasa no, anaa frɛ wɔn a wɔhwɛ no.",
    ],
    official_alert: [
      "Ɛkenkan te sɛ sika alert ankasa.",
      "Ɛmmisa PIN, na ɛmma link a wonnim.",
      "Sɛ woantua saa ka yi a, frɛ wɔn a wɔhwɛ no wɔ nɔma a wogye di.",
    ],
    payment_request: [
      "Obi pɛ sɛ wode sika kɔma no, anaa wogye payment to mu.",
      "Ebetumi ayɛ nokware, te sɛ aduane anaa ka. Ebetumi nso ayɛ nnaadaa.",
      "Frɛ nɔma a wosiee no ansa na woatua.",
    ],
    unclear: [
      "Yɛnhunu akatua, reversal, PIN, anaa link bɔne.",
      "Ɛno nkyerɛ sɛ nkrasɛm biara yɛ nokware.",
      "Sɛ ɛpɛ sika akyiri yi a, san hwɛ bio.",
    ],
  },
};

export function confidenceWords(confidence: number, lang: Lang): string {
  if (lang === "tw") {
    if (confidence >= 90) return "Yɛgye di yie";
    if (confidence >= 75) return "Yɛgye di";
    if (confidence >= 60) return "Yɛgye di kakra";
    return "Yɛnnye nni";
  }
  if (confidence >= 90) return "Very sure";
  if (confidence >= 75) return "Sure";
  if (confidence >= 60) return "Fairly sure";
  return "Not sure";
}

/** Verdict panel only. "Safe" stays the band name everywhere else. */
export function verdictPanelWord(verdict: Verdict, lang: Lang): string {
  if (lang === "en" && verdict === "looks_ok") return "Looks safe";
  return verdictWord(verdict, lang);
}

export function verdictWord(verdict: Verdict, lang: Lang): string {
  const words: Record<Lang, Record<Verdict, string>> = {
    en: { scam: "Scam", suspicious: "Caution", looks_ok: "Safe", unsure: "Can't tell" },
    tw: { scam: "Ɛyɛ nnaadaa", suspicious: "Hwɛ yie", looks_ok: "Ɛte sɛ ɛyɛ", unsure: "Yɛnnye nni" },
  };
  return words[lang][verdict];
}

/** Safe, Caution, Scam, or Can't tell. Internal verdict names stay stable. */
export function bandOf(verdict: Verdict): "scam" | "caution" | "safe" | "cant_tell" {
  if (verdict === "scam") return "scam";
  if (verdict === "suspicious") return "caution";
  if (verdict === "looks_ok") return "safe";
  return "cant_tell";
}

export function safeHeadline(verdict: Verdict, pattern: ScamPattern, lang: Lang): string {
  if (verdict === "unsure") {
    return lang === "tw"
      ? "Yɛnnye nni. Fa no sɛ ɛyɛ hu, na frɛ wo network wɔ 100."
      : "We're not sure. Treat it as suspicious, and call your network on 100 before you send anything.";
  }
  if (verdict === "looks_ok" && pattern !== "official_alert" && pattern !== "unclear") {
    return lang === "tw" ? "Ɛte sɛ ɛyɛ. Hwɛ bio sɛ wohnu sika a." : "This looks OK. Check again if money comes up.";
  }
  if (verdict === "suspicious" && (pattern === "unclear" || pattern === "official_alert")) {
    return lang === "tw" ? "Hwɛ yie ansa na woatua." : "Be careful before you pay.";
  }
  return headlines[lang][pattern];
}
