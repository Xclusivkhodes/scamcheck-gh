import { EVAL_CASES } from "./dataset";
import { analyzeMessage } from "../lib/heuristics";
import type { Verdict } from "../lib/types";

const labels: Verdict[] = ["scam", "suspicious", "looks_ok"];

function main() {
  const rows = EVAL_CASES.map((item) => {
    const actual = analyzeMessage(item.text).verdict;
    return { ...item, actual, match: actual === item.expected };
  });

  const correct = rows.filter((row) => row.match).length;
  const accuracy = correct / rows.length;
  const misses = rows.filter((row) => !row.match);
  const unexpected = misses.filter((row) => !row.knownGap);

  const confusion = Object.fromEntries(
    labels.map((expected) => [
      expected,
      Object.fromEntries(
        labels.map((actual) => [
          actual,
          rows.filter((row) => row.expected === expected && row.actual === actual).length,
        ]),
      ),
    ]),
  );

  const unsafe = (verdict: Verdict) => verdict !== "looks_ok";
  const riskCorrect = rows.filter((row) => unsafe(row.expected) === unsafe(row.actual)).length;

  console.log("ScamCheck GH heuristic eval");
  console.log("Mode: local pattern rules (no Nemotron, no Tavily)");
  console.log(`Cases: ${rows.length}`);
  console.log(`Exact accuracy: ${correct}/${rows.length} (${pct(accuracy)})`);
  console.log(`Risk accuracy (scam or careful vs looks OK): ${riskCorrect}/${rows.length} (${pct(riskCorrect / rows.length)})`);
  console.log("\nConfusion (rows are expected, columns are actual)");
  console.log(["expected", ...labels].join("\t"));
  for (const expected of labels) {
    console.log([expected, ...labels.map((actual) => String(confusion[expected][actual]))].join("\t"));
  }

  console.log("\nCases");
  for (const row of rows) {
    const flag = row.match ? "ok" : row.knownGap ? "known-gap" : "MISS";
    console.log(`- [${flag}] ${row.id}: expected ${row.expected}, got ${row.actual}`);
  }

  if (misses.length > 0) {
    console.log("\nFailure cases");
    for (const row of misses) {
      console.log(`- ${row.id}: expected ${row.expected}, got ${row.actual}`);
      if (row.note) console.log(`  ${row.note}`);
    }
  }

  console.log(
    "\nLive eval: set DEMO_MODE=false plus NEBIUS_API_KEY and TAVILY_API_KEY, then call POST /api/check for each case. This script scores the offline baseline that demo mode uses.",
  );

  if (unexpected.length > 0 || accuracy < 0.75) {
    console.error("\nEval failed. Unexpected misses or accuracy under 75%.");
    process.exit(1);
  }
}

function pct(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

main();
