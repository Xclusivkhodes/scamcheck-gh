import type { ActionItem, Entities, Lang, Verdict } from "./types";

/**
 * Human-checked on 25 Oct 2026. See BRAND.md section 8.
 * The model never supplies these numbers. AT Money has no verified number.
 * Telecel figures were not confirmed on telecel.com.gh, so they are not dialled.
 */
export const OFFICIAL_CONTACTS = {
  mtnUssd: "*170#",
  mtnUssdHref: "tel:*170%23",
  mtnReport: "*170# › 6 › 4",
  mtnReportDetail: "My Wallet › Report fraud",
  mtnFraudEmail: "mmfraudteam.GH@mtn.com",
  mtnCare: "100",
  mtnCareHref: "tel:100",
  csa: "292",
  csaHref: "tel:292",
  csaWhatsapp: "0501603111",
  csaEmail: "report@csa.gov.gh",
  police: "191",
  policeHref: "tel:191",
  policeTollFree: "18555",
  policeTollFreeHref: "tel:18555",
  mtnHelpUrl: "https://help-center.mtn.com.gh/hc/en-us/articles/10592692795026",
  csaUrl: "https://www.csa.gov.gh/report",
  policeUrl: "https://police.gov.gh/en/index.php/cyber-crime/",
} as const;

export type Network = "mtn" | "telecel" | "at" | "unknown";

export function detectNetwork(entities: Entities, text: string): Network {
  const blob = `${entities.organisations.join(" ")} ${text}`.toLowerCase();
  const at = /\bat money\b|\bairteltigo\b|\bairtel tigo\b|\btigo cash\b/.test(blob);
  const telecel = /\btelecel\b|\bvodafone\b/.test(blob);
  const mtn = /\bmtn\b|\bmomo\b|\bmobile money\b/.test(blob);
  if (at && !mtn && !telecel) return "at";
  if (telecel && !mtn) return "telecel";
  if (mtn) return "mtn";
  if (at) return "at";
  if (telecel) return "telecel";
  return "unknown";
}

function dial(
  group: number,
  title: string,
  label: string,
  sub: string,
  href: string,
): ActionItem {
  return { group, kind: "dial", title, detail: sub, dial: label, sub, href };
}

function placeholder(group: number, title: string, label: string, sub: string): ActionItem {
  return {
    group,
    kind: "placeholder",
    title,
    detail: sub,
    dial: label,
    sub,
    placeholder: true,
  };
}

