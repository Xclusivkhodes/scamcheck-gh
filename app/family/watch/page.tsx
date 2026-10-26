import type { Metadata } from "next";
import { Suspense } from "react";
import { FamilyWatch } from "@/components/family-watch";
import { Shell } from "@/components/shell";

export const metadata: Metadata = {
  title: "Family alerts",
  description: "High-risk ScamCheck bands for a watch link. The message is not included.",
};

export default function FamilyWatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <Shell>
          <p className="t-body">Loading alerts…</p>
        </Shell>
      }
    >
      <WatchBody searchParams={searchParams} />
    </Suspense>
  );
}

async function WatchBody({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.code;
  const code = (Array.isArray(raw) ? raw[0] : raw || "").trim().toLowerCase();
  return (
    <Shell>
      <FamilyWatch code={code} />
    </Shell>
  );
}
