"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { copyFor } from "@/lib/i18n";
import { confidenceWords, verdictWord } from "@/lib/copy";
import type { CheckResult, Lang } from "@/lib/types";

const statusWord = {
  pending: { en: "Waiting", tw: "Ɛretwɛn" },
  active: { en: "Running", tw: "Ɛreyɛ adwuma" },
  done: { en: "Ran", tw: "Ɛyɛɛ adwuma" },
  skipped: { en: "Did not run", tw: "Anyɛ adwuma" },
  error: { en: "Problem", tw: "Ɛyɛɛ asiane" },
} as const;

export function VerdictView({
  result,
  lang,
  onReset,
}: {
  result: CheckResult;
  lang: Lang;
  onReset: () => void;
}) {
  const t = copyFor(lang);
  const [speaking, setSpeaking] = useState(false);
  const entities = [
    [t.phones, result.entities.phones, "tel"],
    [t.amounts, result.entities.amounts, "text"],
    [t.links, result.entities.links, "url"],
    [t.orgs, result.entities.organisations, "text"],
    [t.names, result.entities.names, "text"],
  ] as const;
  const anyEntity = entities.some(([, values]) => values.length > 0);

  function toggleSpeech() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const script = [
      verdictWord(result.verdict, lang),
      result.headline,
      ...result.reasoning,
      ...result.actions.map((action, index) => `${index + 1}. ${action.title}. ${action.detail}`),
    ].join(". ");
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.lang = lang === "tw" ? "tw" : "en-GH";
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <div className="sc-stack" aria-live="polite">
      {result.demoNote ? <p className="sc-demo-chip">{result.demoNote}</p> : null}
      <section className="verdict" data-verdict={result.verdict} aria-labelledby="verdict-title">
        <p className="verdict-kicker">{result.patternLabel}</p>
        <h2 id="verdict-title" tabIndex={-1} className="verdict-word">
          {verdictWord(result.verdict, lang)}
        </h2>
        <p className="verdict-headline">{result.headline}</p>
        <p className="verdict-confidence">
          <span>{t.confidence}</span>
          <strong>
            {result.confidence}% · {confidenceWords(result.confidence, lang)}
          </strong>
        </p>
        <div className="sc-row">
          <Button type="button" variant="secondary" onClick={toggleSpeech}>
            {speaking ? t.stopHearing : t.hear}
          </Button>
          <Button type="button" variant="outline" onClick={onReset}>
            {t.newCheck}
          </Button>
        </div>
      </section>

      <section className="sc-panel" aria-labelledby="actions-title">
        <h3 id="actions-title">{t.whatNow}</h3>
        <ol className="action-list">
          {result.actions.map((action) => (
            <li key={action.title}>
              {action.href ? (
                <a href={action.href} target={action.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                  <ActionBody title={action.title} detail={action.detail} />
                </a>
              ) : (
                <div>
                  <ActionBody title={action.title} detail={action.detail} />
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="sc-panel" aria-labelledby="why-title">
        <h3 id="why-title">{t.why}</h3>
        <ul className="reason-list">
          {result.reasoning.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </section>

      <section className="sc-panel" aria-labelledby="found-title">
        <h3 id="found-title">{t.found}</h3>
        {anyEntity ? (
          <dl className="entity-list">
            {entities
              .filter(([, values]) => values.length > 0)
              .map(([label, values, kind]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    {values.map((value) =>
                      kind === "url" ? (
                        <a key={value} href={value} target="_blank" rel="noreferrer">
                          {value}
                        </a>
                      ) : kind === "tel" ? (
                        <a key={value} href={`tel:${value}`}>
                          {groupPhone(value)}
                        </a>
                      ) : (
                        <span key={value}>{value}</span>
                      ),
                    )}
                  </dd>
                </div>
              ))}
          </dl>
        ) : (
          <p>{t.noneFound}</p>
        )}
      </section>

      <section className="sc-panel" aria-labelledby="pages-title">
        <h3 id="pages-title">{t.pages}</h3>
        <p className="sc-note">{result.evidenceNote}</p>
        <ul className="evidence-list">
          {result.evidence.map((item) => (
            <li key={item.url}>
              <a href={item.url} target="_blank" rel="noreferrer">
                {item.title}
              </a>
              <p>{item.snippet}</p>
              <Badge variant="outline">
                {item.source}
                {item.origin === "sample" ? " · sample" : " · Tavily"}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      <section className="sc-panel" aria-labelledby="checked-title">
        <h3 id="checked-title">{result.extractedFromImage ? t.samplePhoto : t.checked}</h3>
        <blockquote>{result.inputText}</blockquote>
      </section>

      <section className="sc-panel" aria-labelledby="trace-title">
        <h3 id="trace-title">{t.trace}</h3>
        <p className="sc-note">{t.traceHelp}</p>
        <ol className="trace-list">
          {result.trace.map((step) => (
            <li key={step.id} data-status={step.status}>
              <div className="trace-top">
                <strong>{step.title}</strong>
                <span>{statusWord[step.status][lang]}</span>
              </div>
              <code>{step.model}</code>
              <p className="trace-provider">
                {t.provider}: {step.provider}
                {step.durationMs > 0 ? ` · ${step.durationMs} ms` : ""}
                {step.maxTokens ? ` · ${step.maxTokens} token cap` : ""}
                {step.cached ? " · cached" : ""}
              </p>
              <p>{step.summary}</p>
              {step.detail ? <p className="trace-detail">{step.detail}</p> : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function ActionBody({ title, detail }: { title: string; detail: string }) {
  return (
    <>
      <strong>{title}</strong>
      <span>{detail}</span>
    </>
  );
}

function groupPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  return value;
}
