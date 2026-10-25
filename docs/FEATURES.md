# Features

Status against [research/scamcheck.md](research/scamcheck.md) and the Android companion. “Done” means the feasible version is in this repo. “Blocked” means it needs a third party we cannot approve from here. Last checked 25 Oct 2026.

Checks that had been run that day: `npm test` 30 passed, `npm run eval` 59/61, `npm run e2e` 20 passed (including axe WCAG 2.1 AA on the main pages), `npm run build` succeeded. Lighthouse had not been run.

## Retention

| Feature | Status | Where | Acceptance |
| --- | --- | --- | --- |
| Share to ScamCheck (`share_target` plus paste and photo) | Done | `app/manifest.ts`, `app/share/page.tsx`, home form | Installed PWA can share text to `GET /share`. The box fills. Nothing is checked until the person taps Check. The site does not read the SMS inbox. Covered by `e2e/pages.spec.ts`. |
| WhatsApp bot | Partial | `app/whatsapp/page.tsx`, `app/api/whatsapp/route.ts` | The page explains the Meta setup. `GET` can complete the verify handshake. `POST` returns a verdict from the same pipeline. It does not send a WhatsApp message. |
| Send the verdict back on WhatsApp | Blocked | — | Needs a Meta business app, a phone number id, and a Graph API call. `WHATSAPP_SEND=1` is not enough today. |
| Check for Mum: name plus a forwardable card | Done | `app/family`, `app/family/card`, `lib/card.ts` | A name stays in this browser. A Scam or Caution result can open a card with the band and the next step, not the full message. PNG download and share. Twi on the card is beta. |
| Alert a linked relative when they run a high-risk check | Todo | — | No accounts and no push channel. The card is something you forward yourself. |
| Ghana Scam Radar | Partial | `app/radar/page.tsx`, `lib/radar.ts` | Sample rows plus anonymised checks (mask and hash, no message). One tap calls 292, texts 292, or dials `*170#`. Counts on a free host reset when the disk does. |
| “This number was reported N times” on the verdict | Todo | `reportsForPhone` in `lib/radar.ts` | The helper exists. The result screen does not show it yet. |
| One-tap CSA and MTN report | Done | `lib/official.ts`, radar, result actions | Fixed numbers only. The model cannot add one. |
| My Shield | Done | `app/shield`, `lib/shield.ts` | Last checks stay in this browser, with counts for checks, scams dodged, and GH¢ in those messages. Clearing site data clears it. Empty state is tested. |
| Weekly digest and quiz | Partial | `app/digest` | Three radar rows and a three-question quiz. A perfect score keeps a streak in `localStorage`. |
| Deliver that digest on WhatsApp | Blocked | — | Same Meta block as the bot. |
| USSD / SMS short code | Blocked | `app/ussd/page.tsx` | The page says a public short code needs a telco allocation, and it lists `*170#` and 292. It does not pretend to be a short code. |

## Detection

