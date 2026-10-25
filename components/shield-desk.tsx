"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { verdictWord } from "@/lib/copy";
import { shieldSummary, type ShieldEntry } from "@/lib/shield";

const EVENT = "scamcheck-shield-event";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function ShieldDesk() {
  const raw = useSyncExternalStore(subscribe, () => localStorage.getItem("scamcheck-shield") || "[]", () => "[]");
  const entries = parse(raw);
  const summary = shieldSummary(entries);
  return (
    <article className="prose">
      <p className="t-overline t-muted">My Shield</p>
      <h1 className="t-h1">Checks on this phone</h1>
      <p>This list stays in the browser. ScamCheck does not keep it on the server. Clear the site data and it goes.</p>
      <div className="steps-3">
        <div className="card p-5">
          <p className="t-overline t-muted">Checks</p>
          <p className="t-h2">{summary.checks}</p>
        </div>
        <div className="card p-5">
          <p className="t-overline t-muted">Scams dodged</p>
          <p className="t-h2">{summary.dodged}</p>
        </div>
        <div className="card p-5">
          <p className="t-overline t-muted">GH¢ in those messages</p>
          <p className="t-h2">{summary.protectedGhs.toLocaleString("en-GH")}</p>
        </div>
      </div>
      {entries.length === 0 ? (
        <p>No checks yet. A result will show up here after you check a message on this phone.</p>
      ) : (
        <ol className="card overflow-hidden">
          {entries.map((entry) => (
            <li className="action" key={entry.id}>
              <span className="action-num">{verdictWord(entry.verdict, "en").slice(0, 1)}</span>
              <div>
                <p className="action-title">
                  {verdictWord(entry.verdict, "en")} · {entry.pattern}
                </p>
                <p className="t-muted mt-1">{entry.headline}</p>
                <p className="t-small t-muted mt-1">{new Date(entry.at).toLocaleString("en-GH")}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      <p>
        <Link className="btn btn-primary btn-md" href="/">
          Check a message
        </Link>
      </p>
    </article>
  );
}

function parse(raw: string): ShieldEntry[] {
  try {
    return readShieldFrom(raw);
  } catch {
    return [];
  }
}

function readShieldFrom(raw: string): ShieldEntry[] {
  const parsed = JSON.parse(raw) as ShieldEntry[];
  return Array.isArray(parsed) ? parsed : [];
}
