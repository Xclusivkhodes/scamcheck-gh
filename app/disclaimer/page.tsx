import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/shell";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "ScamCheck GH is advice, not a guarantee. Confirm with your network before you send money.",
};

export default function DisclaimerPage() {
  return (
    <Shell>
      <article className="prose">
        <p className="t-overline t-muted">Disclaimer</p>
        <h1 className="t-h1">Advice, not a guarantee</h1>
        <p>
          ScamCheck GH can be wrong. A Safe answer is not a promise that a message is safe, and it is not permission to send money. {"Can't tell"} means the check did not have enough to warn or to clear it. If you are unsure, call your network on 100 before you do anything.
        </p>
        <h2 className="t-h2">Numbers we show</h2>
        <ul>
          <li>MTN report fraud: dial *170#, then 6 (My Wallet), then 4. Email mmfraudteam.GH@mtn.com.</li>
          <li>MTN customer care: 100.</li>
          <li>Cyber Security Authority: call or text 292. WhatsApp 0501603111. Email report@csa.gov.gh.</li>
          <li>Ghana Police: 191 or 18555 (toll-free).</li>
        </ul>
        <p>
          AT Money is shown as a placeholder because we do not have a verified number. Telecel numbers are left out until they are confirmed on telecel.com.gh. Do not call a number that appears inside the suspicious message.
        </p>
        <h2 className="t-h2">No affiliation</h2>
        <p>
          ScamCheck GH is not MTN, Telecel, AT, the Bank of Ghana, the Cyber Security Authority, or the Ghana Police. NVIDIA, Nemotron, and Tavily are names of the tools used to read and search. We do not use their logos.
        </p>
        <p>
          If you already sent money, call your network first, then 292 or the police. This app cannot reverse a payment.
        </p>
        <p>
          <Link className="btn btn-primary btn-md" href="/">
            Check a message
          </Link>
        </p>
      </article>
    </Shell>
  );
}
