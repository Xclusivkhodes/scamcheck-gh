"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { verdictWord } from "@/lib/copy";
import type { FamilyAlert } from "@/lib/family-alerts";

export function FamilyWatch({ code }: { code: string }) {
  const [alerts, setAlerts] = useState<FamilyAlert[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error" | "invalid">(code ? "loading" : "invalid");

  useEffect(() => {
    if (!code) return;
    const controller = new AbortController();
    fetch(`/api/family?code=${encodeURIComponent(code)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("bad");
        return (await response.json()) as { alerts?: FamilyAlert[] };
      })
      .then((body) => {
        setAlerts(body.alerts ?? []);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState("error");
      });
    return () => controller.abort();
  }, [code]);

  return (
    <article className="prose">
      <p className="t-overline t-muted">Check for Mum</p>
      <h1 className="t-h1">Alerts for this watch link</h1>
      <p>The full message is not on this page. Each row is the band and the pattern title from a high-risk check. Call 292 if money already moved.</p>
      {state === "invalid" ? <p role="status">This watch link is missing a code.</p> : null}
      {state === "loading" ? <p role="status">Loading alerts…</p> : null}
      {state === "error" ? (
        <p role="alert">The alerts could not be loaded. Check the link and try again.</p>
      ) : null}
      {state === "ready" && alerts.length === 0 ? <p role="status">No alerts yet. A Safe check does not appear here.</p> : null}
      {state === "ready" && alerts.length > 0 ? (
        <ul className="card overflow-hidden">
          {alerts.map((alert) => (
            <li className="action" key={`${alert.at}-${alert.pattern}`}>
              <span className="action-num">{verdictWord(alert.verdict, "en").slice(0, 1)}</span>
              <div>
                <p className="action-title">
                  {verdictWord(alert.verdict, "en")} · {alert.pattern}
                </p>
                <p className="t-muted mt-1">Do not send money or share a PIN. Call CSA on 292, or dial *170# and check the balance yourself.</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <p>
        <Link className="btn btn-primary btn-md" href="/family">
          Back to Check for Mum
        </Link>
      </p>
    </article>
  );
}
