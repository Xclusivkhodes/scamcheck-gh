import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/shell";

export const metadata: Metadata = {
  title: "How it works",
  description: "How ScamCheck GH reads a message, searches public warnings, and chooses the numbers to call.",
};

export default function AboutPage() {
  return (
    <Shell>
      <article className="prose">
        <p className="t-overline t-muted">About</p>
        <h1 className="t-h1">How ScamCheck GH works</h1>
        <p>
          Paste a MoMo alert, SMS, or WhatsApp chat. In a few seconds you get one of four bands: Safe, Caution, Scam, or {"Can't tell"}. You also get the reason, the pages we used, and the numbers to call.
        </p>
        <h2 className="t-h2">Three steps</h2>
        <ol>
          <li>You paste the message, or type the words from a photo.</li>
          <li>A Nemotron model reads it. Tavily searches public pages for known scams and official warnings.</li>
          <li>A second Nemotron step weighs that evidence. ScamCheck rules, not the model, add the phone numbers.</li>
        </ol>
        <h2 className="t-h2">Which model does what</h2>
        <ul>
          <li>
            <strong>Reading the message.</strong> <span className="t-mono">nvidia/Nemotron-3_5-Lightning</span> on Nebius Token Factory. A photo with no typed text uses <span className="t-mono">nvidia/Nemotron-3.5-Super-VL</span>.
          </li>
          <li>
            <strong>Web search.</strong> Tavily Search. A later pass drops any line that cites a page the search did not return.
          </li>
          <li>
            <strong>The answer.</strong> <span className="t-mono">nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B</span>. If the first pass is under 70% sure, or the amount is at least GH¢500, the verdict step uses <span className="t-mono">nvidia/nemotron-3-super-120b-a12b</span>. Ultra is rejected. There is no separate guard model.
          </li>
          <li>
            <strong>What to do now.</strong> <span className="t-mono">scamcheck-rules</span>. No AI. The numbers are a fixed list checked by a person.
          </li>
        </ul>
        <h2 className="t-h2">Sample mode</h2>
        <p>
          Until <span className="t-mono">DEMO_MODE</span> is turned off, nothing is sent to Nemotron or Tavily. The answer comes from rules on your device’s request, and the pages are saved official links. The screen says when a model was not called.
        </p>
        <h2 className="t-h2">What this is not</h2>
        <p>
          ScamCheck GH does not move money, reverse a payment, or speak for MTN, Telecel, AT, or the Bank of Ghana. Safe does not mean certain. Twi text is a beta translation. Read the <Link href="/disclaimer">disclaimer</Link> and the <Link href="/privacy">privacy note</Link>.
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
