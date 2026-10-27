import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/shell";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What ScamCheck GH does with a message you paste, and what it does not save.",
};

export default function PrivacyPage() {
  return (
    <Shell>
      <article className="prose">
        <p className="t-overline t-muted">Privacy</p>
        <h1 className="t-h1">Your message is not saved to disk</h1>
        <p>We never ask for your MoMo PIN, OTP, or password. Do not type them.</p>
        <h2 className="t-h2">Sample mode</h2>
        <p>
          With sample mode on, the check runs from the words you send to this app’s own server. Those words are not written to a database and are not sent to Nemotron or Tavily.
        </p>
        <h2 className="t-h2">Live mode</h2>
        <p>
          When live mode is on, the message is sent to Nebius Token Factory so a Nemotron model can read it. PIN, OTP, password, and Ghana Card values are replaced with “[redacted]” before that prompt is built. Phone numbers in the message stay, because they are what the check is about. Short search phrases are sent to Tavily. We do not write the message to disk and we do not sell it.
        </p>
        <p>
          A repeat of the same check can reuse the model’s answer from memory for 15 minutes, then it is dropped. That is why the app does not say “Not stored”. It says “Not saved to disk”.
        </p>
        <h2 className="t-h2">On your phone</h2>
        <ul>
          <li>If you are offline, the message waits in this browser’s local storage until you are back online. It stays on your device.</li>
          <li>A photo is resized in the browser before it is sent. You can type the words instead.</li>
          <li>We do not run an account system, and we do not keep the message you pasted.</li>
          <li>Family names, the “Not a scam” note, and alerts on this phone stay in this browser. A watch link stores only the band and the pattern title, not the message. Anyone with that link can see those alerts.</li>
          <li>The shared card leaves out the full message.</li>
          <li>Scam Radar may keep a masked number, a hash, and the pattern. It does not keep the message.</li>
          <li>My Shield keeps past checks in this browser only.</li>
          <li>The website does not read your contacts or your SMS inbox. The Android companion can read SMS only after you allow it, and it keeps the text on the phone unless you tap Check with AI.</li>
        </ul>
        <p>
          The numbers under “What to do now” are chosen in code from a fixed list. The model cannot add a phone number.
        </p>
        <p>
          <Link className="text-link" href="/disclaimer">
            Read the disclaimer
          </Link>
        </p>
      </article>
    </Shell>
  );
}
