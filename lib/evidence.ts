import { CHANNELS } from "./channels";
import type { EvidenceItem, ScamPattern } from "./types";

const MTN: EvidenceItem = {
  title: "How do I report Mobile Money (MoMo) fraud?",
  url: CHANNELS.mtnHelpUrl,
  snippet:
    "MTN Ghana’s help centre: dial *170#, choose 6 My Wallet, then 4 to report fraud. You can also email mmfraudteam.GH@mtn.com.",
  source: "MTN Ghana",
  origin: "sample",
};

const CSA: EvidenceItem = {
  title: "Report a cyber incident",
  url: CHANNELS.certUrl,
  snippet:
    "CERT-GH takes reports by call or SMS on 292, WhatsApp 0501603111, and report@csa.gov.gh.",
  source: "Cyber Security Authority",
  origin: "sample",
};

const BOG: EvidenceItem = {
  title: "Digital fraud and the cost of ignorance",
  url: CHANNELS.bogNoticeUrl,
  snippet:
    "Bank of Ghana says no real bank or mobile money operator will ask for your PIN, password, or OTP. The complaints office is 0593974486 or complaints.office@bog.gov.gh.",
  source: "Bank of Ghana",
  origin: "sample",
};

export function sampleEvidence(pattern: ScamPattern): EvidenceItem[] {
  switch (pattern) {
    case "fake_reversal":
    case "pin_harvest":
    case "prize_scam":
    case "account_block":
      return [MTN, CSA];
    case "fake_tax":
    case "job_fee":
      return [BOG, CSA];
    case "fake_official_link":
      return [BOG, CSA];
    case "relative_impersonation":
      return [CSA, MTN];
    case "official_alert":
    case "payment_request":
    case "unclear":
      return [BOG, MTN];
    default:
      return [CSA, BOG];
  }
}

export function evidenceNote(origin: "sample" | "tavily" | "none", lang: "en" | "tw"): string {
  if (origin === "tavily") {
    return lang === "tw"
      ? "Tavily hwehwɛɛ nkratafa a ɛwɔ internet so. Kenkan link no bio ansa na wogye adi."
      : "Tavily searched the public web. Open the page yourself before you rely on it.";
  }
  if (origin === "sample") {
    return lang === "tw"
      ? "Demo mode. Tavily anyɛ hwehwɛ. Yɛde kratafa a yɛnim a efi MTN, Bank of Ghana, ne CSA na ɛkyerɛ."
      : "Demo mode. Tavily did not run. These are saved official pages from MTN, the Bank of Ghana, and the Cyber Security Authority.";
  }
  return lang === "tw"
    ? "Yɛannya nkratafa biara a ɛfa saa nkrasɛm yi ho."
    : "No public page was attached to this check. Use the steps below.";
}
