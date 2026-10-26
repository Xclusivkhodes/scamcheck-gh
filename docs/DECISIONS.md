# Decisions

Written 25 Oct 2026 so the next person does not have to reconstruct them from chat.

## One Next.js app

The site and the API are the same Next.js 16 app. Vercel, Render, and a Hugging Face Docker Space are three ways to host that app, not a split frontend and API. Route handlers live in `app/api`. See [DEPLOY.md](DEPLOY.md).

## Sample mode is the default

`isDemoMode()` in `lib/config.ts` is true unless `DEMO_MODE` is `false`, `0`, or `no`. Unset means sample mode. Demo checks never call Nebius or Tavily. Do not turn live mode on without an explicit OK for the API budget.

## Model route

Catalog prices used for the estimate (25 Oct 2026, USD per 1M tokens): Lightning and Nano $0.06 / $0.24, Super and the vision model $0.30 / $0.90. Ultra is listed in the brief for disputed cases. This app rejects any model id containing “ultra” (`lib/nebius.ts`, `lib/config.ts`). There is no separate guard model on Nebius, so the cheap pass is another Nemotron, not a second vendor.

- Classify: `nvidia/Nemotron-3_5-Lightning`
- Verdict: `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`
- Verdict moves to `nvidia/nemotron-3-super-120b-a12b` only when confidence is under 70, or the amount is at least GH¢500, or the pre-check is mid-range and confidence is under 80 (`lib/routing.ts`)
- A photo with no typed text, and only when demo mode is off: `nvidia/Nemotron-3.5-Super-VL`

Token ceilings in code: 1000 per call, 2400 across one check. Super’s verdict call is capped at 1000. Env values above those ceilings are clamped (`lib/budget.ts`).

## Four public bands, four internal types

The screen says Safe, Caution, Scam, or Can't tell. The code still uses `looks_ok`, `suspicious`, `scam`, and `unsure`. Confidence under 60 becomes `unsure` (`lib/finalize.ts` and `lib/intel.ts`). A vague note must not become a warning.

## Rules before the model

Ghana numbers, `*170#`-style codes, amounts, links, punycode, and lookalike brands run in `lib/precheck.ts` before any model call. Official hosts and “do not share your PIN” can hold a normal alert at Safe. RDAP runs only when `SCAMCHECK_RDAP=1`. Safe Browsing runs only with `SAFE_BROWSING_API_KEY`. Otherwise those lookups are skipped and do not fetch.

## What is stored

- A finished check can sit in process memory for 15 minutes so a repeat paste is cheap. The UI says “Not saved to disk”, not “Not stored”.
- Scam Radar may write `data/radar.json`: a mask, a salted hash, a pattern, and a count. Not the message. Tests skip this when `VITEST` is set. Free hosts have ephemeral disks, so those counts reset on restart. The page always has a built-in sample.
- My Shield and family names are `localStorage` only (`scamcheck-shield`, `scamcheck-family`).
- The forwardable card does not include the full message.
- The website does not read the SMS inbox. The Android app can, only after the person allows it, and it uploads a message only when they tap Check with AI.

## Secrets are stripped before a live prompt

`redactSecrets` in `lib/redact.ts` runs on the text, the search queries, and the prompt builders. PIN, OTP, password, and Ghana Card values become `[redacted]`. Phone numbers are kept. The rules and the on-screen message still see the original text. Demo mode never reaches this call.

## “Not a scam” stays on the device

The mark is `localStorage` key `scamcheck-not-scam`. It can move a later official alert from Caution or Can't tell to Safe. It does not change a Scam band, and it does not apply when the message asks for a PIN, OTP, or password. The server verdict is unchanged.

## A family watch link is not an account

`POST /api/family` accepts a code, a band (`scam` or `suspicious`), and a short pattern title. It rejects a body that includes `text` or `message`, and it rejects a title that contains a long digit run. `data/family-alerts.json` is gitignored. There is no push channel.

## WhatsApp does not call Meta

`POST /api/whatsapp` runs the same checker and returns the verdict. It does not POST to the Graph API, even if `WHATSAPP_SEND=1`. A real reply needs a Meta business app, a test number, and a later code change. `GET` only answers the verify handshake when `WHATSAPP_VERIFY_TOKEN` matches.

## Contacts are fixed

`lib/official.ts` is human-checked: MTN `*170#`, report path `*170#` › 6 › 4, `mmfraudteam.GH@mtn.com`, care 100, CSA 292 (call, text, `report@csa.gov.gh`, WhatsApp 0501603111), Police 191 and 18555. AT Money has no verified number. Telecel numbers are omitted until they are confirmed. The model cannot add a phone number. Do not put 419 in the product UI.

## Android is a sideload

`minSdk` 26, application id `gh.scamcheck.app`. SMS permissions are explained and the app still works if they are declined. Play would need the SMS permissions declaration. That approval is not in scope. GitHub Actions builds the debug APK; this environment has no Android SDK, so the APK is not produced here. The classifier module is plain JVM so its tests do not need an emulator.

## Design v1.1

Zinc neutrals, brand as accent, thin kente rule. `app/extras.css` may change layout. It must not override `--color-*`. Theme key is `sc-theme`. `data-theme` is set only after a saved or query choice, so the OS preference applies until then.

An early `design/tokens.json` used cream paper and a green primary. That file was removed. Do not bring it back.

## Next.js 16 cache components

`output: "standalone"` for Docker. `cacheComponents` rejects `export const dynamic`. API routes stay dynamic because they read the request, or because they call `connection()` from `next/server`. `/share` and `/family/card` read `searchParams` inside `<Suspense>`. Dev HMR from `127.0.0.1` needs `allowedDevOrigins`.

## Eval is the offline baseline

`npm run eval` scores `lib/heuristics.ts` on `evals/dataset.ts`. It does not call a model. Last run: 59/61 exact (96.7%). Two misses are marked `knownGap`: urgency with no amount, number, or link, and a parcel note with no amount, phone, or link. Do not “fix” those by flagging every urgent sentence. That is how real receipts become false alarms.

## Spend file tracing

`lib/spend.ts` reads `data/spend.json`. The path can also come from `SPEND_FILE`, which made the production trace pull in the whole repo. The read is marked `turbopackIgnore` so the standalone server does not ship the source tree.
