import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import { DigestDesk } from "@/components/digest-desk";
import { listRadar } from "@/lib/radar";

export const metadata: Metadata = {
  title: "This week",
  description: "Three scams trending in the sample radar, and a short spot-the-scam quiz.",
};

export default function DigestPage() {
  const trends = listRadar().slice(0, 3);
  return (
    <Shell>
      <DigestDesk trends={trends.map((row) => ({ title: row.title, mask: row.mask, count: row.count, sample: row.sample }))} />
    </Shell>
  );
}
