"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { cardQuery } from "@/lib/card";
import { verdictWord } from "@/lib/copy";
import {
  ensureFamilyCode,
  FAMILY_ALERTS_KEY,
  FAMILY_CODE_KEY,
  FAMILY_EVENT,
  FAMILY_KEY,
  familyAlertsSnapshot,
  familyCodeSnapshot,
  familySnapshot,
  readLocalAlerts,
  readPeople,
  subscribeFamily,
  type Relative,
} from "@/lib/family-local";

export function FamilyDesk() {
  const people = readPeople(useSyncExternalStore(subscribeFamily, familySnapshot, () => "[]"));
  const code = useSyncExternalStore(subscribeFamily, familyCodeSnapshot, () => "");
  const alerts = readLocalAlerts(useSyncExternalStore(subscribeFamily, familyAlertsSnapshot, () => "[]"));
  const [copied, setCopied] = useState(false);

  function save(next: Relative[]) {
    localStorage.setItem(FAMILY_KEY, JSON.stringify(next));
    if (next.length > 0) ensureFamilyCode();
    if (next.length === 0) {
      localStorage.removeItem(FAMILY_CODE_KEY);
      localStorage.removeItem(FAMILY_ALERTS_KEY);
    }
    window.dispatchEvent(new Event(FAMILY_EVENT));
  }

  const watchPath = code ? `/family/watch?code=${code}` : "";

  return (
    <article className="prose">
      <p className="t-overline t-muted">Check for Mum</p>
      <h1 className="t-h1">Send a card, not the message</h1>
      <p>
        Link a relative on this phone. When a check is Scam or Caution, an alert is kept here and on a watch link you can send once. The alert has the band and the pattern, not the message. ScamCheck does not read your contacts, and it cannot push a notification to another phone.
      </p>
      <form
        className="card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const trimmed = String(data.get("name") || "").trim().slice(0, 40);
          if (!trimmed) return;
          save([...people, { id: crypto.randomUUID(), name: trimmed }]);
          event.currentTarget.reset();
        }}
      >
        <label className="field-label" htmlFor="relative-name">
          Relative’s name
        </label>
        <input id="relative-name" name="name" className="input" defaultValue="Mum" maxLength={40} />
        <button type="submit" className="btn btn-primary btn-md mt-3">
          Link on this phone
        </button>
      </form>
      {people.length > 0 ? (
        <ul className="card overflow-hidden">
          {people.map((person) => (
            <li className="action" key={person.id}>
              <span className="action-num">{person.name.slice(0, 1).toUpperCase()}</span>
              <div>
                <p className="action-title">{person.name}</p>
                <p className="t-muted mt-1">High-risk checks on this phone show up below, then you can forward the card.</p>
                <button type="button" className="btn btn-ghost mt-2" onClick={() => save(people.filter((item) => item.id !== person.id))}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No one is linked yet. Add Mum, then check a message. A Scam or Caution result can open a card.</p>
      )}
      {watchPath ? (
        <section className="card p-5" aria-labelledby="watch-heading">
          <h2 id="watch-heading" className="t-h3">
            Watch link
          </h2>
          <p className="t-muted mt-2">Anyone with this link can see the band and the pattern. They cannot see the message. Send it once, to the person you linked.</p>
          <p className="mt-3">
            <Link className="text-link" href={watchPath}>
              {watchPath}
            </Link>
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-md mt-3"
            onClick={() => {
              const absolute = `${window.location.origin}${watchPath}`;
              void navigator.clipboard.writeText(absolute).then(
                () => setCopied(true),
                () => setCopied(false),
              );
            }}
          >
            {copied ? "Copied" : "Copy watch link"}
          </button>
        </section>
      ) : null}
      <section aria-labelledby="alerts-heading">
        <h2 id="alerts-heading" className="t-h2">
          Alerts on this phone
        </h2>
        {alerts.length > 0 ? (
          <ul className="card overflow-hidden">
            {alerts.map((alert) => (
              <li className="action" key={alert.id}>
                <span className="action-num">{verdictWord(alert.verdict, "en").slice(0, 1)}</span>
                <div>
                  <p className="action-title">
                    {verdictWord(alert.verdict, "en")} · {alert.pattern}
                  </p>
                  <p className="t-muted mt-1">
                    For {alert.name}. {alert.headline}
                  </p>
                  <Link
                    className="btn btn-secondary btn-md mt-2"
                    href={cardQuery({ verdict: alert.verdict, headline: alert.headline, pattern: alert.pattern, lang: "en" })}
                  >
                    Open the card
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No high-risk checks yet. A Safe result does not raise an alert.</p>
        )}
      </section>
      <p>
        <Link className="btn btn-secondary btn-md" href="/">
          Check a message
        </Link>
      </p>
    </article>
  );
}
