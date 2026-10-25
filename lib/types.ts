export type Lang = "en" | "tw";

export type Verdict = "scam" | "suspicious" | "looks_ok" | "unsure";

export type CheckMode = "demo" | "live";

export type ScamPattern =
  | "fake_reversal"
  | "pin_harvest"
  | "prize_scam"
  | "fake_tax"
  | "job_fee"
  | "relative_impersonation"
  | "fake_official_link"
  | "account_block"
  | "official_alert"
  | "payment_request"
  | "unclear";

export interface Entities {
  phones: string[];
  names: string[];
  amounts: string[];
  links: string[];
  organisations: string[];
}

export interface EvidenceItem {
  title: string;
  url: string;
  snippet: string;
  source: string;
  origin: "sample" | "tavily";
}

export type ActionKind = "stop" | "note" | "dial" | "placeholder" | "share";

export interface ActionItem {
  title: string;
  detail: string;
  href?: string;
  id?: string;
  group?: number;
  kind?: ActionKind;
  dial?: string;
  sub?: string;
  placeholder?: boolean;
}

export type TraceStatus = "done" | "skipped" | "error" | "active" | "pending";

export interface TraceStep {
  id: "extract" | "classify" | "search" | "verdict" | "rules" | string;
  title: string;
  label?: string;
  model: string;
  provider: string;
  summary: string;
  detail?: string;
  durationMs: number;
  ms?: number;
  status: TraceStatus;
  input?: string;
  output?: string;
  cached?: boolean;
  maxTokens?: number;
}

export interface CheckResult {
  verdict: Verdict;
  confidence: number;
  pattern: ScamPattern;
  patternLabel: string;
  headline: string;
  reasoning: string[];
  entities: Entities;
  evidence: EvidenceItem[];
  evidenceNote: string;
  actions: ActionItem[];
  trace: TraceStep[];
  language: Lang;
  mode: CheckMode;
  inputText: string;
  extractedFromImage: boolean;
  demoNote?: string;
  /** memory: the model reply may sit in RAM for 15 minutes. Nothing is written to disk. */
  retention: "memory" | "none";
  checkedWithoutWeb?: boolean;
  cacheHit?: boolean;
  precheck?: PrecheckReport;
  patternMatch?: PatternMatch | null;
  route?: RoutePlan;
  consistency?: ConsistencyReport;
  grounding?: GroundingReport;
}

export type Band = "scam" | "caution" | "safe" | "cant_tell";

export interface PrecheckSignal {
  id: string;
  label: string;
  points: number;
  detail: string;
}

export interface LinkFact {
  url: string;
  host: string;
  shortener: boolean;
  official: boolean;
  punycode: boolean;
}

export interface ReputationNote {
  host: string;
  kind: "domain_age" | "safe_browsing";
  status: "skipped" | "clean" | "hit" | "young" | "old" | "unavailable";
  detail: string;
}

export interface PrecheckReport {
  phones: string[];
  shortCodes: string[];
  links: LinkFact[];
  amountsGhs: number[];
  lookalikes: Array<{ token: string; brand: string; distance: number }>;
  signals: PrecheckSignal[];
  points: number;
  reputation: ReputationNote[];
}

export interface PatternMatch {
  id: string;
  title: string;
  source: string;
  year: number;
  pattern: ScamPattern;
}

export interface RoutePlan {
  classifyModel: string;
  verdictModel: string;
  escalated: boolean;
  reason: string;
  estimatedUsd: number;
  needsSamples: boolean;
}

export interface ConsistencyReport {
  samples: number;
  agreement: number;
  votes: Verdict[];
  live: boolean;
  note: string;
}

export interface GroundingReport {
  kept: string[];
  dropped: number;
  note: string;
}

export interface CheckRequest {
  text?: string;
  imageDataUrl?: string;
  exampleId?: string;
  language?: Lang;
  /** Skip Tavily and label the answer "Checked without web sources". */
  skipSearch?: boolean;
  stream?: boolean;
}

export interface Analysis {
  verdict: Verdict;
  confidence: number;
  pattern: ScamPattern;
  entities: Entities;
  signals: string[];
}
