import { MODEL_IDS } from "./budget";
import { buildActions } from "./official";
import { confidenceWords, patternLabel, reasons, safeHeadline, verdictWord } from "./copy";
import { evidenceNote, sampleEvidence } from "./evidence";
import { inspectMessage } from "./precheck";
import { chooseRoute } from "./routing";
import type { Analysis, CheckResult, EvidenceItem, Entities, Lang, PrecheckReport, TraceStep } from "./types";

export function presentDemo(
  analysis: Analysis,
  text: string,
  lang: Lang,
  options: {
    extractedFromImage: boolean;
    imageIgnored: boolean;
    skipSearch?: boolean;
  },
): CheckResult {
  const precheck = inspectMessage(text);
  const maxAmount = precheck.amountsGhs.length > 0 ? Math.max(...precheck.amountsGhs) : null;
  const route = chooseRoute({ confidence: analysis.confidence, maxAmountGhs: maxAmount, points: precheck.points });
  const evidence = options.skipSearch ? [] : sampleEvidence(analysis.pattern);
  const entityLine = describeEntities(analysis.entities, lang);
  const trace: TraceStep[] = [];

  if (options.extractedFromImage) {
    trace.push({
      id: "extract",
      title: lang === "tw" ? "Kenkan wo mfonini" : "Reading your screenshot",
      label: lang === "tw" ? "Kenkan wo mfonini" : "Reading your screenshot",
      model: MODEL_IDS.vision,
      provider: "nemotron",
      status: "skipped",
      durationMs: 0,
      ms: 0,
      summary:
        lang === "tw"
          ? "Demo mode ankenkan mfonini no."
          : "Demo mode did not read the photo.",
      input: "Photo",
      output: lang === "tw" ? "Yɛankenkan mfonini no." : "The photo was not sent to a model.",
    });
  }

  trace.push(precheckTrace(precheck, lang));
  trace.push(
    {
      id: "classify",
      title: lang === "tw" ? "Kenkan nkrasɛm no" : "Reading the message",
      label: lang === "tw" ? "Kenkan nkrasɛm no" : "Reading the message",
      model: route.classifyModel,
      provider: "nemotron",
      status: "done",
      durationMs: 1,
      ms: 1,
      summary:
        lang === "tw"
          ? `Demo nhyehyɛe huu: ${patternLabel.tw[analysis.pattern]}. ${route.classifyModel} anyɛ saa check yi.`
          : `Demo rules found: ${patternLabel.en[analysis.pattern]}. ${route.classifyModel} did not run this check.`,
      input: lang === "tw" ? `Nkrasɛm, nkyerɛwde ${text.length}` : `Message text, ${text.length} characters`,
      output: entityLine || analysis.signals.join(" "),
      detail: analysis.signals.join(" "),
    },
    {
      id: "search",
      title: lang === "tw" ? "Hwehwɛ wɛb no" : "Searching the web for proof",
      label: lang === "tw" ? "Hwehwɛ wɛb no" : "Searching the web for proof",
      model: "Tavily Search",
      provider: "tavily",
      status: "skipped",
      durationMs: 0,
      ms: 0,
      summary: options.skipSearch
        ? lang === "tw"
          ? "Yɛanhwehwɛ wɛb no."
          : "Checked without web sources."
        : lang === "tw"
          ? "Tavily anyɛ hwehwɛ. Kratafa a yɛakora so na ɛwɔ ase hɔ."
          : "Tavily did not search. Saved official pages are listed below.",
      input: lang === "tw" ? "Hwehwɛ a ɛfa nnaadaa no ho" : "Scam-pattern search",
      output: options.skipSearch
        ? lang === "tw"
          ? "Yɛanhwehwɛ wɛb no."
          : "Checked without web sources."
        : lang === "tw"
          ? "Tavily anyɛ adwuma."
          : "Tavily did not run. Sample pages only.",
    },
    {
      id: "verdict",
      title: lang === "tw" ? "Susuw adanse no" : "Weighing the evidence",
      label: lang === "tw" ? "Susuw adanse no" : "Weighing the evidence",
      model: route.verdictModel,
      provider: "nemotron",
      status: "done",
      durationMs: 1,
      ms: 1,
      summary:
        lang === "tw"
          ? `${verdictWord(analysis.verdict, "tw")}. ${confidenceWords(analysis.confidence, "tw")}. ${route.verdictModel} ankyerɛw saa mmuae yi.`
          : `${verdictWord(analysis.verdict, "en")}. ${confidenceWords(analysis.confidence, "en")}. ${route.verdictModel} did not write this answer.`,
      input: lang === "tw" ? "Nkrasɛm no ne adanse" : "Message facts and sources",
      output: `${verdictWord(analysis.verdict, lang)}. ${safeHeadline(analysis.verdict, analysis.pattern, lang)}`,
    },
  );

  return {
    verdict: analysis.verdict,
    confidence: analysis.confidence,
    pattern: analysis.pattern,
    patternLabel: patternLabel[lang][analysis.pattern],
    headline: safeHeadline(analysis.verdict, analysis.pattern, lang),
    reasoning: reasons[lang][analysis.pattern],
    entities: analysis.entities,
    evidence,
    evidenceNote: evidenceNote(options.skipSearch ? "none" : "sample", lang),
    actions: buildActions(analysis.verdict, analysis.pattern, analysis.entities, lang, text),
    trace,
    language: lang,
    mode: "demo",
    inputText: text,
    extractedFromImage: options.extractedFromImage,
    retention: "memory",
    checkedWithoutWeb: Boolean(options.skipSearch),
    demoNote: options.imageIgnored
      ? lang === "tw"
        ? "DEMO MODE. Mfonini no tenaa wo fon so. Yɛmfaa nkrasɛm yi anko Nemotron anaa Tavily."
        : "DEMO MODE. The photo stayed on your device. This check did not call Nemotron or Tavily."
      : lang === "tw"
        ? "DEMO MODE. Yɛmfaa nkrasɛm yi anko Nemotron anaa Tavily."
        : "DEMO MODE. This check did not call Nemotron or Tavily.",
  };
}

