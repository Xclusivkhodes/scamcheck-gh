# Deploy ScamCheck GH

The site and the API are one Next.js app. `DEMO_MODE` defaults to on. A host with no env file still serves sample checks and does not call Nebius or Tavily.

Set `DEMO_MODE=false` only after you accept the API cost. You then need `NEBIUS_API_KEY` and `TAVILY_API_KEY`. Copy `.env.example` and fill those in. Do not commit `.env`.

`NEXT_PUBLIC_SITE_URL` should be the public https origin, with no trailing slash. It is used for Open Graph and the sitemap.

## Vercel (frontend and API together)

1. Import the repo. Framework preset: Next.js. Root directory: the repo root.
2. `vercel.json` sets `npm ci` and `npm run build`.
3. Environment:
   - `DEMO_MODE` = `true`
   - `NEXT_PUBLIC_SITE_URL` = your Vercel URL
4. Leave the Nebius and Tavily keys empty until you turn sample mode off.
5. Deploy. `GET /api/health` should return `"demoMode": true`.

## Render (Docker)

`render.yaml` describes a Docker web service. The health check is `GET /api/health`.

1. New Web Service → Docker, or apply the blueprint.
2. The image listens on `PORT` (Render sets this). Local and the Dockerfile default to `4317` when `PORT` is unset.
3. Set `NEXT_PUBLIC_SITE_URL` in the dashboard. `DEMO_MODE` is already `true` in the blueprint.
4. The free plan’s disk is ephemeral. Scam Radar counts that are not the built-in samples live in `data/radar.json` and disappear on restart. My Shield and family names stay in the browser, so they are unaffected.

## Hugging Face Docker Space

Use the same Dockerfile. Spaces expect port **7860**. The entrypoint switches to 7860 when `SPACE_ID` is set.

In the Space settings, set `DEMO_MODE=true`. Do not put API keys in the public Space README. A public Space running with `DEMO_MODE=false` would spend your credits for anyone who opens it.

## Android companion

The phone app is not a server. GitHub Actions (`.github/workflows/android-apk.yml`) builds `android/app/build/outputs/apk/debug/*.apk` and uploads it as `scamcheck-debug-apk`. Point the app’s server URL at the deployed origin. The app sends a message only when someone taps **Check with AI**.

## Turn live models on

1. Set `DEMO_MODE=false`.
2. Set `NEBIUS_API_KEY` and `TAVILY_API_KEY`.
3. Optional: `SCAMCHECK_RDAP=1` for domain age. `SAFE_BROWSING_API_KEY` for Google Safe Browsing. Both stay off with no key.
4. WhatsApp replies stay off until `WHATSAPP_SEND=1` plus `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID`. The route still does not post to Meta in this build. See the list in the README.
5. Redeploy. Check `/api/health`: `demoMode` is false and `nebiusConfigured` is true. Run one short message and watch the trace for a real model id before you share the link.