export function buildActions(
  verdict: Verdict,
  _pattern: string,
  entities: Entities,
  lang: Lang,
  text = "",
): ActionItem[] {
  const tw = lang === "tw";
  const network = detectNetwork(entities, text);
  const risky = verdict !== "looks_ok";
  const steps: ActionItem[] = [];

  if (risky) {
    steps.push({
      group: 1,
      kind: "stop",
      title: tw ? "Mma wo ntua sika. Mma wo mfa wo PIN." : "Don’t send money. Don’t share your PIN.",
      detail: tw
        ? "Sɛ obi amane hɔ amane a, wɔn network na ɛsan sika no. Ɛnyɛ wo."
        : "If someone really sent money by mistake, their network reverses it. Not you.",
    });
  } else {
    steps.push({
      group: 1,
      kind: "note",
      title: tw ? "Mma wo mfa wo PIN mma obiara" : "Still do not share your PIN",
      detail: tw
        ? "MoMo adwumayɛfo ankasa remmisa wo PIN."
        : "A real MoMo or bank worker will not ask for your PIN, OTP, or password.",
    });
  }

  if (network === "mtn" || (network === "unknown" && risky)) {
    steps.push(
      dial(
        2,
        tw ? "Hwɛ wo sika ankasa" : "Check your real balance",
        tw ? "Dial *170#" : "Dial *170#",
        network === "unknown"
          ? tw
            ? "MTN MoMo menu. Sɛ ɛnyɛ MTN a, mma wo nni nɔma a ɛwɔ nkrasɛm no mu so nka."
            : "MTN MoMo menu. If this is not MTN, do not call a number from the message."
          : tw
            ? "MTN MoMo menu. Sika no wɔ hɔ ankasa?"
            : "MTN MoMo menu. Is the money really there?",
        OFFICIAL_CONTACTS.mtnUssdHref,
      ),
    );
  }

  const report: ActionItem[] = [];
  if (network === "mtn" || network === "unknown") {
    report.push(
      dial(
        3,
        tw ? "Bɔ amanneɛ" : "Report it",
        `MTN: ${OFFICIAL_CONTACTS.mtnReport}`,
        `${OFFICIAL_CONTACTS.mtnReportDetail} · ${OFFICIAL_CONTACTS.mtnFraudEmail}`,
        OFFICIAL_CONTACTS.mtnUssdHref,
      ),
      dial(
        3,
        tw ? "Bɔ amanneɛ" : "Report it",
        tw ? "MTN care 100" : "MTN care 100",
        tw ? "Customer care" : "Customer care",
        OFFICIAL_CONTACTS.mtnCareHref,
      ),
    );
  }
  if (network === "telecel") {
    report.push(
      placeholder(
        3,
        tw ? "Bɔ amanneɛ" : "Report it",
        "Telecel Cash",
        tw
          ? "Yɛnnhyɛɛ Telecel nɔma no da. Hwɛ telecel.com.gh. Mma wo nni nɔma a ɛwɔ nkrasɛm no mu so nka."
          : "Not confirmed for this app. Check telecel.com.gh. Do not use a number from the message.",
      ),
    );
  }
  if (network === "at") {
    report.push(
      placeholder(
        3,
        tw ? "Bɔ amanneɛ" : "Report it",
        "AT Money",
        tw
          ? "Yɛnnhyɛɛ AT Money nɔma biara da. Mma wo nni nɔma a ɛwɔ nkrasɛm no mu so nka."
          : "No verified AT Money number yet. Do not use a number from the message.",
      ),
    );
  }
  report.push(
    dial(
      3,
      tw ? "Bɔ amanneɛ" : "Report it",
      tw ? "Frɛ 292" : "Call 292",
      tw ? "Cyber Security Authority, ɔsram mu nyinaa" : "Cyber Security Authority, 24 hours",
      OFFICIAL_CONTACTS.csaHref,
    ),
    dial(
      3,
      tw ? "Bɔ amanneɛ" : "Report it",
      tw ? "SMS 292" : "Text 292",
      tw ? "Bue wo SMS app" : "Opens your SMS app with a short report",
      `sms:292?body=${encodeURIComponent("I want to report a mobile money scam I checked on ScamCheck GH.")}`,
    ),
    dial(
      3,
      tw ? "Bɔ amanneɛ" : "Report it",
      "Email CSA",
      OFFICIAL_CONTACTS.csaEmail,
      `mailto:${OFFICIAL_CONTACTS.csaEmail}?subject=${encodeURIComponent("MoMo scam report")}`,
    ),
  );
  if (risky) {
    report.push(
      dial(
        3,
        tw ? "Bɔ amanneɛ" : "Report it",
        "Police 191",
        tw ? "Anaa 18555, toll-free. CID Cyber Crime." : "Or 18555, toll-free. CID Cyber Crime.",
        OFFICIAL_CONTACTS.policeHref,
      ),
      dial(
        3,
        tw ? "Bɔ amanneɛ" : "Report it",
        "Police 18555",
        tw ? "Toll-free" : "Toll-free",
        OFFICIAL_CONTACTS.policeTollFreeHref,
      ),
    );
  }
  steps.push(...report);

  if (risky) {
    steps.push({
      group: 4,
      kind: "share",
      title: tw ? "Bɔ wo fie kɔkɔ" : "Warn your family",
      detail: tw ? "Fa kɔkɔbɔ no kɔ WhatsApp." : "Share a warning on WhatsApp. Do not forward the message itself.",
    });
  }

  return steps;
}
