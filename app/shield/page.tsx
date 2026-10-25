import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import { ShieldDesk } from "@/components/shield-desk";

export const metadata: Metadata = {
  title: "My Shield",
  description: "Checks saved on this phone, with how many scams you did not pay.",
};

export default function ShieldPage() {
  return (
    <Shell>
      <ShieldDesk />
    </Shell>
  );
}
