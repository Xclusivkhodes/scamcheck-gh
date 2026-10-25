"use client";

import { useEffect, useId, useState } from "react";
import { Logo } from "@/components/logo";
import { VerdictView } from "@/components/verdict-view";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EXAMPLES } from "@/lib/examples";
import { copyFor } from "@/lib/i18n";
import type { CheckResult, Lang } from "@/lib/types";

type TabId = "paste" | "photo" | "examples";

interface Health {
  demoMode: boolean;
  models: { vision: string; classify: string; verdict: string };
}

const FALLBACK_MODELS = {
  vision: "nvidia/Nemotron-3.5-Super-VL",
  classify: "nvidia/Nemotron-3_5-Lightning",
  verdict: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
};

export function Checker() {
  const [lang, setLang] = useState<Lang>("en");
  const [tab, setTab] = useState<TabId>("paste");
  const [text, setText] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const messageId = useId();
  const t = copyFor(lang);
  const models = health?.models ?? FALLBACK_MODELS;
  const demoMode = health?.demoMode !== false;

  useEffect(() => {
    document.documentElement.lang = lang === "tw" ? "tw" : "en";
  }, [lang]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { signal: controller.signal })
      .then((response) => response.json())
      .then((body: Health) => setHealth(body))
      .catch(() => setHealth({ demoMode: true, models: FALLBACK_MODELS }));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(() => setPhase((current) => (current + 1) % 4), 700);
    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (!result) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("verdict-title")?.focus({ preventScroll: true });
    document.getElementById("verdict-title")?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, [result]);

  async function submit(
    next: { text?: string; imageDataUrl?: string; exampleId?: string },
    language: Lang = lang,
  ) {
    setLoading(true);
    setError("");
    setPhase(0);
    setResult(null);
    try {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...next, language }),
      });
      const body = (await response.json()) as CheckResult & { error?: string };
      if (!response.ok) {
        setError(body.error || copyFor(language).couldNot);
        return;
      }
      setResult(body);
      if (body.inputText && !next.exampleId) setText(body.inputText);
    } catch {
      setError(copyFor(language).couldNot);
    } finally {
      setLoading(false);
    }
  }

  function changeLang(nextLang: Lang) {
    setLang(nextLang);
    if (result?.inputText) void submit({ text: result.inputText }, nextLang);
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t.photoHelp);
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      setPhotoName(file.name);
      setPhotoUrl(dataUrl);
      setError("");
      await submit({ imageDataUrl: dataUrl, text: text.trim() || undefined });
    } catch {
      setError(t.photoHelp);
    }
  }

  const checkLabel = loading ? `${t.checking}…` : t.check;

  return (
    <div className="sc-page">
      <div className="kente-bar" />
      <a className="skip-link" href={`#${messageId}`}>
        {t.skip}
      </a>
      <header className="sc-header">
        <div className="sc-brand">
          <Logo className="sc-logo" />
          <div>
            <p className="sc-name">{t.appName}</p>
            <p className="sc-tag">{t.tagline}</p>
          </div>
        </div>
        <div className="lang-switch" role="group" aria-label={t.languageLabel}>
          <button type="button" aria-pressed={lang === "en"} onClick={() => changeLang("en")}>
            {t.langEn}
          </button>
          <button type="button" aria-pressed={lang === "tw"} onClick={() => changeLang("tw")}>
            {t.langTw}
          </button>
        </div>
      </header>

      <main className="sc-main">
        <div className="sc-grid">
          <section className="sc-composer" aria-labelledby="page-title">
            <p className={demoMode ? "mode-banner" : "mode-banner live"} role="status">
              <strong>{demoMode ? t.demoTitle : t.liveTitle}</strong>
              <span>{demoMode ? t.demoBody : t.liveBody}</span>
            </p>
            <h1 id="page-title">{t.title}</h1>
            <p className="lede">{t.lede}</p>
            <p className="trust">{t.trust}</p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (tab === "photo") {
                  if (!photoUrl) {
                    setError(t.addPhotoFirst);
                    return;
                  }
                  void submit({ imageDataUrl: photoUrl, text: text.trim() || undefined });
                  return;
                }
                if (!text.trim()) {
                  setError(t.needText);
                  return;
                }
                void submit({ text: text.trim() });
              }}
            >
              <Tabs
                className="sc-tabs"
                value={tab}
                onValueChange={(value) => {
                  setTab(value as TabId);
                  setError("");
                }}
              >
                <TabsList aria-label={t.examples}>
                  <TabsTrigger value="paste">{t.paste}</TabsTrigger>
                  <TabsTrigger value="photo">{t.photo}</TabsTrigger>
                  <TabsTrigger value="examples">{t.examples}</TabsTrigger>
                </TabsList>
                <TabsContent value="paste" keepMounted>
                  <label className="field-label" htmlFor={messageId}>
                    {t.messageLabel}
                  </label>
                  <Textarea
                    id={messageId}
                    name="message"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder={t.placeholder}
                    className="sc-input"
                    rows={7}
                    required={tab === "paste"}
                  />
                </TabsContent>
                <TabsContent value="photo">
                  <p className="sc-note">{demoMode ? t.photoDemo : t.photoHelp}</p>
                  <label className="photo-pick">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => void onPhoto(event.target.files?.[0])}
                    />
                    <span>{photoUrl ? t.changePhoto : t.addPhoto}</span>
                  </label>
                  {photoUrl ? (
                    <div className="photo-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoUrl} alt={photoName || t.photoReady} />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoUrl("");
                          setPhotoName("");
                        }}
                      >
                        {t.removePhoto}
                      </button>
                    </div>
                  ) : null}
                </TabsContent>
                <TabsContent value="examples">
                  <p className="sc-note">{t.examplesHelp}</p>
                  <div className="example-grid">
                    {EXAMPLES.map((example) => (
                      <button
                        key={example.id}
                        type="button"
                        onClick={() => {
                          setText(example.text);
                          setTab("paste");
                          void submit({ exampleId: example.id, text: example.text });
                        }}
                      >
                        <strong>{example.label[lang]}</strong>
                        <span>{example.text.slice(0, 90)}…</span>
                      </button>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              {error ? (
                <p className="form-error" role="alert">
                  {error}
                </p>
              ) : null}

              {tab !== "examples" ? (
                <Button type="submit" size="xl" disabled={loading} aria-busy={loading}>
                  {checkLabel}
                </Button>
              ) : null}
            </form>
          </section>

          <section className="sc-stage" aria-live="polite">
            {loading ? (
              <div className="sc-panel working">
                <h2>{t.working}</h2>
                <ol className="phase-list">
                  {t.phases.map((label, index) => (
                    <li key={label} aria-current={index === phase ? "step" : undefined}>
                      {label}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            {!loading && result ? (
              <VerdictView
                result={result}
                lang={lang}
                onReset={() => {
                  setResult(null);
                  setText("");
                  setPhotoUrl("");
                  setPhotoName("");
                  setTab("paste");
                  document.getElementById(messageId)?.focus();
                }}
              />
            ) : null}
            {!loading && !result ? (
              <section className="sc-panel how" aria-labelledby="how-title">
                <h2 id="how-title">{t.howTitle}</h2>
                <ol className="how-list">
                  {t.steps.map((step, index) => (
                    <li key={step.title}>
                      <strong>{step.title}</strong>
                      <span>{step.body}</span>
                      <code>
                        {index === 0 ? models.vision : index === 1 ? models.classify : index === 2 ? "Tavily Search" : models.verdict}
                      </code>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </section>
        </div>
      </main>
      <footer className="sc-footer">
        <p>{t.footer}</p>
        <p>{t.hack}</p>
      </footer>
    </div>
  );
}

async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 1600;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}
