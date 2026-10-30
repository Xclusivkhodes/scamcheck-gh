import { afterEach, describe, expect, it, vi } from "vitest";
import { resetBreaker } from "../lib/breaker";
import { MODEL_IDS } from "../lib/budget";
import { clearCompletionCache, nebiusChat } from "../lib/nebius";
import { runCheck } from "../lib/pipeline";
import { budgetUsd, hardTripped, resetSpend } from "../lib/spend";
import {
  aiSpendCapUsd,
  aiSpendSnapshot,
  CAP_REACHED_MESSAGE,
  costUsd,
  reserveSpend,
  resetAiSpendForTests,
  settleSpend,
} from "../lib/ai-spend-cap";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
  clearCompletionCache();
  resetBreaker();
  resetAiSpendForTests();
  resetSpend();
  vi.unstubAllGlobals();
});

function armMock() {
  process.env.DEMO_MODE = "false";
  process.env.SCAMCHECK_ALLOW_MOCK_NETWORK = "1";
  process.env.NEBIUS_API_KEY = "test-nebius-key";
  process.env.TAVILY_API_KEY = "test-tavily-key";
  process.env.AI_SPEND_STORE = "memory";
  delete process.env.NEBIUS_MAX_TOKENS;
}

function ok(content: string, usage?: { prompt_tokens: number; completion_tokens: number }) {
  return { ok: true, status: 200, headers: new Headers(), json: async () => ({ choices: [{ message: { content } }], usage }) };
}

describe("AI spend cap", () => {
  it("defaults to $0.30, AI_SPEND_CAP_USD wins, BUDGET_USD can only lower it", () => {
    delete process.env.AI_SPEND_CAP_USD;
    delete process.env.BUDGET_USD;
    expect(aiSpendCapUsd()).toBe(0.3);
    process.env.BUDGET_USD = "1";
    expect(budgetUsd()).toBe(0.3);
    process.env.BUDGET_USD = "0.2";
    expect(budgetUsd()).toBe(0.2);
    process.env.AI_SPEND_CAP_USD = "0.25";
    expect(budgetUsd()).toBe(0.25);
  });

  it("sends max_tokens, counts real usage, and refuses the next call at the cap without fetching", async () => {
    armMock();
    process.env.AI_SPEND_CAP_USD = "0.00015";
    const bodies: Array<{ max_tokens: number }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        bodies.push(JSON.parse(String(init.body)));
        return ok("fine", { prompt_tokens: 100, completion_tokens: 400 });
      }),
    );
    await nebiusChat({ model: MODEL_IDS.nano, messages: [{ role: "user", content: "one" }], maxTokens: 300 });
    expect(bodies[0].max_tokens).toBe(300);
    expect((await aiSpendSnapshot()).spentUsd).toBeCloseTo(costUsd(MODEL_IDS.nano, 100, 400), 6);
    await expect(
      nebiusChat({ model: MODEL_IDS.nano, messages: [{ role: "user", content: "two" }], maxTokens: 300 }),
    ).rejects.toMatchObject({ code: "spend_cap", message: CAP_REACHED_MESSAGE });
    expect(bodies).toHaveLength(1);
  });

  it("keeps the max_tokens worst case when the reply has no usage, and releases refused HTTP calls", async () => {
    armMock();
    vi.stubGlobal("fetch", vi.fn(async () => ok("fine")));
    await nebiusChat({ model: MODEL_IDS.nano, messages: [{ role: "user", content: "hi" }], maxTokens: 200 });
    const spent = (await aiSpendSnapshot()).spentUsd;
    expect(spent).toBeGreaterThanOrEqual(costUsd(MODEL_IDS.nano, 0, 200) - 1e-6);

    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 400, headers: new Headers(), json: async () => ({}) })));
    await expect(
      nebiusChat({ model: MODEL_IDS.nano, messages: [{ role: "user", content: "bad" }], maxTokens: 200 }),
    ).rejects.toThrow();
    expect((await aiSpendSnapshot()).spentUsd).toBeCloseTo(spent, 6);
  });

  it("counts spend even when the model returns no usable answer", async () => {
    armMock();
    vi.stubGlobal("fetch", vi.fn(async () => ok("", { prompt_tokens: 50, completion_tokens: 300 })));
    await expect(
      nebiusChat({ model: MODEL_IDS.nano, messages: [{ role: "user", content: "x" }], maxTokens: 300 }),
    ).rejects.toThrow(/reasoning/);
    expect((await aiSpendSnapshot()).spentUsd).toBeCloseTo(costUsd(MODEL_IDS.nano, 50, 300), 6);
  });

  it("answers with the rules and a clear note once the cap is used up, with no network call", async () => {
    armMock();
    process.env.AI_SPEND_CAP_USD = "0.001";
    const r = await reserveSpend(MODEL_IDS.nano, 0, 100);
    await settleSpend(r, { promptTokens: 0, completionTokens: 10_000 });
    expect(hardTripped()).toBe(true);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await runCheck({ text: "Your MoMo wallet is blocked. Send your PIN to 0244000000 now.", language: "en" });
    expect(result.mode).toBe("fallback");
    expect(result.demoNote).toContain(CAP_REACHED_MESSAGE);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
