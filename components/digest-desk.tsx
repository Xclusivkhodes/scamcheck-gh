"use client";

import { useState, useSyncExternalStore } from "react";

const QUIZ = [
  {
    prompt: "A text says you received GHS 800 by mistake and must reverse it with your PIN. What do you do?",
    choices: ["Send it back", "Share the PIN with the agent", "Do not send. Dial *170# yourself"],
    answer: 2,
  },
  {
    prompt: "A prize says pay GHS 20 before you can claim GHS 5,000. What is that?",
    choices: ["A normal MoMo fee", "A prize scam", "A bank receipt"],
    answer: 1,
  },
  {
    prompt: "GRA will collect a tax penalty on a strange link in SMS.",
    choices: ["Yes, pay it quickly", "No. Use a GRA office or gra.gov.gh", "Only if they ask for your PIN"],
    answer: 1,
  },
];

const STREAK_KEY = "scamcheck-streak";
const WEEK_KEY = "scamcheck-streak-week";
const STREAK_EVENT = "scamcheck-streak";

function isoWeek(date: Date): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${week}`;
}

function subscribeStreak(onStoreChange: () => void) {
  window.addEventListener(STREAK_EVENT, onStoreChange);
  return () => window.removeEventListener(STREAK_EVENT, onStoreChange);
}

function streakSnapshot() {
  return localStorage.getItem(STREAK_KEY) || "0";
}

export function DigestDesk({
  trends,
}: {
  trends: Array<{ title: string; mask: string; count: number; sample: boolean }>;
}) {
  const [picked, setPicked] = useState<number[]>([-1, -1, -1]);
  const [done, setDone] = useState(false);
  const streak = Number(useSyncExternalStore(subscribeStreak, streakSnapshot, () => "0")) || 0;

  function finish() {
    const correct = QUIZ.filter((item, index) => picked[index] === item.answer).length;
    const previous = Number(localStorage.getItem(STREAK_KEY) || "0");
    const week = isoWeek(new Date());
    const previousWeek = localStorage.getItem(WEEK_KEY);
    const next = correct === QUIZ.length ? (previousWeek === week ? previous : previous + 1) : 0;
    localStorage.setItem(STREAK_KEY, String(next));
    if (correct === QUIZ.length) localStorage.setItem(WEEK_KEY, week);
    else localStorage.removeItem(WEEK_KEY);
    window.dispatchEvent(new Event(STREAK_EVENT));
    setDone(true);
  }

  return (
    <article className="prose">
      <p className="t-overline t-muted">This week</p>
      <h1 className="t-h1">Three scams to watch</h1>
      <p>
        A WhatsApp digest needs a Meta business number, so this page is the version you can open today. Come back next week: a full score once in a week keeps the streak. The counts include sample rows until people check messages on this server.
      </p>
      <ol className="card overflow-hidden">
        {trends.map((row) => (
          <li className="action" key={row.title}>
            <span className="action-num">{row.count}</span>
            <div>
              <p className="action-title">{row.title}</p>
              <p className="t-muted mt-1">
                {row.mask}
                {row.sample ? " · sample" : ""}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <h2 className="t-h2">Spot the scam</h2>
      <p>Thirty seconds. A full score once this week keeps a streak on this phone. Streak on this phone: {streak}.</p>
      {QUIZ.map((item, index) => (
        <fieldset className="card p-5" key={item.prompt}>
          <legend className="t-label">{item.prompt}</legend>
          <div className="cluster mt-3">
            {item.choices.map((choice, choiceIndex) => (
              <button
                key={choice}
                type="button"
                className="btn btn-secondary btn-md"
                aria-pressed={picked[index] === choiceIndex}
                onClick={() => setPicked((current) => current.map((value, itemIndex) => (itemIndex === index ? choiceIndex : value)))}
              >
                {choice}
              </button>
            ))}
          </div>
          {done ? <p className="t-small mt-2">{picked[index] === item.answer ? "Right." : `The safer pick is: ${item.choices[item.answer]}`}</p> : null}
        </fieldset>
      ))}
      <button type="button" className="btn btn-primary btn-md" disabled={picked.some((value) => value < 0)} onClick={finish}>
        Check my answers
      </button>
      {done ? <p role="status">Streak on this phone: {streak}. Come back next week to keep it.</p> : null}
    </article>
  );
}
