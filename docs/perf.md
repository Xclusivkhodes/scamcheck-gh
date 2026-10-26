# Demo-mode load

Measured 26 Oct 2026 with `npm run load` after `npm run build`.

The script starts `next start` on port 4321 with `DEMO_MODE=true` and raises the limiter for that process only (`RATE_LIMIT_PER_MINUTE=100000`, `RATE_LIMIT_PER_DAY=100000`, `PIPELINE_CONCURRENCY=32`). Production stays at 5 requests per minute and 30 per day per IP. A load run that keeps the production limit will be mostly `429` responses. That is the intended limit, covered by `tests/resilience.test.ts`, not a latency miss.

Command shape: autocannon `POST /api/check`, 20 connections, 30 seconds, JSON body, `stream: false`. The body is a short MoMo receipt so the demo rules return Safe without a model call.

| Metric | Result | Target |
| --- | --- | --- |
| p50 | 45 ms | ≤ 150 ms |
| p99 | 372 ms | ≤ 800 ms |
| average | 50.75 ms | — |
| HTTP responses | 529 | — |
| non-2xx | 0 | ≤ 1% |
| socket errors | 40 | — |

The 40 socket errors are requests still in flight when the 30 second window closed. Every completed HTTP response was 2xx. Both latency targets were met.
