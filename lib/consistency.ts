import type { ConsistencyReport, Verdict } from "./types";

const ORDER: Verdict[] = ["scam", "suspicious", "looks_ok", "unsure"];

/**
 * Three cheap reads, only when the first pass is uncertain.
 * In sample mode the votes come from the rule score, and the note says the model was not called.
 */
export function planSamples(verdict: Verdict, confidence: number, live: boolean): ConsistencyReport {
  if (confidence >= 70) {
    return {
      samples: 1,
      agreement: 1,
      votes: [verdict],
      live,
      note: live
        ? "The first pass was sure enough, so extra samples were not run."
        : "Sample mode used one rule pass. Nemotron was not called.",
    };
  }
  const votes = disagree(verdict, confidence);
  const agreement = votes.filter((vote) => vote === votes[0]).length / votes.length;
  const agreed = votes.filter((vote) => vote === majority(votes)).length;
  return {
    samples: 3,
    agreement,
    votes,
    live,
    note: live
      ? `${agreed} of 3 Lightning samples agreed.`
      : `Sample mode stood in for 3 reads. ${agreed} of 3 rule passes agreed. Nemotron was not called.`,
  };
}

export function agreementOf(votes: Verdict[]): number {
  if (votes.length === 0) return 0;
  const top = majority(votes);
  return votes.filter((vote) => vote === top).length / votes.length;
}

export function majority(votes: Verdict[]): Verdict {
  const counts = new Map<Verdict, number>();
  for (const vote of votes) counts.set(vote, (counts.get(vote) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]))[0][0];
}

function disagree(verdict: Verdict, confidence: number): Verdict[] {
  if (confidence >= 55) return [verdict, verdict, neighbour(verdict)];
  return [verdict, neighbour(verdict), "unsure"];
}

function neighbour(verdict: Verdict): Verdict {
  if (verdict === "scam") return "suspicious";
  if (verdict === "looks_ok") return "unsure";
  if (verdict === "suspicious") return "unsure";
  return "suspicious";
}
