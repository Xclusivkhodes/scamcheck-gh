import { afterEach, describe, expect, it, vi } from "vitest";
import { isDemoMode } from "../lib/config";
import { resetBreaker } from "../lib/breaker";
import { clearCompletionCache, nebiusChat } from "../lib/nebius";
import { MODEL_IDS, requestTokenCap } from "../lib/budget";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
  clearCompletionCache();
  resetBreaker();
  vi.unstubAllGlobals();
});

describe("demo and test guard", () => {
  it("stays in demo unless DEMO_MODE is explicitly false", () => {
    delete process.env.DEMO_MODE;
    process.env.NEBIUS_API_KEY = "present";
    process.env.TAVILY_API_KEY = "present";
    expect(isDemoMode()).toBe(true);
    process.env.DEMO_MODE = "false";
    expect(isDemoMode()).toBe(false);
  });

  it("does not touch the network from a test unless the mock gate is open", async () => {
    process.env.DEMO_MODE = "false";
    process.env.NEBIUS_API_KEY = "test-nebius-key";
    delete process.env.SCAMCHECK_ALLOW_MOCK_NETWORK;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      nebiusChat({
        model: MODEL_IDS.nano,
        messages: [{ role: "user", content: "hello" }],
      }),
    ).rejects.toThrow(/Tests cannot call Nebius/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("token cap, reasoning, and cache", () => {
  it("keeps Super inside the request cap and reads JSON left in reasoning_content", async () => {
    armMock();
    const seen: number[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as { max_tokens: number };
        seen.push(body.max_tokens);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: null,
                  reasoning_content: 'thinking first {"verdict":"scam","headline":"Stop."}',
                },
              },
            ],
          }),
        };
      }),
    );

    const reply = await nebiusChat({
      model: MODEL_IDS.super,
      maxTokens: 200,
      messages: [{ role: "user", content: "judge this" }],
    });

    expect(seen).toEqual([200]);
    expect(reply.content).toContain('"verdict":"scam"');
    expect(reply.reasoning).toMatch(/thinking first/);
    expect(reply.maxTokens).toBe(200);
    expect(requestTokenCap()).toBe(1000);
  });

  it("serves a repeated call from cache and clamps a huge request", async () => {
    armMock();
    process.env.NEBIUS_MAX_TOKENS = "1000";
    const sentTokens: number[] = [];
    const fetchSpy = vi.fn(async (_url: string, init: RequestInit) => {
      sentTokens.push((JSON.parse(String(init.body)) as { max_tokens: number }).max_tokens);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "GHS 20 from Ama" } }],
        }),
      };
    });
    vi.stubGlobal("fetch", fetchSpy);

    const first = await nebiusChat({
      model: MODEL_IDS.lightning,
      maxTokens: 9000,
      messages: [{ role: "user", content: "read the sms" }],
    });
    const second = await nebiusChat({
      model: MODEL_IDS.lightning,
      maxTokens: 9000,
      messages: [{ role: "user", content: "read the sms" }],
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.content).toBe("GHS 20 from Ama");
    expect(sentTokens).toEqual([1000]);
  });
});

function armMock() {
  process.env.DEMO_MODE = "false";
  process.env.SCAMCHECK_ALLOW_MOCK_NETWORK = "1";
  process.env.NEBIUS_API_KEY = "test-nebius-key";
  delete process.env.NEBIUS_MAX_TOKENS;
}