export function fallbackFromAnalysis(
  analysis: Analysis,
  text: string,
  lang: Lang,
  trace: TraceStep[],
  evidence: EvidenceItem[],
  extractedFromImage: boolean,
): CheckResult {
  const origin = evidence.some((item) => item.origin === "tavily")
    ? "tavily"
    : evidence.length > 0
      ? "sample"
      : "none";
  return {
    verdict: analysis.verdict,
    confidence: analysis.confidence,
    pattern: analysis.pattern,
    patternLabel: patternLabel[lang][analysis.pattern],
    headline: safeHeadline(analysis.verdict, analysis.pattern, lang),
    reasoning: reasons[lang][analysis.pattern],
    entities: analysis.entities,
    evidence,
    evidenceNote: evidenceNote(origin, lang),
    actions: buildActions(analysis.verdict, analysis.pattern, analysis.entities, lang, text),
    trace,
    language: lang,
    mode: "live",
    inputText: text,
    extractedFromImage,
    retention: "memory",
    checkedWithoutWeb: origin !== "tavily",
  };
}

function precheckTrace(precheck: PrecheckReport, lang: Lang): TraceStep {
  const found = [
    precheck.phones.length ? `${precheck.phones.length} numbers` : "",
    precheck.shortCodes.length ? precheck.shortCodes.join(" ") : "",
    precheck.links.length ? `${precheck.links.length} links` : "",
    precheck.lookalikes.length ? "lookalike brand" : "",
  ].filter(Boolean);
  return {
    id: "precheck",
    title: lang === "tw" ? "Kenkan nɔma ne link" : "Reading numbers and links",
    label: lang === "tw" ? "Kenkan nɔma ne link" : "Reading numbers and links",
    model: "scamcheck-rules",
    provider: "rules",
    status: "done",
    durationMs: 1,
    ms: 1,
    summary:
      lang === "tw"
        ? "Mmara a ɛnyɛ AI na ɛkenkan nɔma, short code, ne link ansa."
        : "Rules read numbers, short codes, and links before any model.",
    output: found.join(" · ") || (lang === "tw" ? "Biribiara nni hɔ a ɛyɛ hu." : "No risky tokens in the pre-check."),
    detail: precheck.signals.map((signal) => `${signal.points > 0 ? "+" : ""}${signal.points} ${signal.label}`).join("\n"),
  };
}

function describeEntities(entities: Entities, lang: Lang): string {
  const bits = [
    ...entities.amounts.map((amount) => (lang === "tw" ? `Sika ${amount}` : `Amount ${amount}`)),
    ...entities.phones.map((phone) => (lang === "tw" ? `nɔma ${phone}` : `phone ${phone}`)),
    ...entities.links.map((link) => link),
  ];
  return bits.slice(0, 6).join(" · ");
}
