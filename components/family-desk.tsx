"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

interface Relative {
  id: string;
  name: string;
}

const KEY = "scamcheck-family";
const EVENT = "scamcheck-family";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(EVENT, onStoreChange);
  return () => window.removeEventListener(EVENT, onStoreChange);
}

function snapshot() {
  return localStorage.getItem(KEY) || "[]";
}

function parsePeople(raw: string): Relative[] {
  try {
    const saved = JSON.parse(raw) as Relative[];
    if (!Array.isArray(saved)) return [];
    return saved.filter((person) => person?.name && person?.id);
  } catch {
    return [];
  }
}

export function FamilyDesk() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const people = parsePeople(raw);

  function save(next: Relative[]) {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <article className="prose">
      <p className="t-overline t-muted">Check for Mum</p>
      <h1 className="t-h1">Send a card, not the message</h1>
      <p>
        Link a relative on this phone. When a check is Scam or Caution, you can forward a card with the band and the next step. The card does not include the full message, and ScamCheck does not read your contacts.
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
                <p className="t-muted mt-1">Alerts stay on this phone until you send a card.</p>
                <button type="button" className="btn btn-ghost mt-2" onClick={() => save(people.filter((item) => item.id !== person.id))}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No one is linked yet. Add Mum, then check a message and choose Send a card to Mum.</p>
      )}
      <p>
        <Link className="btn btn-secondary btn-md" href="/">
          Check a message
        </Link>
      </p>
    </article>
  );
}
