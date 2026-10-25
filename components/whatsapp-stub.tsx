"use client";

import { useState } from "react";

export function WhatsAppStub() {
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setReply("");
    const response = await fetch("/api/whatsapp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const body = (await response.json()) as { reply?: string; error?: string };
    if (!response.ok) {
      setError(body.error || "The stub could not check that message.");
      return;
    }
    setReply(body.reply || "");
  }

  return (
    <form className="card p-5" onSubmit={(event) => void onSubmit(event)}>
      <label className="field-label" htmlFor="wa-text">
        Try the stub
      </label>
      <textarea id="wa-text" className="textarea" value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste the forwarded WhatsApp message" />
      <button type="submit" className="btn btn-primary btn-md mt-3">
        Ask the stub
      </button>
      {error ? (
        <p className="field-error mt-3" role="alert">
          {error}
        </p>
      ) : null}
      {reply ? <p className="mt-3">{reply}</p> : null}
    </form>
  );
}
