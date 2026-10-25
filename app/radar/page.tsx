import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { OFFICIAL_CONTACTS } from "@/lib/official";
import { listRadar } from "@/lib/radar";

export const metadata: Metadata = {
  title: "Ghana Scam Radar",
  description: "Trending MoMo scam patterns from anonymised checks. Report to CSA 292 or MTN *170#.",
};

export default function RadarPage() {
  const rows = listRadar();
  return (
    <Shell>
      <article className="prose">
        <p className="t-overline t-muted">Ghana Scam Radar</p>
        <h1 className="t-h1">What people are checking</h1>
        <p>
          Counts mix a small sample set with checks run on this server. A phone number is stored as a mask and a hash. The message itself is not kept. This is not a national feed.
        </p>
        <div className="cluster">
          <a className="btn btn-accent btn-md" href={OFFICIAL_CONTACTS.csaHref}>
            Call CSA 292
          </a>
          <a className="btn btn-secondary btn-md" href={`sms:292?body=${encodeURIComponent("I want to report a mobile money scam.")}`}>
            Text 292
          </a>
          <a className="btn btn-secondary btn-md" href={OFFICIAL_CONTACTS.mtnUssdHref}>
            MTN *170#
          </a>
          <a className="btn btn-secondary btn-md" href={`mailto:${OFFICIAL_CONTACTS.csaEmail}`}>
            Email CSA
          </a>
        </div>
        <ol className="card overflow-hidden">
          {rows.map((row) => (
            <li className="action" key={row.id}>
              <span className="action-num">{row.count}</span>
              <div>
                <p className="action-title">{row.title}</p>
                <p className="t-muted mt-1">
                  {row.mask} · {row.count} {row.count === 1 ? "report" : "reports"}
                  {row.sample ? " · sample" : " · from checks on this server"}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p>
          <Link className="btn btn-primary btn-md" href="/">
            Check a message
          </Link>
        </p>
      </article>
    </Shell>
  );
}
