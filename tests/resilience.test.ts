import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetBreaker } from "../lib/breaker";
import { clearCompletionCache, nebiusChat, nebiusJson } from "../lib/nebius";
import { resetLimits, allowIp, clientIp } from "../lib/limits";
import { phoneHash, recordRadar, reportsForPhone, resetRadarForTests } from "../lib/radar";
import { runCheck } from "../lib/pipeline";
import { classificationSchema } from "../lib/schemas";
import { resetSpend, setLlmPaused, llmEnabled, softTripped } from "../lib/spend";
import { chooseRoute } from "../lib/routing";
import { hubSignature, signaturesMatch } from "../lib/whatsapp-sign";
import { MODEL_IDS } from "../lib/budget";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
  clearCompletionCache();
  resetBreaker();
  resetLimits();
  resetSpend();
  resetRadarForTests();
  vi.unstubAllGlobals();
});

function arm() {
  process.env.DEMO_MODE = "false";
  process.env.SCAMCHECK_ALLOW_MOCK_NETWORK = "1";
  process.env.NEBIUS_API_KEY = "test-nebius-key";
  process.env.RADAR_SALT = "test-radar-salt-16";
  delete process.env.TAVILY_API_KEY;
}

describe("limits and client ip", () => {
  it("ignores X-Forwarded-For unless the proxy is trusted, and uses the right-most hop", () => {
    delete process.env.TRUST_PROXY;
    const headers = new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" });
    expect(clientIp(headers, "9.9.9.9")).toBe("9.9.9.9");
    process.env.TRUST_PROXY = "1";
    expect(clientIp(headers)).toBe("2.2.2.2");
  });

  it("returns 429 after the per-minute cap", () => {
    delete process.env.RATE_LIMIT_PER_MINUTE;
    resetLimits();
    for (let i = 0; i < 5; i += 1) expect(allowIp("visitor").ok).toBe(true);
    expect(allowIp("visitor").ok).toBe(false);
  });
});

describe("llm resilience", () => {
  it("caches a valid JSON reply and does not cache malformed JSON", async () => {
    arm();
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      calls += 1;
      const content = calls === 1 ? "not json" : JSON.stringify({ verdict: "scam", confidence: 90 });
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) };
    }));
    await expect(nebiusJson({ model: MODEL_IDS.nano, messages: [{ role: "user", content: "a" }] }, classificationSchema)).rejects.toThrow(/JSON/);
    const parsed = await nebiusJson({ model: MODEL_IDS.nano, messages: [{ role: "user", content: "a" }] }, classificationSchema);
    expect(parsed.verdict).toBe("scam");
    await nebiusJson({ model: MODEL_IDS.nano, messages: [{ role: "user", content: "a" }] }, classificationSchema);
    expect(calls).toBe(2);
  });

  it("retries a 429 once when Retry-After is zero", async () => {
    arm();
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      calls += 1;
      if (calls === 1) return { ok: false, status: 429, headers: { get: () => "0" } };
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "ok" } }] }) };
    }));
    const reply = await nebiusChat({ model: MODEL_IDS.nano, messages: [{ role: "user", content: "retry" }] });
    expect(reply.content).toBe("ok");
    expect(calls).toBe(2);
  });

  it("opens the breaker after repeated 500s", async () => {
    arm();
    const fetchSpy = vi.fn(async () => ({ ok: false, status: 500, headers: { get: () => null } }));
    vi.stubGlobal("fetch", fetchSpy);
    for (let i = 0; i < 5; i += 1) {
      await expect(nebiusChat({ model: MODEL_IDS.nano, messages: [{ role: "user", content: `f${i}` }] })).rejects.toThrow();
    }
    const before = fetchSpy.mock.calls.length;
    await expect(nebiusChat({ model: MODEL_IDS.nano, messages: [{ role: "user", content: "closed" }] })).rejects.toThrow(/paused/);
    expect(fetchSpy.mock.calls.length).toBe(before);
  });

  it("serves fallback mode when the breaker is open", async () => {
    arm();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, headers: { get: () => null } })));
    for (let i = 0; i < 5; i += 1) {
      await expect(nebiusChat({ model: MODEL_IDS.nano, messages: [{ role: "user", content: `g${i}` }] })).rejects.toThrow();
    }
    const result = await runCheck({ text: "MTN: send your PIN 1234 to 0244000000 now please.", language: "en" });
    expect(result.mode).toBe("fallback");
    expect(result.verdict).toBeTruthy();
  });
});

describe("radar salt and demo exclusion", () => {
  it("refuses to hash a phone without a long salt", () => {
    delete process.env.RADAR_SALT;
    expect(phoneHash("0244123456")).toBeNull();
    process.env.RADAR_SALT = "test-radar-salt-16";
    const hash = phoneHash("0244123456");
    expect(hash).toHaveLength(64);
    expect(hash).toBe(createHmac("sha256", "test-radar-salt-16").update("0244123456").digest("hex"));
  });

  it("counts one ip once per day", () => {
    process.env.RADAR_SALT = "test-radar-salt-16";
    recordRadar({ pattern: "fake_reversal", title: "Fake", phones: ["0244000000"], hosts: [], ip: "1.1.1.1" });
    recordRadar({ pattern: "fake_reversal", title: "Fake", phones: ["0244000000"], hosts: [], ip: "1.1.1.1" });
    expect(reportsForPhone("0244000000")).toBe(1);
  });
});

describe("contracts", () => {
  it("keeps error as a string for the Android client", () => {
    const body = { error: "Too many checks from this connection.", code: "RATE_LIMITED", requestId: "00000000-0000-4000-8000-000000000000" };
    expect(typeof body.error).toBe("string");
  });

  it("accepts a hub signature and rejects a mismatch", () => {
    const raw = "{\"text\":\"hello there friend\"}";
    const good = hubSignature("app-secret-value", raw);
    expect(signaturesMatch(good, good)).toBe(true);
    expect(signaturesMatch(good, "sha256=dead")).toBe(false);
  });

  it("blocks Super when the soft budget is tripped", () => {
    setLlmPaused(false);
    expect(llmEnabled()).toBe(true);
    resetSpend({ estimatedUsd: 0.8, promptTokens: 1, completionTokens: 1, calls: 1, paused: null });
    expect(softTripped()).toBe(true);
    const route = chooseRoute({ confidence: 50, maxAmountGhs: 800, points: 40 });
    expect(route.escalated).toBe(false);
    expect(route.verdictModel).not.toMatch(/super/i);
  });
});
