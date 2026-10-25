import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import { FamilyDesk } from "@/components/family-desk";

export const metadata: Metadata = {
  title: "Check for Mum",
  description: "Link a relative and send them a verdict card that does not include the full message.",
};

export default function FamilyPage() {
  return (
    <Shell>
      <FamilyDesk />
    </Shell>
  );
}
