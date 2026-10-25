import type { Metadata } from "next";
import { Suspense } from "react";
import { Shell } from "@/components/shell";
import { VerdictCard } from "@/components/verdict-card";
import type { Lang, Verdict } from "@/lib/types";

export const metadata: Metadata = {
  title: "Verdict card",
  description: "A forwardable ScamCheck GH card. The full message is not on it.",
};

const VERDICTS = new Set<Verdict>(["scam", "suspicious", "looks_ok", "unsure"]);

export default function CardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <Shell>
          <p className="t-body">Loading the card…</p>
        </Shell>
      }
    >
      <CardBody searchParams={searchParams} />
    </Suspense>
  );
}

async function CardBody({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const verdictParam = first(params.verdict);
  const verdict: Verdict = VERDICTS.has(verdictParam as Verdict) ? (verdictParam as Verdict) : "unsure";
  const headline = first(params.headline) || "Do not send money or share your PIN.";
  const pattern = first(params.pattern) || "Checked message";
  const lang: Lang = first(params.lang) === "tw" ? "tw" : "en";
  return (
    <Shell>
      <VerdictCard verdict={verdict} headline={headline} pattern={pattern} lang={lang} />
    </Shell>
  );
}

function first(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw || "").slice(0, 180);
}
