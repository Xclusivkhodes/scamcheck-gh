"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CircleCheckBig,
  CircleHelp,
  ClipboardPaste,
  Clock,
  ExternalLink,
  Eye,
  ImageUp,
  Volume2,
  Info,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  OctagonX,
  Phone,
  RefreshCw,
  Scale,
  Share2,
  TriangleAlert,
  WifiOff,
  X,
} from "lucide-react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { cardQuery } from "@/lib/card";
import { confidenceMeter, modelShortName } from "@/lib/confidence";
import { highlightNeedles, highlightSpans } from "@/lib/highlight";
import { noteHighRiskCheck } from "@/lib/family-local";
import { applyNotScam, notScamKey, notScamSnapshot, readNotScamMarks, saveNotScamMark, subscribeNotScam } from "@/lib/not-scam";
import { rememberShield } from "@/lib/shield";
import { confidenceWords, verdictPanelWord, verdictWord } from "@/lib/copy";
import { EXAMPLES } from "@/lib/examples";
import { buildActions, OFFICIAL_CONTACTS } from "@/lib/official";
import { messageTooShort, photoIsBlurry, prescanMessage, shouldWarnSlow } from "@/lib/prescan";
import type { ActionItem, CheckResult, Lang, TraceStep, Verdict } from "@/lib/types";

const QUEUE_KEY = "scamcheck-offline";
const FALLBACK_MODELS = {
  vision: "nvidia/Nemotron-3.5-Super-VL",
  classify: "nvidia/Nemotron-3_5-Lightning",
  verdict: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
};

type View = "home" | "checking" | "result" | "evidence" | "offline" | "error";
type Provider = "nemotron" | "tavily" | "rules";

interface ShownStep {
  id: string;
  title: string;
  model: string;
  provider: Provider;
  status: "pending" | "active" | "done" | "error" | "skipped";
  ms?: number;
  output: string;
}

interface Job {
  text?: string;
  exampleId?: string;
  imageDataUrl?: string;
  language: Lang;
  skipSearch?: boolean;
}

interface SseEvent {
  type: string;
  result?: CheckResult;
  message?: string;
  code?: string;
  reason?: string;
}

function tx(lang: Lang, en: string, tw: string) {
  return lang === "tw" ? tw : en;
}

function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatMs(ms: number) {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

async function readSse(response: Response): Promise<SseEvent[]> {
  const reader = response.body?.getReader();
  if (!reader) return [];
  const decoder = new TextDecoder();
  let buffer = "";
  const events: SseEvent[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.split("\n").find((item) => item.startsWith("data:"));
      if (!line) continue;
      events.push(JSON.parse(line.slice(5).trim()) as SseEvent);
    }
  }
  return events;
}

function loadImage(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const longest = Math.max(image.naturalWidth, image.naturalHeight);
      const scale = longest > 1024 ? 1024 / longest : 1;
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("canvas"));
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve({
        dataUrl: canvas.toDataURL("image/jpeg", 0.85),
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    image.src = url;
  });
}