| Feature | Status | Where | Acceptance |
| --- | --- | --- | --- |
| Deterministic pre-check before any model | Done | `lib/precheck.ts` | Ghana phones, short codes, GH¢ amounts, links, punycode, lookalike brands by edit distance. Points are shown. `tests/beyond.test.ts`. |
| RDAP domain age and Google Safe Browsing | Partial | `lib/reputation.ts` | Off unless `SCAMCHECK_RDAP=1` or `SAFE_BROWSING_API_KEY`. No fetch otherwise. |
| Cheap-first Nemotron route | Done | `lib/routing.ts`, `lib/pipeline.ts` | Lightning classifies. Nano writes the verdict. Super only on low confidence or GH¢500+. Ultra is rejected. The screen shows the route and an estimated USD cost. Demo does not call the network. |
| Ghana pattern library | Partial | `lib/patterns.ts` | 46 cards from MTN, CSA, and BoG notes. BM25 returns the single best match over a score of 1.2, not the nearest three. The result names the match. |
| Cited verdict and a drop pass | Done | `lib/grounding.ts`, `lib/tavily.ts` | Lines that cite a URL or a source number we did not fetch are removed. No sources means the note says no web evidence was found. |
| Four bands and 3-sample agreement | Done | `lib/consistency.ts`, `lib/copy.ts` | Safe, Caution, Scam, Can't tell. Three samples only when confidence is under 70. In demo the votes come from the rules and the screen says the model was not called. |
| Highlighted spans and “What to do now” | Done | `lib/highlight.ts`, `lib/official.ts` | Trigger phrases are marked. Next steps are the fixed Ghana contacts. |
| Screenshot and conversation path | Partial | `lib/pipeline.ts`, home photo states | Blurry or tiny photos are rejected with a retry. In demo a photo is not sent to a model. Live mode can call the vision model only when there is no typed text. A multi-message “turn” is a pre-check signal, not a separate vision trajectory model. |
| Labelled eval | Done | `evals/` | 61 messages. Exact accuracy 96.7% on the offline rules. Two known gaps stay looks-ok on purpose. This is not a live Nemotron score. |
| “Not a scam” feedback | Todo | — | No control that records a false alarm and changes a later score. |
| Mask PIN and phone before a live model call | Todo | — | The privacy page tells people not to type a PIN. The live prompt is not redacted first. |

## Competitor gaps on the home page

| Gap | Status | Acceptance |
| --- | --- | --- |
| No African country in Android’s built-in scam detection | Done | Home section “Built for Ghana”, plus the pattern library and 292 / `*170#`. |
| Vague “likely suspicious” | Done | The verdict word is one of the four bands. |
| False alarms on real receipts | Done | Official hosts and “do not share your PIN” can stay Safe. The vague station message stays Can't tell. Both are in the eval and in Playwright. |

## Android companion

| Feature | Status | Where | Acceptance |
| --- | --- | --- | --- |
| Kotlin app, minSdk 26 | Done | `android/` | Explanation screen, then SMS permission. The app still pastes and checks if SMS is denied. |
| On-device pre-check | Done | `android/classifier` | Same idea as the web pre-check: phones, short codes, links, lookalikes, Ghana phrases. Bands Scam, Caution, Safe, Can't tell. JUnit tests are in the module. They have not been executed on this machine (no Android SDK). CI runs them. |
| Incoming SMS | Done | `SmsReceiver` | Saves on device. Notifies only for Scam and Caution. Notification shows the band. |
| Scan recent messages | Done | `ScanActivity` | Needs READ_SMS. Re-opening the inbox does not duplicate a saved row. |
| Optional Check with AI | Done | `ApiClient`, `ResultActivity` | POST to the saved base URL, `/api/check`, no key in the APK. Default server is sample mode. |
| Debug APK in GitHub Actions | Done | `.github/workflows/android-apk.yml` | Workflow builds `:classifier:test` and `:app:assembleDebug` and uploads the APK. A green run is still required on GitHub. |
| Play Store listing | Blocked | `android/PRIVACY.md` | SMS permissions need Google’s declaration. Do not ship them on Play without it. |

## Product bar

| Item | Status | Acceptance |
| --- | --- | --- |
| Streaming, empty, error and retry, offline queue, slow warning, blurry photo, low confidence | Done | Home and checking views in `components/checker-app.tsx`. |
| About, privacy, disclaimer, 404 | Done | Playwright opens each, including the 404. |
| Unit tests, eval, Playwright, axe | Done | Commands in the README. Re-run after you change heuristics or copy. |
| Light and dark, 360 / 768 / 1440 | Partial | Tokens and the theme toggle are in. Desktop layout breaks at 960px. Screenshots were not saved. |
| Lighthouse 90 or better | Todo | Not measured. Run it on `npm run build && npm start` before calling the bar met. |
| Favicon and Open Graph image | Done | `public/favicon.ico`, icons, `public/og.png`. |
| Deploy config, sample mode on | Done | `Dockerfile`, `render.yaml`, `vercel.json`, `.env.example`, [DEPLOY.md](DEPLOY.md). Nothing is deployed until hosting is connected. |
