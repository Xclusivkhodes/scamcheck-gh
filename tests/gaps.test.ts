import { describe, expect, it } from "vitest";
import { EXAMPLES } from "../lib/examples";
import { listFamilyAlerts, rememberFamilyAlert, resetFamilyAlertsForTests } from "../lib/family-alerts";
import { applyNotScam, notScamKey, type NotScamMark } from "../lib/not-scam";
import { matchPatterns } from "../lib/patterns";
import { classifyUser, verdictUser } from "../lib/prompts";
import { radarHitsFor, recordRadar, reportsForHost, reportsForPhone, resetRadarForTests } from "../lib/radar";
import { redactSecrets } from "../lib/redact";
import { inspectMessage } from "../lib/precheck";

describe("nearest patterns", () => {
  it("returns up to three cards and keeps the best first", () => {
    const hits = matchPatterns(EXAMPLES[0].text);
    expect(hits.length).toBeGreaterThan(1);
    expect(hits.length).toBeLessThanOrEqual(3);
    expect(hits[0]?.pattern).toBe("fake_reversal");
    expect(new Set(hits.map((hit) => hit.id)).size).toBe(hits.length);
  });

  it("does not invent a match for a short note", () => {
    expect(matchPatterns("hello")).toEqual([]);
  });
});

describe("radar badge", () => {
  it("counts sample reports for the demo numbers before this check", () => {
    resetRadarForTests();
    process.env.RADAR_SALT = "test-radar-salt-16";
    expect(reportsForPhone("0244123456")).toBe(18);
    expect(reportsForPhone("+233244123456")).toBe(18);
    expect(reportsForHost("mtn-ghana-reward.support")).toBe(11);
    recordRadar({
      pattern: "fake_reversal",
      title: "Fake wrong transfer",
      phones: ["0244123456"],
      hosts: ["gra-tax-clearance.pay-gh.com"],
    });
    expect(reportsForPhone("0244123456")).toBe(19);
    expect(reportsForHost("gra-tax-clearance.pay-gh.com")).toBe(10);
    const hits = radarHitsFor(inspectMessage(EXAMPLES[0].text));
    expect(hits.some((hit) => hit.label === "024 ••• 456" && hit.count === 19)).toBe(true);
    expect(JSON.stringify(hits)).not.toContain("0244123456");
  });
});

describe("prompt redaction", () => {
  it("removes PIN, OTP, and Ghana Card values and keeps the phone number", () => {
    const raw = "MTN staff: your OTP is 839201 and PIN: 4821. Ghana Card GHA-123456789-0. Call 0555000111.";
    const safe = redactSecrets(raw);
    expect(safe.redacted).toBeGreaterThanOrEqual(3);
    expect(safe.text).not.toContain("839201");
    expect(safe.text).not.toContain("4821");
    expect(safe.text).not.toContain("123456789");
    expect(safe.text).toContain("0555000111");
    expect(safe.text).toContain("[redacted]");
  });

  it("puts redacted text and the nearest patterns into the live prompt", () => {
    const text = "Send the OTP 839201 to 0555000111 and do it now with your PIN 4821.";
    const matches = matchPatterns(EXAMPLES[0].text);
    const classify = classifyUser(text, matches);
    const verdict = verdictUser({
      text,
      classification: { verdict: "scam" },
      evidence: [],
      entities: { phones: ["0555000111"], names: [], amounts: [], links: [], organisations: [] },
      matches,
    });
    expect(classify).not.toContain("839201");
    expect(classify).not.toContain("4821");
    expect(verdict).not.toContain("839201");
    expect(verdict).toContain("0555000111");
    expect(verdict).toContain(matches[0]?.title);
  });
});

describe("not a scam", () => {
  const official: NotScamMark = {
    key: notScamKey("official_alert"),
    pattern: "official_alert",
    at: "2026-10-26T00:00:00.000Z",
    label: "Normal alert",
  };

  it("softens a later official alert and leaves a PIN request alone", () => {
    const receipt = "You have received GHS 40. Current balance GHS 80. Transaction ID 1844. Do not share your PIN.";
    const softened = applyNotScam({
      verdict: "suspicious",
      confidence: 64,
      pattern: "official_alert",
      text: receipt,
      marks: [official],
    });
    expect(softened.verdict).toBe("looks_ok");
    expect(softened.applied).toBe(true);
    expect(softened.note).toMatch(/official alert/i);

    const pin = applyNotScam({
      verdict: "scam",
      confidence: 90,
      pattern: "pin_harvest",
      text: "Send your PIN 4821 to the agent now.",
      hasSecretSignal: true,
      marks: [{ ...official, key: notScamKey("pin_harvest"), pattern: "pin_harvest" }],
    });
    expect(pin.verdict).toBe("scam");
    expect(pin.applied).toBe(false);
    expect(pin.note).toMatch(/does not apply/i);
  });

  it("does not let an official-alert note hide a different scam", () => {
    const decision = applyNotScam({
      verdict: "scam",
      confidence: 91,
      pattern: "fake_reversal",
      text: "Kindly reverse GHS 800 now.",
      marks: [official],
    });
    expect(decision.verdict).toBe("scam");
    expect(decision.applied).toBe(false);
    expect(decision.note).toBeNull();
  });
});

describe("family alerts", () => {
  it("stores the band and the pattern, and drops a pattern that looks like a pasted number", () => {
    resetFamilyAlertsForTests();
    expect(rememberFamilyAlert("bad", { verdict: "scam", pattern: "Fake wrong transfer" })).toBeNull();
    expect(rememberFamilyAlert("abc23456", { verdict: "scam", pattern: "Please reverse GHS 800 from 0244123456" })).toBeNull();
    const ok = rememberFamilyAlert("abc23456", { verdict: "suspicious", pattern: "Fake wrong transfer" });
    expect(ok?.verdict).toBe("suspicious");
    expect(Object.keys(ok ?? {}).sort()).toEqual(["at", "pattern", "verdict"]);
    expect(listFamilyAlerts("abc23456")).toEqual([ok]);
    expect(JSON.stringify(listFamilyAlerts("abc23456"))).not.toContain("0244123456");
  });
});