export function CheckerApp({ initialText = "" }: { initialText?: string }) {
  const messageId = useId();
  const errorId = useId();
  const [lang, setLang] = useState<Lang>("en");
  const [text, setText] = useState(initialText);
  const [fieldError, setFieldError] = useState("");
  const [pasteNote, setPasteNote] = useState("");
  const [photo, setPhoto] = useState<{ preview: string; dataUrl: string; blurry: boolean } | null>(null);
  const [view, setView] = useState<View>("home");
  const [steps, setSteps] = useState<ShownStep[]>([]);
  const [slow, setSlow] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [failure, setFailure] = useState("");
  const models = FALLBACK_MODELS;
  const [demoMode, setDemoMode] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [hearing, setHearing] = useState(false);
  const jobRef = useRef<Job | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(0);

  useEffect(() => {
    document.documentElement.lang = lang === "tw" ? "tw" : "en";
    return () => {
      document.documentElement.lang = "en";
    };
  }, [lang]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { signal: controller.signal })
      .then((response) => response.json())
      .then((body: { mode?: string; demoMode?: boolean }) => {
        setDemoMode(body.mode ? body.mode !== "live" : body.demoMode !== false);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (view !== "checking") return;
    const timer = window.setInterval(() => setElapsed(Date.now() - startedRef.current), 200);
    return () => window.clearInterval(timer);
  }, [view]);

  useEffect(() => {
    if (view !== "result") return;
    const node = document.getElementById("verdict-title");
    node?.focus();
  }, [view]);

  useEffect(() => {
    const title =
      view === "checking"
        ? "Checking… — ScamCheck GH"
        : view === "result" && result
          ? `${verdictWord(result.verdict, "en")} — ScamCheck GH`
          : view === "evidence"
            ? "How we checked — ScamCheck GH"
            : "ScamCheck GH — Check before you send";
    document.title = title;
  }, [view, result]);

  useEffect(() => {
    function retryQueued() {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (!raw || !navigator.onLine) return;
      localStorage.removeItem(QUEUE_KEY);
      try {
        const saved = JSON.parse(raw) as Job;
        void run(saved);
      } catch {
        localStorage.removeItem(QUEUE_KEY);
      }
    }
    window.addEventListener("online", retryQueued);
    return () => window.removeEventListener("online", retryQueued);
  });

  async function run(job: Job) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    jobRef.current = job;
    setFailure("");
    setSlow(false);
    setResult(null);
    setElapsed(0);
    startedRef.current = Date.now();
    const seeded = seedSteps(Boolean(job.imageDataUrl), models);
    setSteps(seeded);
    setView("checking");

    if (!navigator.onLine) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify({ text: job.text, exampleId: job.exampleId, language: job.language, skipSearch: job.skipSearch }));
      setView("offline");
      return;
    }

    let lastByte = Date.now();
    const slowTimer = window.setInterval(() => {
      if (shouldWarnSlow(Date.now() - lastByte, true)) setSlow(true);
    }, 400);

    try {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ ...job, stream: true }),
        signal: controller.signal,
      });
      lastByte = Date.now();
      window.clearInterval(slowTimer);
      setSlow(false);

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string; code?: string; reason?: string };
        const error = new Error(body.error || tx(job.language, "We could not finish this check. Try again.", "Yɛantumi anwie check no. Bɔ mmɔden bio."));
        (error as Error & { code?: string }).code = body.reason || body.code;
        throw error;
      }

      const events = await readSse(response);
      const failed = events.find((event) => event.type === "error");
      if (failed) {
        const error = new Error(failed.message || "We could not finish this check. Try again.");
        (error as Error & { code?: string }).code = failed.reason || failed.code;
        throw error;
      }
      const done = events.find((event) => event.type === "result" && event.result);
      if (!done?.result) throw new Error(tx(job.language, "We could not finish this check. Try again.", "Yɛantumi anwie check no. Bɔ mmɔden bio."));

      const shown: ShownStep[] = done.result.trace.map((step) => ({
        id: step.id,
        title: step.label || step.title,
        model: step.model,
        provider: (step.provider === "tavily" || step.provider === "rules" ? step.provider : "nemotron") as Provider,
        status: step.status === "error" ? "error" : step.status === "skipped" ? "skipped" : "done",
        ms: step.ms ?? step.durationMs,
        output: step.output || step.summary,
      }));
      setSteps(shown);
      if (job.text) setText(job.text);
      const merged = { ...done.result, inputText: done.result.inputText || job.text || "" };
      setResult(merged);
      rememberShield(merged);
      noteHighRiskCheck(merged);
      setView("result");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const code = (error as Error & { code?: string }).code;
      if (code === "blurry_photo") {
        setPhoto((current) => (current ? { ...current, blurry: true } : current));
        setFieldError(error instanceof Error ? error.message : "We can't read this photo. Type the words you see, then check.");
        setView("home");
        return;
      }
      setFailure(error instanceof Error ? error.message : "We could not finish this check. Try again.");
      setView("error");
    } finally {
      window.clearInterval(slowTimer);
    }
  }

  function submitText(skipSearch = false) {
    const trimmed = text.trim();
    if (photo?.blurry && !trimmed) {
      setFieldError(tx(lang, "We can't read this photo. Type the words you see, then check.", "Yɛntumi nkenkan mfonini yi. Kyerew nsɛm a wohu no, na hwɛ bio."));
      return;
    }
    if (messageTooShort(trimmed)) {
      setFieldError(tx(lang, "Paste the whole message, not just one word.", "Fa nkrasɛm no nyinaa hyɛ ha, ɛnyɛ asɛmfua baako."));
      document.getElementById(messageId)?.focus();
      return;
    }
    setFieldError("");
    const sendPhoto = !demoMode && photo && !photo.blurry && !trimmed ? photo.dataUrl : undefined;
    void run({
      text: trimmed || undefined,
      imageDataUrl: sendPhoto,
      language: lang,
      skipSearch,
    });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFieldError(tx(lang, "Use a JPG, PNG, or WEBP photo.", "Fa JPG, PNG, anaa WEBP mfonini bra."));
      return;
    }
    try {
      const loaded = await loadImage(file);
      const blurry = photoIsBlurry(loaded.width, loaded.height, file.size) || loaded.width < 64 || loaded.height < 64;
      setPhoto({ preview: loaded.dataUrl, dataUrl: loaded.dataUrl, blurry });
      setFieldError(
        blurry
          ? tx(lang, "This photo is too small or blurry to read. Type the words you see.", "Mfonini yi sua anaa ɛyɛ hu. Kyerew nsɛm a wohu no.")
          : "",
      );
    } catch {
      setPhoto(null);
      setFieldError(tx(lang, "We can't read this photo. Type the words you see, then check.", "Yɛntumi nkenkan mfonini yi. Kyerew nsɛm a wohu no, na hwɛ bio."));
    }
  }

  async function pasteClipboard() {
    try {
      const value = await navigator.clipboard.readText();
      if (!value.trim()) {
        setPasteNote(tx(lang, "The clipboard is empty. Tap the box and paste.", "Clipboard no da hɔ. Mia adaka no na hyɛ mu."));
        return;
      }
      setText(value);
      setPasteNote("");
      setFieldError("");
    } catch {
      setPasteNote(tx(lang, "Your browser blocked clipboard access. Tap the box and paste.", "Browser no amma yɛanhyɛ mu. Mia adaka no na hyɛ mu."));
      document.getElementById(messageId)?.focus();
    }
  }

  function resetHome() {
    abortRef.current?.abort();
    window.speechSynthesis?.cancel();
    setHearing(false);
    setView("home");
  }

  const hints = prescanMessage(text);
  const showEvidence = view === "evidence" && result;
  const showResult = view === "result" && result;

  return (
    <Shell>
      {view === "home" || view === "offline" ? (
        <Home
          lang={lang}
          setLang={setLang}
          initialText={initialText}
          text={text}
          setText={(value) => {
            setText(value);
            if (fieldError) setFieldError("");
          }}
          fieldError={fieldError}
          pasteNote={pasteNote}
          messageId={messageId}
          errorId={errorId}
          hints={hints.map((chip) => chip.label)}
          photo={photo}
          onClearPhoto={() => setPhoto(null)}
          onFile={onFile}
          onPaste={() => void pasteClipboard()}
          onSubmit={() => submitText(false)}
          onExample={(id) => {
            const example = EXAMPLES.find((item) => item.id === id);
            if (!example) return;
            setText(example.text);
            setFieldError("");
            setPhoto(null);
            void run({ exampleId: id, text: example.text, language: lang });
          }}
          models={models}
          offline={view === "offline"}
          onRetryOffline={() => {
            if (!navigator.onLine) return;
            const job = jobRef.current;
            if (job) void run(job);
          }}
        />
      ) : null}

      {view === "checking" || view === "error" ? (
        <Checking
          lang={lang}
          text={text}
          steps={steps}
          slow={slow}
          elapsed={elapsed}
          failed={view === "error"}
          failure={failure}
          onCancel={resetHome}
          onRetry={() => {
            const job = jobRef.current;
            if (job) void run({ ...job, skipSearch: false });
          }}
          onSkipSearch={() => {
            const job = jobRef.current;
            if (job) void run({ ...job, skipSearch: true, imageDataUrl: undefined });
          }}
        />
      ) : null}

      {showResult ? (
        <ResultView
          lang={lang}
          result={result}
          hearing={hearing}
          onClose={resetHome}
          onEvidence={() => setView("evidence")}
          onHear={() => {
            if (hearing) {
              window.speechSynthesis.cancel();
              setHearing(false);
              return;
            }
            const utterance = new SpeechSynthesisUtterance(
              `${verdictWord(result.verdict, lang)}. ${result.headline}`,
            );
            utterance.lang = lang === "tw" ? "en-GH" : "en-GH";
            utterance.onend = () => setHearing(false);
            setHearing(true);
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
          }}
        />
      ) : null}

      {showEvidence ? <EvidenceView lang={lang} result={result} onBack={() => setView("result")} /> : null}
    </Shell>
  );
}

