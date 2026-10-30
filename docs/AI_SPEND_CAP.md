# AI spend cap

Live AI runs on Nebius Token Factory. The account has $1 of credit, shared by three hackathon apps. ScamCheck GH gets **$0.30** of it, and the three caps add up to $0.90, which leaves a 10% margin.

## How the cap works (`lib/ai-spend-cap.ts`)

1. Before each live call, the server reserves the worst case: the estimated prompt tokens (about chars/3, plus 1600 per photo) at the model's input price, plus `max_tokens` at its output price.
2. If that reservation would take the total past the cap, the call is refused and never sent. The check then answers from the on-device pattern rules and shows: *"The AI spend cap for this app is used up, so live AI is off. Showing demo results instead. This answer used the on-device rules."*
3. When the reply comes back, the reservation is settled to the real cost from the `usage` field of the API response. If there is no usage, or the call timed out or failed after it was sent, the worst case is kept. A retry after a timeout reserves again.
4. Every call sends `max_tokens`: vision 800, classify 300, verdict 500 and Super 1000, inside a 2400-token budget per check (`NEBIUS_CHECK_TOKEN_CAP`). An empty or unusable answer is still counted. A reply with no `usage` field is counted at the full `max_tokens`.

Prices are per 1M tokens, from https://tokenfactory.nebius.com/model-catalog.md, checked on 2026-10-30. A model not in the table is priced at the Ultra rate, which is the safe side.

| Model | Input | Output |
|---|---|---|
| Nano-30B-A3B / Nemotron-3_5-Lightning | $0.06 | $0.24 |
| nemotron-3-super-120b-a12b / Nemotron-3.5-Super-VL | $0.30 | $0.90 |
| Ultra-550b | $1.00 | $3.00 |

## The math

For a text check, Lightning classifies, Nano writes the verdict, and Super is optional. A photo adds a Super-VL read.
- Classify: about 1,000 prompt tokens × $0.06/M plus 300 out × $0.24/M ≈ $0.00013.
- Verdict on Nano: about 2,000 in plus 500 out ≈ $0.00024.
- Optional Super: about 2,000 in × $0.30/M plus 1,000 out × $0.90/M ≈ $0.0015.
- Photo read on Super-VL: about 1,800 in plus 800 out ≈ $0.0012.
- The worst case is **about $0.003 per check**, and the 2400-token output budget keeps it there. A typical text-only check is about $0.0005.
- The demo plan is about 100 live checks (judges plus rehearsals): 100 × $0.003 = **$0.30**, which is the cap at the worst case. Most demo checks are text-only, so in practice that is several hundred checks. The built-in examples are cached and cost $0.

## Where the running total is kept

| Store | When | Limits |
|---|---|---|
| Upstash Redis (`INCRBYFLOAT ai-spend-cap:scamcheck-gh:usd`) | `UPSTASH_REDIS_REST_URL` + `_TOKEN`, or `KV_REST_API_URL` + `_TOKEN` | Durable and shared across all serverless instances. **Recommended on Vercel.** |
| File `data/ai-spend.json` (or `AI_SPEND_FILE`) | Local or single-server runs | Durable on one machine only. |
| `/tmp` file on Vercel | Only if `AI_SPEND_ALLOW_EPHEMERAL=1` | Each instance has its own counter, and the counter resets on a cold start, so the real spend can go past the cap. |

On Vercel with no Redis and no `AI_SPEND_ALLOW_EPHEMERAL=1`, live calls are refused and the app stays in demo mode.

## Settings

- `AI_SPEND_CAP_USD`: the cap in USD. The default is `0.30`.
- `BUDGET_USD`: an older setting, still read, but it can only *lower* the cap.

## Adding your own key (Eli)

The repo and Vercel hold no key. To go live:

1. In Vercel, open the project, go to **Storage**, and add **Upstash for Redis** from the Marketplace. This creates the `KV_REST_API_*` variables.
2. In **Settings → Environment Variables (Production)**, add `NEBIUS_API_KEY` (mark it Sensitive). `TAVILY_API_KEY` is optional; it turns on web search. Then set `DEMO_MODE=false`, and leave `LLM_ENABLED` unset or `true`. You can also set `AI_SPEND_CAP_USD=0.30`.
3. Redeploy. To return to demo mode, remove the key or set `DEMO_MODE=true`.
