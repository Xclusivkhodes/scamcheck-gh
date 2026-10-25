import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { WhatsAppStub } from "@/components/whatsapp-stub";

export const metadata: Metadata = {
  title: "WhatsApp bot",
  description: "A WhatsApp entry point for ScamCheck GH. It needs a Meta app before it can reply in WhatsApp.",
};

export default function WhatsAppPage() {
  return (
    <Shell>
      <article className="prose">
        <p className="t-overline t-muted">Needs setup</p>
        <h1 className="t-h1">WhatsApp bot</h1>
        <p>
          Forward a message to the bot and it should answer with the same verdict as the website. This copy is a stub. It does not talk to Meta until you add a WhatsApp Cloud API app, and it never reads the SMS inbox on a phone.
        </p>
        <h2 className="t-h2">What you need</h2>
        <ul>
          <li>A Meta WhatsApp Business app and a test number.</li>
          <li>
            <span className="t-mono">WHATSAPP_VERIFY_TOKEN</span> for the webhook handshake.
          </li>
          <li>
            <span className="t-mono">WHATSAPP_TOKEN</span> and <span className="t-mono">WHATSAPP_PHONE_ID</span> before any reply is sent. Sending stays off until <span className="t-mono">WHATSAPP_SEND=1</span>.
          </li>
          <li>
            Webhook URL: <span className="t-mono">/api/whatsapp</span>
          </li>
        </ul>
        <p>Replies inside Meta’s 24-hour window are free up to the monthly allowance. After that, Meta charges. Keep DEMO_MODE on until you mean to spend Nebius credits.</p>
        <WhatsAppStub />
        <p>
          <Link className="text-link" href="/share">
            Or share a message into the app
          </Link>
        </p>
      </article>
    </Shell>
  );
}
