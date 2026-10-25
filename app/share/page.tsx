import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckerApp } from "@/components/checker-app";
import { Shell } from "@/components/shell";

export const metadata: Metadata = {
  title: "Shared message",
  description: "A message shared into ScamCheck GH from another app.",
};

export default function SharePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <Shell>
          <p className="t-body">Loading the shared message…</p>
        </Shell>
      }
    >
      <SharedMessage searchParams={searchParams} />
    </Suspense>
  );
}

async function SharedMessage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const text = [params.text, params.url, params.title]
    .flat()
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join("\n")
    .slice(0, 8000);
  return <CheckerApp initialText={text} />;
}