function seedSteps(hasPhoto: boolean, models: typeof FALLBACK_MODELS): ShownStep[] {
  const steps: ShownStep[] = [];
  if (hasPhoto) {
    steps.push({
      id: "extract",
      title: "Reading your screenshot",
      model: models.vision,
      provider: "nemotron",
      status: "active",
      output: "",
    });
  }
  steps.push(
    {
      id: "classify",
      title: "Reading the message",
      model: models.classify,
      provider: "nemotron",
      status: hasPhoto ? "pending" : "active",
      output: "",
    },
    {
      id: "search",
      title: "Searching the web for proof",
      model: "Tavily Search",
      provider: "tavily",
      status: "pending",
      output: "",
    },
    {
      id: "verdict",
      title: "Weighing the evidence",
      model: models.verdict,
      provider: "nemotron",
      status: "pending",
      output: "",
    },
    {
      id: "rules",
      title: "Picked your next steps",
      model: "scamcheck-rules",
      provider: "rules",
      status: "pending",
      output: "",
    },
  );
  return steps;
}

function Home(props: {
  lang: Lang;
  setLang: (lang: Lang) => void;
  initialText: string;
  text: string;
  setText: (value: string) => void;
  fieldError: string;
  pasteNote: string;
  messageId: string;
  errorId: string;
  hints: string[];
  photo: { preview: string; blurry: boolean } | null;
  onClearPhoto: () => void;
  onFile: (file: File | undefined) => void;
  onPaste: () => void;
  onSubmit: () => void;
  onExample: (id: string) => void;
  models: typeof FALLBACK_MODELS;
  offline: boolean;
  onRetryOffline: () => void;
}) {
  const { lang } = props;
  return (
    <div className="home-hero">
      <div>
        <div className="cluster" style={{ justifyContent: "space-between" }}>
          <p className="chip chip--info">
            <LockKeyhole className="icon-xs" aria-hidden strokeWidth={2} />
            {tx(lang, "Free · We never ask for your PIN", "Ɛyɛ free · Yɛmmisa wo PIN")}
          </p>
          <div className="seg" role="group" aria-label={tx(lang, "Language", "Kasa")}>
            <button type="button" aria-pressed={lang === "en"} onClick={() => props.setLang("en")}>
              EN
            </button>
            <button type="button" lang="tw" aria-pressed={lang === "tw"} onClick={() => props.setLang("tw")}>
              Twi
            </button>
          </div>
        </div>
        <p className="t-small t-muted mt-2">Twi is a beta translation. A native speaker has not checked it.</p>
        <h1 className="t-display mt-4">
          {tx(lang, "Strange message?", "Nkrasɛm a ɛyɛ nwanwa?")}
          <br />
          {tx(lang, "Check it first.", "Hwɛ ansa.")}
        </h1>
        {props.initialText ? (
          <p className="banner banner--info mt-4" role="status">
            <Info className="icon-sm mt-0.5" aria-hidden strokeWidth={2} />
            <span>This text was shared into ScamCheck. Read it, then check. We do not read your SMS inbox.</span>
          </p>
        ) : null}
        <p className="t-body-lg t-muted mt-4">
          {tx(
            lang,
            "Paste an SMS, WhatsApp or MoMo message. In about 10 seconds you’ll know if it looks like a scam, and what to do.",
            "Fa SMS, WhatsApp anaa MoMo nkrasɛm bra. Simma 10 mu wobɛte sɛ ɛte sɛ nnaadaa, ne nea wobɛyɛ.",
          )}
        </p>

        {props.offline ? (
          <div className="card p-5 text-center mt-5" role="status">
            <span className="mx-auto w-14 h-14 rounded-lg bg-surface-sunken grid place-items-center">
              <WifiOff className="icon-lg text-text-muted" aria-hidden strokeWidth={2} />
            </span>
            <p className="t-h3 mt-3">{tx(lang, "No internet right now", "Intanɛt nni hɔ seesei")}</p>
            <p className="t-muted mt-1">
              {tx(lang, "We saved your message on this phone. We’ll check it when you are back online.", "Yɛde nkrasɛm no asie wo fon yi so. Yɛbɛhwɛ sɛ intanɛt no san ba.")}
            </p>
            <div className="banner banner--info mt-4 text-left">
              <LockKeyhole className="icon-sm mt-0.5" aria-hidden strokeWidth={2} />
              <div>
                <strong>{tx(lang, "Until then", "Kosi saa berɛ no")}</strong>
                <p>{tx(lang, "Don’t send money or share your PIN.", "Mma wo ntua sika, na mma wo mfa wo PIN.")}</p>
              </div>
            </div>
            <button type="button" className="btn btn-primary btn-md btn-block mt-4" onClick={props.onRetryOffline}>
              <RefreshCw className="icon-sm" aria-hidden strokeWidth={2} />
              {tx(lang, "Try again", "Bɔ mmɔden bio")}
            </button>
          </div>
        ) : (
          <form
            className="card-raised p-4 mt-5"
            onSubmit={(event) => {
              event.preventDefault();
              props.onSubmit();
            }}
          >
            <label className="field-label" htmlFor={props.messageId}>
              {tx(lang, "Paste the message", "Fa nkrasɛm no hyɛ ha")}
            </label>
            <div className="relative">
              <textarea
                id={props.messageId}
                className={`textarea ${props.fieldError ? "input--error" : ""}`}
                style={{ minHeight: 104, paddingRight: 56 }}
                placeholder={tx(lang, "Long-press here, then tap Paste", "Mia ha, na hyɛ mu")}
                value={props.text}
                aria-invalid={props.fieldError ? true : undefined}
                aria-describedby={props.fieldError ? props.errorId : undefined}
                onChange={(event) => props.setText(event.target.value)}
              />
              <button
                type="button"
                className="btn btn-soft btn-icon absolute right-2 top-2"
                aria-label={tx(lang, "Paste from clipboard", "Fa firi clipboard")}
                onClick={props.onPaste}
              >
                <ClipboardPaste className="icon-sm" aria-hidden strokeWidth={2} />
              </button>
            </div>
            {props.fieldError ? (
              <p id={props.errorId} className="field-error" role="alert">
                <Info className="icon-sm" aria-hidden strokeWidth={2} />
                {props.fieldError}
              </p>
            ) : null}
            {props.pasteNote ? <p className="t-small t-muted mt-2">{props.pasteNote}</p> : null}
            {props.hints.length > 0 ? (
              <div className="mt-3" aria-live="polite">
                <p className="t-small t-muted cluster">
                  <Eye className="icon-xs" aria-hidden strokeWidth={2} />
                  {tx(lang, "We noticed:", "Yɛhunuu:")}
                </p>
                <div className="cluster mt-2">
                  {props.hints.map((hint) => (
                    <span key={hint} className="chip chip--suspicious">
                      {hint}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {props.photo ? (
              <div className="cluster mt-3">
                {/* Local preview of a file the person just picked. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="thumb" src={props.photo.preview} alt={tx(lang, "Your uploaded photo", "Wo mfonini")} />
                <div>
                  <p className="t-label">{props.photo.blurry ? tx(lang, "Photo is hard to read", "Mfonini no yɛ den akenkan") : tx(lang, "Photo added", "Mfonini no wɔ hɔ")}</p>
                  <p className="t-small t-muted">
                    {tx(lang, "Type or edit the words, then check. We do not read a photo in sample mode.", "Kyerew anaa sesa nsɛm no, na hwɛ. Sample mode nkenkan mfonini.")}
                  </p>
                  <button type="button" className="btn btn-ghost" onClick={props.onClearPhoto}>
                    {tx(lang, "Remove photo", "Yi mfonini no")}
                  </button>
                </div>
              </div>
            ) : null}
            <div className="cluster mt-3">
              <label className="btn btn-secondary btn-md">
                <Camera className="icon-sm" aria-hidden strokeWidth={2} />
                {tx(lang, "Photo", "Mfonini")}
                <input
                  className="visually-hidden-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => props.onFile(event.target.files?.[0])}
                />
              </label>
              <label className="btn btn-secondary btn-md">
                <ImageUp className="icon-sm" aria-hidden strokeWidth={2} />
                {tx(lang, "Screenshot", "Screenshot")}
                <input
                  className="visually-hidden-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => props.onFile(event.target.files?.[0])}
                />
              </label>
            </div>
            <button type="submit" className="btn btn-primary btn-lg btn-block mt-3">
              {tx(lang, "Check message", "Hwɛ nkrasɛm no")}
              <ArrowRight className="icon" aria-hidden strokeWidth={2} />
            </button>
            <p className="t-small t-muted text-center mt-2 cluster" style={{ justifyContent: "center" }}>
              <LockKeyhole className="icon-xs" aria-hidden strokeWidth={2} />
              {tx(lang, "Not saved to disk. A live check can add a masked number to Scam Radar.", "Yɛnsie no wɔ disk so. Check ankasa betumi de nɔma a yɛakata aka Scam Radar ho.")}
            </p>
          </form>
        )}

        <section className="mt-5" aria-labelledby="examples-heading">
          <h2 id="examples-heading" className="t-label">
            {tx(lang, "No message? Try one", "Nkrasɛm nni hɔ? Sɔ hwɛ")}
          </h2>
          <div className="scroll-x mt-2 pb-1">
            {EXAMPLES.map((example) => (
              <button key={example.id} type="button" className="chip-example chip" onClick={() => props.onExample(example.id)}>
                {example.label[lang]}
              </button>
            ))}
          </div>
        </section>
      </div>

      <aside className="preview-only" aria-label={tx(lang, "Example result", "Mmuae nhwɛso")}>
        <div className="sms shadow-md">
          <p className="sms-meta">
            <MessageSquareText className="icon-xs" aria-hidden strokeWidth={2} />
            SMS
            <span className="tag-example ml-auto">EXAMPLE</span>
          </p>
          <p>Cash In received for GHS 1,250… kindly send it back to 024 555 0123.</p>
        </div>
        <section className="verdict verdict--scam mt-4" aria-label="Example verdict">
          <span className="badge verdict-badge">
            <OctagonX className="icon-xs" aria-hidden strokeWidth={2} />
            Example
          </span>
          <p className="t-verdict">Scam</p>
          <p className="verdict-headline">Do not send the money back.</p>
          <div className="meter">
            <div className="meter-head">
              <span>How sure we are</span>
              <b>Very sure</b>
            </div>
            <div className="meter-bar" aria-hidden="true">
              <i className="on" />
              <i className="on" />
              <i className="on" />
              <i className="on" />
            </div>
          </div>
        </section>
      </aside>

      <section className="mt-10" style={{ gridColumn: "1 / -1" }} aria-labelledby="gaps-heading">
        <p className="t-overline t-muted">Why it is different</p>
        <h2 id="gaps-heading" className="t-h2 mt-1">A Ghana answer, not a vague warning</h2>
        <div className="steps-3 mt-5">
          <article className="card p-5">
            <p className="t-label">Built for Ghana</p>
            <p className="t-muted mt-2">Android’s scam detection lists no African country. This check knows MoMo reversals, *170#, and CSA 292.</p>
          </article>
          <article className="card p-5">
            <p className="t-label">Four clear bands</p>
            <p className="t-muted mt-2">Safe, Caution, Scam, or Can’t tell. Not “likely suspicious”.</p>
          </article>
          <article className="card p-5">
            <p className="t-label">Fewer false alarms</p>
            <p className="t-muted mt-2">A normal MoMo receipt can stay Safe. A vague note stays Can’t tell instead of a warning.</p>
          </article>
        </div>
        <p className="cluster mt-4">
          <Link className="btn btn-secondary btn-md" href="/radar">Scam Radar</Link>
          <Link className="btn btn-secondary btn-md" href="/family">Check for Mum</Link>
          <Link className="btn btn-secondary btn-md" href="/shield">My Shield</Link>
          <Link className="btn btn-secondary btn-md" href="/digest">This week</Link>
          <Link className="btn btn-secondary btn-md" href="/whatsapp">WhatsApp bot</Link>
        </p>
      </section>

      <section className="mt-10" style={{ gridColumn: "1 / -1" }} aria-labelledby="how-heading">
        <p className="t-overline t-muted">{tx(lang, "How it works", "Ɛyɛ adwuma sɛnea")}</p>
        <h2 id="how-heading" className="t-h2 mt-1">
          {tx(lang, "Three steps. No sign-up.", "Anamɔn mmiɛnsa. Wɔnhyɛ din.")}
        </h2>
        <ol className="steps-3 mt-5">
          <li className="card p-5">
            <span className="onb-num">1</span>
            <p className="t-h3 mt-4">{tx(lang, "Paste it or snap it", "Hyɛ mu anaa fa mfonini")}</p>
            <p className="t-muted mt-2">{tx(lang, "SMS, WhatsApp, or a MoMo screen.", "SMS, WhatsApp, anaa MoMo screen.")}</p>
          </li>
          <li className="card p-5">
            <span className="onb-num">2</span>
            <p className="t-h3 mt-4">{tx(lang, "We read it and search", "Yɛkenkan na yɛhwehwɛ")}</p>
            <p className="t-muted mt-2">{tx(lang, "Nemotron reads the message. Tavily searches public warnings.", "Nemotron kenkan nkrasɛm no. Tavily hwehwɛ afotu.")}</p>
          </li>
          <li className="card p-5">
            <span className="onb-num">3</span>
            <p className="t-h3 mt-4">{tx(lang, "You get a clear answer", "Wubenya mmuae a ɛda hɔ")}</p>
            <p className="t-muted mt-2">{tx(lang, "Safe, Caution, Scam, or Can't tell, plus the numbers to call.", "Safe, Caution, Scam, anaa Can't tell, ne nɔma a wobɛfrɛ.")}</p>
          </li>
        </ol>
      </section>

      <section className="mt-8" style={{ gridColumn: "1 / -1" }} aria-labelledby="who-heading">
        <div className="card p-5">
          <p className="t-overline t-muted">{tx(lang, "Open about our AI", "AI a yɛde yɛ adwuma")}</p>
          <h2 id="who-heading" className="t-h3 mt-1">
            {tx(lang, "Who checks your message", "Hena na ɔhwɛ wo nkrasɛm")}
          </h2>
          <ul className="who-grid mt-4">
            <li className="flex gap-3 items-start">
              <div>
                <p className="model model--nemotron">Nemotron</p>
                <p className="t-label mt-1">Nemotron reads it</p>
                <p className="model-id mt-1">{props.models.classify}</p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <div>
                <p className="model model--tavily">Tavily</p>
                <p className="t-label mt-1">Tavily searches the web</p>
                <p className="t-small t-muted">Public warnings from CSA, networks, and news.</p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <div>
                <p className="model">Rules</p>
                <p className="t-label mt-1">Rules pick the numbers</p>
                <p className="model-id mt-1">scamcheck-rules</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-6" style={{ gridColumn: "1 / -1" }} aria-labelledby="sos-heading">
        <div className="card">
          <h2 id="sos-heading" className="t-h3">
            {tx(lang, "Already sent money?", "Wode sika akɔ dedaw?")}
          </h2>
          <p className="t-muted mt-1">
            {tx(lang, "Act fast. Call your network first, then report it.", "Yɛ ntɛm. Frɛ wo network ansa, na bɔ amanneɛ.")}
          </p>
          <a className="btn btn-primary btn-md btn-block mt-4" href={OFFICIAL_CONTACTS.csaHref} style={{ justifyContent: "flex-start" }}>
            <Phone className="icon-sm" aria-hidden strokeWidth={2} />
            <span>
              <span className="block">{tx(lang, "Call or text 292", "Frɛ anaa SMS 292")}</span>
              <span className="block t-small font-normal">Cyber Security Authority, 24 hours</span>
            </span>
          </a>
        </div>
      </section>
    </div>
  );
}

function Checking(props: {
  lang: Lang;
  text: string;
  steps: ShownStep[];
  slow: boolean;
  elapsed: number;
  failed: boolean;
  failure: string;
  onCancel: () => void;
  onRetry: () => void;
  onSkipSearch: () => void;
}) {
  const done = props.steps.filter((step) => step.status === "done" || step.status === "skipped" || step.status === "error").length;
  const total = Math.max(props.steps.length, 1);
  return (
    <div className="col-narrow">
      <header className="cluster" style={{ justifyContent: "space-between" }}>
        <button type="button" className="btn btn-ghost btn-icon text-text" aria-label={props.lang === "tw" ? "Gyae" : "Cancel"} onClick={props.onCancel}>
          <X className="icon" aria-hidden strokeWidth={2} />
        </button>
        <p className="t-label">{props.failed ? tx(props.lang, "Check stopped", "Check no agyae") : tx(props.lang, "Checking", "Yɛrehwɛ")}</p>
        <span className="latency" aria-label={tx(props.lang, "Time so far", "Bere a etwa")}>
          <Clock className="icon-xs" aria-hidden strokeWidth={2} />
          {formatMs(props.elapsed)}
        </span>
      </header>
      {props.text ? (
        <div className="sms mt-4">
          <p className="sms-meta">
            <MessageSquareText className="icon-xs" aria-hidden strokeWidth={2} />
            {tx(props.lang, "Your message", "Wo nkrasɛm")}
          </p>
          <p className="line-clamp-2">{props.text}</p>
        </div>
      ) : null}
      <h1 className="t-h2 mt-5" aria-live="polite">
        {props.failed ? props.failure : tx(props.lang, "Checking your message…", "Yɛrehwɛ wo nkrasɛm…")}
      </h1>
      <div
        className="progress mt-3"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={tx(props.lang, `Step ${Math.min(done + 1, total)} of ${total}`, `Anamɔn ${Math.min(done + 1, total)} wɔ ${total} mu`)}
      >
        <span style={{ width: `${Math.round((done / total) * 100)}%` }} />
      </div>
      {props.slow && !props.failed ? (
        <div className="banner banner--warn mt-4" role="status">
          <Clock className="icon-sm mt-0.5" aria-hidden strokeWidth={2} />
          <div>
            <strong>{tx(props.lang, "Still checking…", "Yɛrehwɛ ara…")}</strong>
            <p>{tx(props.lang, "Your network is slow. Keep this page open.", "Wo network no yɛ slow. Ma kratafa yi ntena hɔ.")}</p>
          </div>
        </div>
      ) : null}
      <ol className="trace mt-5" aria-label={tx(props.lang, "What the check is doing", "Nea check no reyɛ")}>
        {props.steps.map((step) => (
          <li
            key={step.id}
            className={`step ${step.status === "done" ? "step--done" : ""} ${step.status === "active" ? "step--active" : ""} ${step.status === "error" ? "step--error" : ""} ${step.status === "pending" ? "step--pending" : ""}`}
            aria-current={step.status === "active" ? "step" : undefined}
          >
            <span className="dot" aria-hidden="true" />
            <div>
              <p>{step.title}</p>
              <p className="mt-1 cluster">
                <ModelChip provider={step.provider} model={step.model} />
                <Timing step={step} />
              </p>
              <p className="model-id mt-1">{step.model === "scamcheck-rules" ? "ScamCheck rules · no AI" : step.model}</p>
              {step.status === "active" && !step.output ? (
                <div className="step-body card-sunken p-3" aria-hidden>
                  <span className="skeleton" style={{ display: "block", height: 14, width: "70%" }} />
                </div>
              ) : null}
              {step.output ? (
                <div className={`step-body card-sunken p-3 t-small ${step.status === "active" ? "caret" : ""}`}>{step.output}</div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      {props.failed ? (
        <div className="mt-5">
          <button type="button" className="btn btn-primary btn-md btn-block" onClick={props.onRetry}>
            <RefreshCw className="icon-sm" aria-hidden strokeWidth={2} />
            {tx(props.lang, "Try again", "Bɔ mmɔden bio")}
          </button>
          <button type="button" className="btn btn-ghost btn-block mt-1" onClick={props.onSkipSearch}>
            {tx(props.lang, "Answer without web search", "Mmuae a yɛanhwehwɛ wɛb")}
          </button>
        </div>
      ) : (
        <div className="banner banner--info mt-5">
          <LockKeyhole className="icon-sm mt-0.5" aria-hidden strokeWidth={2} />
          <div>
            <strong>{tx(props.lang, "While you wait", "Bere a woretwɛn")}</strong>
            <p>{tx(props.lang, "MTN, Telecel and AT will never ask for your MoMo PIN.", "MTN, Telecel ne AT remmisa wo MoMo PIN da.")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Timing({ step }: { step: ShownStep }) {
  if (step.status === "active") return <span className="latency">{txAmount()}</span>;
  if (step.status === "pending") return null;
  if (step.status === "skipped" || step.model === "scamcheck-rules" || (step.ms ?? 0) < 20) {
    return <span className="latency">{step.status === "skipped" ? "Not called" : "No AI"}</span>;
  }
  return <span className="latency">{formatMs(step.ms ?? 0)}</span>;
}

function txAmount() {
  return (
    <>
      <LoaderCircle className="icon-xs spin" aria-hidden strokeWidth={2} /> live
    </>
  );
}

function ModelChip({ provider, model }: { provider: Provider; model: string }) {
  const kind = provider === "tavily" ? "model--tavily" : provider === "nemotron" ? "model--nemotron" : "";
  return <span className={`model ${kind}`}>{modelShortName(model)}</span>;
}

function ResultView(props: {
  lang: Lang;
  result: CheckResult;
  hearing: boolean;
  onClose: () => void;
  onEvidence: () => void;
  onHear: () => void;
}) {
  const { lang } = props;
  const marksRaw = useSyncExternalStore(subscribeNotScam, notScamSnapshot, () => "[]");
  const marks = readNotScamMarks(marksRaw);
  const savedMark = marks.some((mark) => mark.key === notScamKey(props.result.pattern));
  const decision = applyNotScam({
    verdict: props.result.verdict,
    confidence: props.result.confidence,
    pattern: props.result.pattern,
    text: props.result.inputText,
    hasSecretSignal: props.result.precheck?.signals.some((signal) => signal.id === "secret"),
    marks,
  });
  const result: CheckResult = decision.applied
    ? {
        ...props.result,
        verdict: decision.verdict,
        confidence: decision.confidence,
        actions: buildActions(decision.verdict, props.result.pattern, props.result.entities, lang, props.result.inputText),
      }
    : props.result;
  const meter = confidenceMeter(result.confidence);
  const tone = result.verdict === "scam" ? "scam" : result.verdict === "suspicious" ? "suspicious" : result.verdict === "looks_ok" ? "ok" : "unsure";
  const groups = groupActions(result.actions);
  const nemotronSteps = result.trace.filter((step) => step.provider === "nemotron").length;
  const sourceCount = result.evidence.length;
  return (
    <div>
      <header className="cluster" style={{ justifyContent: "space-between" }}>
        <button type="button" className="btn btn-ghost btn-icon text-text" aria-label={tx(lang, "Close and check another", "Yi na hwɛ foforo")} onClick={props.onClose}>
          <X className="icon" aria-hidden strokeWidth={2} />
        </button>
        <p className="t-label">{tx(lang, "Your answer", "Wo mmuae")}</p>
        <button type="button" className="btn btn-ghost btn-icon text-text" aria-label={props.hearing ? tx(lang, "Stop reading", "Gyae") : tx(lang, "Hear this answer", "Tie mmuae no")} onClick={props.onHear}>
          {props.hearing ? <X className="icon" aria-hidden strokeWidth={2} /> : <Volume2 className="icon" aria-hidden strokeWidth={2} />}
        </button>
      </header>
      <div className="result-grid mt-4">
        <div>
          <section className={`verdict ${tone === "unsure" ? "" : `verdict--${tone}`}`} role="status" aria-live="polite" aria-labelledby="verdict-title">
            <span className="badge verdict-badge">
              <VerdictIcon verdict={result.verdict} />
              {tx(lang, "Verdict", "Mmuae")}
            </span>
            <h1 id="verdict-title" className="t-verdict" tabIndex={-1}>
              {verdictPanelWord(result.verdict, lang)}
            </h1>
            <p className="verdict-headline">{result.headline}</p>
            <div className="meter">
              <div className="meter-head">
                <span>{tx(lang, "How sure we are", "Sɛnea yɛgye di")}</span>
                <b>{lang === "tw" ? confidenceWords(result.confidence, "tw") : meter.words}</b>
              </div>
              <div className="meter-bar" aria-hidden="true">
                {[0, 1, 2, 3].map((index) => (
                  <i key={index} className={index < meter.segments ? "on" : undefined} />
                ))}
              </div>
            </div>
          </section>
          <div className="card mt-4">
              <button type="button" className="mt-4 flex items-center gap-2 flex-wrap t-small text-text" onClick={props.onEvidence}>
                <ModelChip provider="nemotron" model={result.trace.find((step) => step.provider === "nemotron")?.model || "Nemotron"} />
                <span className="model model--tavily">Tavily · {sourceCount}</span>
                <span className="ml-auto inline-flex items-center font-bold text-link">
                  {tx(lang, "How we checked", "Sɛnea yɛhwɛe")}
                  <ArrowRight className="icon-xs" aria-hidden strokeWidth={2} />
                </span>
              </button>
              <p className="t-small t-muted mt-2">{nemotronSteps} Nemotron {nemotronSteps === 1 ? "step" : "steps"} · rules added the numbers</p>
            </div>
          {result.checkedWithoutWeb ? (
            <div className="banner banner--warn mt-4" role="status">
              <Info className="icon-sm mt-0.5" aria-hidden strokeWidth={2} />
              <div>
                <strong>{tx(lang, "Checked without web sources", "Yɛanhwehwɛ wɛb")}</strong>
                <p>{tx(lang, "This answer did not use a web search.", "Mmuae yi amfa wɛb nhwehwɛ.")}</p>
              </div>
            </div>
          ) : null}
          {result.mode === "demo" ? (
            <div className="banner banner--info mt-4">
              <Info className="icon-sm mt-0.5" aria-hidden strokeWidth={2} />
              <div>
                <strong>{tx(lang, "Sample check", "Check nhwɛso")}</strong>
                <p>{tx(lang, "Nemotron and Tavily were not called. The pages below are saved official links.", "Yɛanfrɛ Nemotron anaa Tavily. Kratafa no yɛ nkratafa a yɛsiee.")}</p>
              </div>
            </div>
          ) : null}
          {(result.patternMatches && result.patternMatches.length > 0) || result.patternMatch ? (
            <section className="mt-4" aria-labelledby="matches-heading">
              <h2 id="matches-heading" className="t-label">
                Matches
              </h2>
              <ul className="card mt-2 overflow-hidden">
                {(result.patternMatches && result.patternMatches.length > 0 ? result.patternMatches : result.patternMatch ? [result.patternMatch] : []).map((match, index) => (
                  <li className="action" key={match.id}>
                    <span className="action-num">{index + 1}</span>
                    <div>
                      <p className="action-title">{match.title}</p>
                      <p className="t-muted mt-1">
                        {match.source}, {match.year}
                        {index === 0 ? " · closest" : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {result.precheck?.signals.some((signal) => signal.id === "thread") ? (
            <p className="t-small mt-3">This chat turns into a payment in the later lines. Romance and job scams often change halfway through.</p>
          ) : null}
          {result.radarHits && result.radarHits.length > 0 ? (
            <ul className="mt-3" aria-label="Radar reports">
              {result.radarHits.map((hit) => (
                <li key={`${hit.kind}-${hit.label}`}>
                  <Link className="text-link" href="/radar">
                    {hit.kind === "number" ? `This number ${hit.label}` : hit.label} was reported {hit.count} {hit.count === 1 ? "time" : "times"}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {decision.note ? (
            <div className={`banner ${decision.tone === "warn" ? "banner--warn" : "banner--info"} mt-4`} role="status">
              <Info className="icon-sm mt-0.5" aria-hidden strokeWidth={2} />
              <p>{decision.note}</p>
            </div>
          ) : null}
          <button
            type="button"
            className="btn btn-secondary btn-md btn-block mt-4"
            onClick={() =>
              saveNotScamMark({
                key: notScamKey(props.result.pattern),
                pattern: props.result.pattern,
                at: new Date().toISOString(),
                label: props.result.patternLabel,
              })
            }
          >
            {savedMark ? "Saved on this phone" : "Not a scam"}
          </button>
          <p className="t-small t-muted mt-2">Saves on this phone only. It can soften the next similar official alert. It cannot hide a PIN request.</p>
          {result.precheck && result.precheck.signals.length > 0 ? (
            <ul className="cluster mt-3" aria-label="Pre-check signals">
              {result.precheck.signals.map((signal) => (
                <li key={signal.id} className={signal.points > 0 ? "chip chip--suspicious" : "chip chip--ok"}>
                  {signal.points > 0 ? `+${signal.points}` : signal.points} {signal.label}
                </li>
              ))}
            </ul>
          ) : null}
          {result.consistency ? <p className="t-small t-muted mt-3">{result.consistency.note}</p> : null}
          {result.route ? (
            <p className="t-small t-muted mt-2">
              {result.route.reason} About ${result.route.estimatedUsd.toFixed(4)} if the models had run. Ultra is not used.
            </p>
          ) : null}
          {result.grounding ? <p className="t-small t-muted mt-2">{result.grounding.note}</p> : null}
          {result.verdict === "scam" || result.verdict === "suspicious" ? (
            <Link className="btn btn-secondary btn-md btn-block mt-4" href={cardQuery({ verdict: result.verdict, headline: result.headline, pattern: result.patternLabel, lang })}>
              Send a card to Mum
            </Link>
          ) : null}
          <section className="mt-6" aria-labelledby="todo-heading">
            <h2 id="todo-heading" className="t-h2">
              {tx(lang, "What to do now", "Nea wobɛyɛ seesei")}
            </h2>
            <ActionList lang={lang} groups={groups} verdict={result.verdict} />
          </section>
        </div>
        <div>
          <section aria-labelledby="why-heading">
            <h2 id="why-heading" className="t-h2">
              {tx(lang, "Why we think so", "Aden nti")}
            </h2>
            <p className="sms mt-3" aria-label={tx(lang, "Phrases that mattered", "Nsɛm a ɛho hia")}>
              {highlightSpans(
                result.inputText,
                highlightNeedles(result.inputText, result.precheck?.lookalikes.map((hit) => hit.token) ?? []),
              ).map((part, index) =>
                part.hit ? (
                  <mark key={index} className="flag">
                    {part.text}
                  </mark>
                ) : (
                  <span key={index}>{part.text}</span>
                ),
              )}
            </p>
            <div className="card mt-3 px-4">
              {result.reasoning.map((reason) => (
                <div className="reason" key={reason}>
                  <span className={`reason-icon ${tone === "ok" ? "reason-icon--ok" : tone === "suspicious" || tone === "unsure" ? "reason-icon--warn" : ""}`}>
                    <Info className="icon-sm" aria-hidden strokeWidth={2} />
                  </span>
                  <p>{reason}</p>
                </div>
              ))}
            </div>
            {result.evidence.length > 0 ? (
              <div className="mt-4">
                {result.evidence.map((item, index) => (
                  <a key={item.url} className="source" href={item.url} target="_blank" rel="noreferrer">
                    <span className="source-fav">{index + 1}</span>
                    <span>
                      <span className="source-title">{item.title}</span>
                      <span className="source-host">{hostOf(item.url)}</span>
                    </span>
                    <ExternalLink className="icon-xs text-text-muted" aria-hidden strokeWidth={2} />
                  </a>
                ))}
                <p className="t-small t-muted mt-3">{result.evidenceNote}</p>
              </div>
            ) : null}
            <button type="button" className="btn btn-soft btn-md btn-block mt-4" onClick={props.onEvidence}>
              <Scale className="icon-sm" aria-hidden strokeWidth={2} />
              {tx(lang, "See the AI steps", "Hwɛ AI anamɔn no")}
            </button>
          </section>
          <p className="t-small t-muted mt-6">
            {tx(lang, "AI can be wrong. When in doubt, call your network on", "AI betumi ayɛ mfomso. Sɛ wogyina akyi a, frɛ wo network wɔ")} <strong className="text-text">100</strong>.
          </p>
          <p className="t-small t-muted mt-2">
            {result.retention === "none"
              ? tx(lang, "Not saved.", "Yɛansie no.")
              : tx(lang, "Not saved to disk. A repeat check may reuse the answer from memory for 15 minutes.", "Yɛnsie no wɔ disk so. Check a wobɛsan ayɛ no betumi de mmuae a ɛwɔ memory mu adi dwuma simma 15.")}
          </p>
          <button type="button" className="btn btn-primary btn-lg btn-block mt-4" onClick={props.onClose}>
            {tx(lang, "Check another message", "Hwɛ nkrasɛm foforo")}
          </button>
        </div>
      </div>
    </div>
  );
}

function groupActions(actions: ActionItem[]): ActionItem[][] {
  const map = new Map<number, ActionItem[]>();
  for (const action of actions) {
    const key = action.group ?? 0;
    map.set(key, [...(map.get(key) ?? []), action]);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map((entry) => entry[1]);
}

function ActionList({ groups, verdict }: { lang: Lang; groups: ActionItem[][]; verdict: Verdict }) {
  return (
    <ol className="card mt-3 overflow-hidden">
      {groups.map((items, index) => {
        const first = items[0];
        return (
          <li className="action" key={`${first.title}-${index}`}>
            <span className={`action-num ${first.kind === "stop" ? "action-num--stop" : ""}`}>{index + 1}</span>
            <div>
              <p className="action-title">{first.title}</p>
              {first.kind === "stop" || first.kind === "note" ? <p className="t-muted mt-1">{first.detail}</p> : null}
              {items.map((item) =>
                item.kind === "dial" && item.href ? (
                  <a key={`${item.dial}-${item.href}`} className="call" href={item.href}>
                    <span className="call-icon">
                      <Phone className="icon-sm" aria-hidden strokeWidth={2} />
                    </span>
                    <span>
                      <strong>{item.dial}</strong>
                      <span className="sub">{item.sub}</span>
                    </span>
                  </a>
                ) : item.kind === "placeholder" ? (
                  <div key={item.dial} className="call">
                    <span className="call-icon">
                      <Info className="icon-sm" aria-hidden strokeWidth={2} />
                    </span>
                    <span>
                      <strong>
                        <span className="placeholder-num">{item.dial}</span>
                      </strong>
                      <span className="sub">{item.sub}</span>
                    </span>
                  </div>
                ) : null,
              )}
              {items.some((item) => item.kind === "share") ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-md btn-block mt-2"
                  onClick={() => {
                    const warning = `ScamCheck GH: this message looks like a ${verdictWord(verdict, "en")}. Do not send money or share your PIN.`;
                    if (navigator.share) {
                      void navigator.share({ text: warning }).catch(() => undefined);
                      return;
                    }
                    window.open(`https://wa.me/?text=${encodeURIComponent(warning)}`, "_blank", "noopener,noreferrer");
                  }}
                >
                  <Share2 className="icon-sm" aria-hidden strokeWidth={2} />
                  Share warning on WhatsApp
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function VerdictIcon({ verdict }: { verdict: Verdict }) {
  if (verdict === "scam") return <OctagonX className="icon-xs" aria-hidden strokeWidth={2} />;
  if (verdict === "suspicious") return <TriangleAlert className="icon-xs" aria-hidden strokeWidth={2} />;
  if (verdict === "looks_ok") return <CircleCheckBig className="icon-xs" aria-hidden strokeWidth={2} />;
  return <CircleHelp className="icon-xs" aria-hidden strokeWidth={2} />;
}

function EvidenceView({ lang, result, onBack }: { lang: Lang; result: CheckResult; onBack: () => void }) {
  const total = result.trace.reduce((sum, step) => sum + Math.max(step.ms ?? step.durationMs, 1), 0);
  const measured = result.trace.some((step) => (step.ms ?? step.durationMs) >= 50);
  return (
    <div className="col-narrow">
      <header className="cluster" style={{ justifyContent: "space-between" }}>
        <button type="button" className="btn btn-ghost btn-icon text-text" aria-label={tx(lang, "Back to the answer", "San kɔ mmuae no")} onClick={onBack}>
          <ArrowLeft className="icon" aria-hidden strokeWidth={2} />
        </button>
        <p className="t-label">{tx(lang, "How we checked", "Sɛnea yɛhwɛe")}</p>
        <span className="w-12" />
      </header>
      <h1 className="t-h1 mt-3">{tx(lang, "Which AI did what", "AI biara yɛɛ deɛn")}</h1>
      <p className="t-muted mt-1">{tx(lang, "Every step, in order. The model id is the one this server is set to call.", "Anamɔn biara. Model ID no ne nea server yi de frɛ.")}</p>
      {measured ? (
        <section className="card p-4 mt-5" aria-label={tx(lang, "Time spent", "Bere a wɔde yɛɛ")}>
          <div className="split" aria-hidden="true">
            {result.trace.map((step) => (
              <span
                key={step.id}
                className={step.provider === "tavily" ? "split-tavily" : step.provider === "rules" ? "split-app" : "split-nemotron"}
                style={{ flex: Math.max(step.ms ?? step.durationMs, 1) / total }}
              />
            ))}
          </div>
        </section>
      ) : (
        <p className="t-small t-muted mt-4">{tx(lang, "Sample check, so these steps were not timed against a live model.", "Ɛyɛ check nhwɛso, enti yɛanmmɛ bere no wɔ model ankasa so.")}</p>
      )}
      <ol className="tl mt-6">
        {result.trace.map((step) => (
          <TimelineItem key={step.id} step={step} />
        ))}
      </ol>
      {result.evidence.length > 0 ? (
        <section className="mt-6" aria-labelledby="sources-heading">
          <h2 id="sources-heading" className="t-h3">
            {tx(lang, "Sources", "Nkratafa")}
          </h2>
          <div className="mt-3">
            {result.evidence.map((item, index) => (
              <a key={item.url} id={`source-${index + 1}`} className="source" href={item.url} target="_blank" rel="noreferrer">
                <span className="source-fav">{index + 1}</span>
                <span>
                  <span className="source-title">{item.title}</span>
                  <span className="source-host">{hostOf(item.url)}</span>
                </span>
                <ExternalLink className="icon-xs text-text-muted" aria-hidden strokeWidth={2} />
              </a>
            ))}
          </div>
          <p className="t-small t-muted mt-3">{result.evidenceNote}</p>
        </section>
      ) : null}
      <p className="t-small t-muted mt-6">
        {tx(
          lang,
          "Not saved to disk. We do not keep a copy of your message after the check, apart from a 15-minute memory cache of the answer when live mode is on.",
          "Yɛnsie no wɔ disk so.",
        )}
      </p>
    </div>
  );
}

function TimelineItem({ step }: { step: TraceStep }) {
  const provider = step.provider === "tavily" ? "tavily" : step.provider === "rules" ? "rules" : "nemotron";
  return (
    <li className="tl-item">
      <div className="flex items-center justify-between gap-2">
        <p className="t-label">{step.label || step.title}</p>
        <span className="latency">{step.status === "skipped" ? "Not called" : step.model === "scamcheck-rules" ? "No AI" : (step.ms ?? 0) >= 20 ? formatMs(step.ms ?? step.durationMs) : "Sample"}</span>
      </div>
      <p className={`model ${provider === "tavily" ? "model--tavily" : provider === "nemotron" ? "model--nemotron" : ""}`}>{modelShortName(step.model)}</p>
      <div className="card mt-3 p-3">
        <dl className="io">
          {step.input ? (
            <>
              <dt>In</dt>
              <dd>{step.input}</dd>
            </>
          ) : null}
          <dt>Out</dt>
          <dd>{step.output || step.summary}</dd>
        </dl>
        <p className="model-id mt-3">{step.model}</p>
      </div>
    </li>
  );
}
