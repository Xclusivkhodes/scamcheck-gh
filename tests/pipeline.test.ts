import { afterEach, describe, expect, it, vi } from "vitest";
import { MODEL_IDS } from "../lib/budget";
import { clearCompletionCache } from "../lib/nebius";
import { clearSearchCache } from "../lib/tavily";
import { parseModelJson } from "../lib/json";
import { runCheck } from "../lib/pipeline";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
  clearCompletionCache();
  clearSearchCache();
  vi.unstubAllGlobals();
});

describe("demo mode", () => {
  it("returns a labelled sample verdict without calling the network", async () => {
    process.env.DEMO_MODE = "true";
    delete process.env.NEBIUS_API_KEY;
    delete process.env.TAVILY_API_KEY;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await runCheck({ exampleId: "reversal", language: "en" });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.mode).toBe("demo");
    expect(result.verdict).toBe("scam");
    expect(result.demoNote).toMatch(/DEMO MODE/);
    expect(result.trace.map((step) => step.model)).toEqual([
      "scamcheck-rules",
      MODEL_IDS.lightning,
      "Tavily Search",
      MODEL_IDS.super,
      "scamcheck-rules",
    ]);
    expect(result.route?.escalated).toBe(true);
    expect(result.route?.verdictModel).not.toMatch(/ultra/i);
    expect(result.precheck?.amountsGhs.some((amount) => amount >= 500)).toBe(true);
    expect(result.actions.some((action) => action.href === "tel:*170%23")).toBe(true);
    expect(result.actions.some((action) => action.href === "tel:292")).toBe(true);
    expect(result.actions.some((action) => action.href === "tel:191")).toBe(true);
    expect(result.actions.some((action) => action.href === "tel:419")).toBe(false);
    expect(result.retention).toBe("memory");
    expect(result.evidence.every((item) => item.origin === "sample")).toBe(true);
  });

  it("asks for the words when a photo arrives with no text", async () => {
    process.env.DEMO_MODE = "true";
    await expect(
      runCheck({
        imageDataUrl: "data:image/jpeg;base64,abc",
        language: "tw",
      }),
    ).rejects.toMatchObject({ status: 422, code: "blurry_photo" });
  });

  it("refuses live mode when keys are missing", async () => {
    process.env.DEMO_MODE = "false";
    delete process.env.NEBIUS_API_KEY;
    delete process.env.TAVILY_API_KEY;
    await expect(runCheck({ text: "Please send GHS 20 to 0244000000 now." })).rejects.toMatchObject({
      status: 503,
    });
  });
});

describe("live pipeline", () => {
  it("calls Token Factory Nemotron models and Tavily, and never puts the key in the body", async () => {
    process.env.DEMO_MODE = "false";
    process.env.SCAMCHECK_ALLOW_MOCK_NETWORK = "1";
    process.env.NEBIUS_API_KEY = "test-nebius-key";
    process.env.TAVILY_API_KEY = "test-tavily-key";
    process.env.NEBIUS_BASE_URL = "https://api.tokenfactory.nebius.com/v1";
    delete process.env.NEBIUS_MODEL_VISION;
    delete process.env.NEBIUS_MODEL_CLASSIFY;
    delete process.env.NEBIUS_MODEL_VERDICT;
    delete process.env.NEBIUS_MAX_TOKENS;
    delete process.env.NEBIUS_CHECK_TOKEN_CAP;

    const calls: Array<{ url: string; authorization: string; body: Record<string, unknown> }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        const headers = init.headers as Record<string, string>;
        calls.push({ url: String(url), authorization: headers.Authorization, body });
        if (String(url).includes("tavily.com")) {
          return json({
            results: [
              {
                title: "Report a cyber incident",
                url: "https://www.csa.gov.gh/report",
                content: "Call or SMS 292.",
              },
            ],
          });
        }
        const model = String(body.model);
        if (model.includes("VL")) {
          return json({ choices: [{ message: { content: "Send your PIN to 0555000111 now." } }] });
        }
        if (model.includes("Lightning")) {
          return json({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    verdict: "scam",
                    confidence: 91,
                    pattern: "pin_harvest",
                    patternLabel: "PIN request",
                    reasoning: ["It asks for a PIN."],
                    entities: {
                      phones: ["0555000111"],
                      names: [],
                      amounts: [],
                      links: [],
                      organisations: ["MTN"],
                    },
                    searchQueries: ["Ghana MoMo PIN scam"],
                  }),
                },
              },
            ],
          });
        }
        return json({
          choices: [
            {
              message: {
                content:
                  '<think>hidden</think>{"verdict":"scam","confidence":94,"headline":"Do not share your PIN.","reasoning":["The message asks for a PIN."],"actions":[{"title":"Stop","detail":"Do not reply."}]}',
              },
            },
          ],
        });
      }),
    );

    const result = await runCheck({
      imageDataUrl: "data:image/png;base64,aaaa",
      language: "en",
    });

    const urls = calls.map((call) => call.url);
    expect(urls.some((url) => url === "https://api.tokenfactory.nebius.com/v1/chat/completions")).toBe(true);
    expect(urls.some((url) => url === "https://api.tavily.com/search")).toBe(true);
    expect(calls.map((call) => call.body.model).filter(Boolean)).toEqual([
      "nvidia/Nemotron-3.5-Super-VL",
      MODEL_IDS.lightning,
      MODEL_IDS.nano,
    ]);
    expect(
      calls
        .filter((call) => String(call.url).includes("chat/completions"))
        .map((call) => call.body.max_tokens),
    ).toEqual([800, 300, 500]);
    expect(calls.every((call) => !JSON.stringify(call.body).includes("test-nebius-key"))).toBe(true);
    expect(calls.every((call) => !JSON.stringify(call.body).includes("test-tavily-key"))).toBe(true);
    expect(result.mode).toBe("live");
    expect(result.verdict).toBe("scam");
    expect(result.headline).toBe("Do not share your PIN.");
    expect(result.evidence[0]?.origin).toBe("tavily");
    expect(result.trace.find((step) => step.id === "verdict")?.status).toBe("done");
  });
});

describe("json", () => {
  it("ignores think tags and fences", () => {
    const parsed = parseModelJson('```json\n{"verdict":"suspicious"}\n```');
    expect(parsed).toEqual({ verdict: "suspicious" });
  });
});

function json(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}
