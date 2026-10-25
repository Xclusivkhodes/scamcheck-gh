import { describe, expect, it } from "vitest";
import { EVAL_CASES } from "../evals/dataset";
import { extractEntities } from "../lib/entities";
import { analyzeMessage, asksForSecret } from "../lib/heuristics";
import { EXAMPLES } from "../lib/examples";
import { ui } from "../lib/i18n";

describe("entities", () => {
  it("reads Ghana numbers, amounts, and links", () => {
    const entities = extractEntities(
      "Call 0551988776 or +233244123456 about GHS 1,250.00 at https://example.com/pay.",
    );
    expect(entities.phones).toEqual(["0551988776", "0244123456"]);
    expect(entities.amounts.some((amount) => amount.includes("1,250"))).toBe(true);
    expect(entities.links).toEqual(["https://example.com/pay"]);
  });

  it("does not treat a safety warning as a PIN request", () => {
    expect(asksForSecret("Do not share your PIN or OTP with anyone.")).toBe(false);
    expect(asksForSecret("Approve the reversal with your PIN.")).toBe(true);
  });
});

describe("labelled set", () => {
  it("keeps exact accuracy at 75% or better and only misses known gaps", () => {
    const misses = EVAL_CASES.filter((item) => analyzeMessage(item.text).verdict !== item.expected);
    const unexpected = misses.filter((item) => !item.knownGap);
    expect(unexpected.map((item) => item.id)).toEqual([]);
    const accuracy = (EVAL_CASES.length - misses.length) / EVAL_CASES.length;
    expect(accuracy).toBeGreaterThanOrEqual(0.75);
  });
});

describe("examples", () => {
  it("covers scam, careful, and safe verdicts", () => {
    const verdicts = new Set(EXAMPLES.map((example) => analyzeMessage(example.text).verdict));
    expect(verdicts.has("scam")).toBe(true);
    expect(verdicts.has("suspicious")).toBe(true);
    expect(verdicts.has("looks_ok")).toBe(true);
  });
});

describe("i18n", () => {
  it("has the same keys in English and Twi", () => {
    expect(Object.keys(ui.tw).sort()).toEqual(Object.keys(ui.en).sort());
  });
});
