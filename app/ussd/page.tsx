import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { OFFICIAL_CONTACTS } from "@/lib/official";

export const metadata: Metadata = {
  title: "USSD and SMS",
  description: "Why ScamCheck does not run a public short code yet, and the codes you can dial today.",
};

export default function UssdPage() {
  return (
    <Shell>
      <article className="prose">
        <p className="t-overline t-muted">Feature phones</p>
        <h1 className="t-h1">USSD is not a public short code yet</h1>
        <p>
          About two in five phones in Ghana cannot install an app. A real USSD or SMS short code needs an allocation from a network. ScamCheck does not have one, and this site will not pretend to. Dial the codes below yourself. Do not dial a code that arrived inside a suspicious message.
        </p>
        <div className="cluster">
          <a className="btn btn-primary btn-md" href={OFFICIAL_CONTACTS.mtnUssdHref}>
            Dial MTN *170#
          </a>
          <a className="btn btn-secondary btn-md" href={OFFICIAL_CONTACTS.csaHref}>
            Call CSA 292
          </a>
        </div>
        <h2 className="t-h2">What you can use today</h2>
        <ul>
          <li>This website, including Share to ScamCheck if you install it.</li>
          <li>The Android companion, which can read SMS on your own phone if you allow it. It is not on Play.</li>
          <li>The WhatsApp stub, once a Meta test number is connected.</li>
        </ul>
        <p>The Android app does not upload a message unless you tap Check with AI.</p>
        <p>
          <Link className="btn btn-secondary btn-md" href="/">
            Check a message here
          </Link>
        </p>
      </article>
    </Shell>
  );
}