# Deploy ScamCheck GH

The site and the API are one Next.js app. `DEMO_MODE` defaults to on. A host with no env file still serves sample checks and does not call Nebius or Tavily.

Set `DEMO_MODE=false` only after you accept the API cost. Live mode needs `NEBIUS_API_KEY`. `TAVILY_API_KEY` is optional: without it the check still runs and skips web search. Copy `.env.example` and fill those in. Do not commit `.env`.

Live mode also expects `RADAR_SALT` (at least 16 characters) so phone hashes are not guessable. `ADMIN_SECRET` (at least 16 characters) unlocks `POST /api/admin/llm` and `GET /api/admin/metrics`. A shorter secret makes those routes return 404. Set `TRUST_PROXY=1` only when the host overwrites `X-Forwarded-For` (Render does). The app then uses the right-most hop. Without that flag the header is ignored.

`NEXT_PUBLIC_SITE_URL` should be the public https origin, with no trailing slash. It is used for Open Graph and the sitemap.

## Vercel (frontend and API together)

1. Import the repo. Framework preset: Next.js. Root directory: the repo root.
2. `vercel.json` sets `npm ci` and `npm run build`.
3. Environment:
   - `DEMO_MODE` = `true`
   - `NEXT_PUBLIC_SITE_URL` = your Vercel URL
4. Leave the Nebius and Tavily keys empty until you turn sample mode off.
5. Deploy. `GET /api/healthz` returns `{ "ok": true }`. `GET /api/health` and `GET /api/readyz` return `{ "ok": true, "mode": "demo", "llm": "paused" }` with no model ids, key flags, or base URL.

## Render (Docker)

`render.yaml` describes a Docker web service. The health check is `GET /api/healthz`. Do not point a keep-warm ping at `/api/check`.

1. New Web Service → Docker, or apply the blueprint.
2. The image listens on `PORT` (Render sets this). Local and the Dockerfile default to `4317` when `PORT` is unset.
3. Set `NEXT_PUBLIC_SITE_URL` in the dashboard. `DEMO_MODE` is already `true` in the blueprint.
4. The free plan’s disk is ephemeral. The spend ledger (`data/spend.json`) and live Scam Radar counts (`data/radar.json`) are written with a temp file and rename, and both disappear when the disk resets. On a free host, set `LLM_ENABLED=false` or keep `DEMO_MODE=true` so a restart cannot spend an unbounded budget. A durable ledger needs something like Turso or Upstash, which this repo does not ship. My Shield and family names stay in the browser, so they are unaffected. Sample radar counts stay in source and still show in demo mode.

## Hugging Face Docker Space

Use the same Dockerfile. Spaces expect port **7860**. The entrypoint switches to 7860 when `SPACE_ID` is set.

In the Space settings, set `DEMO_MODE=true`. Do not put API keys in the public Space README. A public Space running with `DEMO_MODE=false` would spend your credits for anyone who opens it.

## Android companion

The phone app is not a server. GitHub Actions (`.github/workflows/android-apk.yml`) builds `android/app/build/outputs/apk/debug/*.apk` and uploads it as `scamcheck-debug-apk`. Point the app’s server URL at the deployed origin. The app sends a message only when someone taps **Check with AI**.

## Turn live models on

1. Set `DEMO_MODE=false`.
2. Set `NEBIUS_API_KEY`. Set `TAVILY_API_KEY` if you want public-warning search. Set `RADAR_SALT`.
3. Optional: `SCAMCHECK_RDAP=1` for domain age. `SAFE_BROWSING_API_KEY` for Google Safe Browsing. Both stay off with no key.
4. WhatsApp replies stay off. `WHATSAPP_SEND=1` does not post to Meta. When `WHATSAPP_APP_SECRET` is set, `POST /api/whatsapp` requires a valid `X-Hub-Signature-256`. The route always returns `sent: false`.
5. Redeploy. `GET /api/readyz` should show `"mode": "live"` and `"llm": "ok"`. Run one short message and watch the trace for a real model id before you share the link. A soft budget trip forces the cheaper verdict model and blocks Super. `POST /api/admin/llm` with `Authorization: Bearer $ADMIN_SECRET` and `{ "paused": true }` pauses paid calls.
