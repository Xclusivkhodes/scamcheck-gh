import { describe, expect, it } from "vitest";
import { EXAMPLES } from "../lib/examples";
import { groundClaims } from "../lib/grounding";
import { calibrateVerdict } from "../lib/intel";
import { matchPattern } from "../lib/patterns";
import { findLookalikes, inspectMessage } from "../lib/precheck";
import { maskPhone, phoneHash, resetRadarForTests } from "../lib/radar";
import { lookupReputation } from "../lib/reputation";
import { chooseRoute } from "../lib/routing";
import { MODEL_IDS } from "../lib/budget";

describe("pre-check", () => {
  it("pulls Ghana numbers, short codes, and amounts before any model", () => {
    const report = inspectMessage("MTN: dial *170# if you did not receive GHS 850. Call 0244123456.");
    expect(report.phones).toContain("0244123456");
    expect(report.shortCodes).toContain("*170#");
    expect(report.amountsGhs).toContain(850);
  });

  it("flags a lookalike brand and an unofficial link", () => {
    const report = inspectMessage("M7N MoMo: pay the fee at https://mtn-ghana-reward.support/claim");
    expect(findLookalikes("M7N MoMo").some((hit) => hit.brand === "mtn")).toBe(true);
    expect(report.links[0]?.official).toBe(false);
    expect(report.points).toBeGreaterThan(0);
  });

  it("does not treat mtn.com.gh as a lookalike site", () => {
    const report = inspectMessage("Receipt from https://mtn.com.gh/momo. Do not share your PIN.");
    expect(report.links[0]?.official).toBe(true);
    expect(report.signals.some((signal) => signal.id === "official-host")).toBe(true);
  });

  it("skips Safe Browsing and RDAP when no key is set", async () => {
    const notes = await lookupReputation(
      [{ url: "https://example.com", host: "example.com", shortener: false, official: false, punycode: false }],
      {},
    );
    expect(notes.every((note) => note.status === "skipped")).toBe(true);
  });
});

describe("routing and bands", () => {
  it("keeps Nano for a sure, small check and never picks Ultra", () => {
    const route = chooseRoute({ confidence: 92, maxAmountGhs: 40, points: 30 });
    expect(route.escalated).toBe(false);
    expect(route.verdictModel).toBe(MODEL_IDS.nano);
    expect(route.classifyModel).toBe(MODEL_IDS.lightning);
    expect(route.verdictModel).not.toMatch(/ultra/i);
  });

  it("escalates to Super when the amount is at least GH¢500", () => {
    const route = chooseRoute({ confidence: 91, maxAmountGhs: 850, points: 40 });
    expect(route.escalated).toBe(true);
    expect(route.verdictModel).toBe(MODEL_IDS.super);
    expect(route.needsSamples).toBe(false);
  });

  it("asks for three samples only when the first pass is unsure", () => {
    expect(chooseRoute({ confidence: 58, maxAmountGhs: null, points: 0 }).needsSamples).toBe(true);
  });

  it("will not call a low-confidence message Safe", () => {
    expect(calibrateVerdict("looks_ok", 58, 0, 1, "unclear")).toBe("unsure");
    expect(calibrateVerdict("looks_ok", 86, 0, 1, "official_alert")).toBe("looks_ok");
  });
});

describe("patterns and grounding", () => {
  it("matches a fake reversal to the MTN 2024 pattern", () => {
    const hit = matchPattern(EXAMPLES[0].text);
    expect(hit?.pattern).toBe("fake_reversal");
    expect(hit?.source).toBe("MTN MoMo");
  });

  it("drops a claim that cites a page we did not fetch", () => {
    const grounded = groundClaims(
      ["Do not share your PIN.", "See https://evil.example/proof [4]."],
      [{ title: "CSA", url: "https://www.csa.gov.gh/report", snippet: "Call 292.", source: "CSA", origin: "sample" }],
    );
    expect(grounded.kept).toEqual(["Do not share your PIN."]);
    expect(grounded.dropped).toBe(1);
  });
});

describe("radar privacy", () => {
  it("masks the number and does not keep the raw value in the hash label", () => {
    resetRadarForTests();
    process.env.RADAR_SALT = "test-radar-salt-16";
    const phone = "0244123456";
    expect(maskPhone(phone)).toBe("024 ••• 456");
    const hash = phoneHash(phone);
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain(phone);
    expect(maskPhone(phone)).not.toContain("123");
  });
});
