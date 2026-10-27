# Features

Status against [research/scamcheck.md](research/scamcheck.md) and the Android companion. “Done” means the feasible version is in this repo. “Blocked” means it needs a third party we cannot approve from here. Last checked 26 Oct 2026.

Checks that day: `npm test` 51 passed, `npm run eval` 59/61, `npm run e2e` 25 passed (including axe WCAG 2.1 AA on the main pages), `npm run typecheck`, `npm run lint`, and `npm run build`. Demo load (`docs/perf.md`): p50 45 ms, p99 372 ms. Lighthouse has not been measured.

## Retention

| Feature | Status | Where | Acceptance |
| --- | --- | --- | --- |
| Share to ScamCheck (`share_target` plus paste and photo) | Done | `app/manifest.ts`, `app/share/page.tsx`, home form | Installed PWA can share text to `GET /share`. The box fills. Nothing is checked until the person taps Check. The site does not read the SMS inbox. Covered by `e2e/pages.spec.ts`. |
| WhatsApp bot | Partial | `app/whatsapp/page.tsx`, `app/api/whatsapp/route.ts` | The page explains the Meta setup. `GET` compares the verify token in constant time. `POST` checks `X-Hub-Signature-256` when `WHATSAPP_APP_SECRET` is set, rate-limits, and caps the body at 64 KB. It returns a verdict and `sent: false`. It does not call Meta. |
| Send the verdict back on WhatsApp | Blocked | — | Needs a Meta business app, a phone number id, and a Graph API call. `WHATSAPP_SEND=1` is not enough today. |
| Check for Mum: name plus a forwardable card | Done | `app/family`, `app/family/card`, `lib/card.ts` | A name stays in this browser. A Scam or Caution result can open a card with the band and the next step, not the full message. PNG download and share. Twi on the card is beta. |
| Alert a linked relative when they run a high-risk check | Done | `lib/family-local.ts`, `lib/family-alerts.ts`, `app/api/family`, `app/family/watch` | Linking someone creates a watch code. A Scam or Caution check on this phone stores the band and the pattern title, not the message, and the watch link can be opened on another phone. There is no push notification. The card is still what you forward. |
| Ghana Scam Radar | Done | `app/radar/page.tsx`, `lib/radar.ts` | Sample rows stay in source. Live checks can add a masked number. The hash is HMAC-SHA256 with `RADAR_SALT` (no default salt). Demo checks are not counted. One tap calls 292, texts 292, or dials `*170#`. Counts on a free host reset when the disk does. |
| “This number was reported N times” on the verdict | Done | `reportsForPhone`, `radarHitsFor`, result screen | A number or unofficial host already on the radar is named on the verdict, with the mask and the count from before this check. The full number is not shown. |
| One-tap CSA and MTN report | Done | `lib/official.ts`, radar, result actions | Fixed numbers only. The model cannot add one. |
| My Shield | Done | `app/shield`, `lib/shield.ts` | Last checks stay in this browser, with counts for checks, scams dodged, and GH¢ in those messages. Clearing site data clears it. Empty state is tested. |
| Weekly digest and quiz | Done | `app/digest` | Three radar rows and a three-question quiz. A perfect score once in a calendar week keeps a streak in `localStorage`. Come back next week to extend it. |
| Deliver that digest on WhatsApp | Blocked | — | Same Meta block as the bot. |
| USSD / SMS short code | Blocked | `app/ussd/page.tsx` | The page says a public short code needs a telco allocation, and it lists `*170#` and 292. It does not pretend to be a short code. |

## Detection

| Feature | Status | Where | Acceptance |
| --- | --- | --- | --- |
| Deterministic pre-check before any model | Done | `lib/precheck.ts` | Ghana phones, short codes, GH¢ amounts, links, punycode, lookalike brands by edit distance. Points are shown. `tests/beyond.test.ts`. |
| RDAP domain age and Google Safe Browsing | Partial | `lib/reputation.ts` | Off unless `SCAMCHECK_RDAP=1` or `SAFE_BROWSING_API_KEY`. No fetch otherwise. |
| Cheap-first Nemotron route | Done | `lib/routing.ts`, `lib/pipeline.ts` | Lightning classifies. Nano writes the verdict. Super only on low confidence or GH¢500+. Ultra is rejected. The screen shows the route and an estimated USD cost. Demo does not call the network. |
| Ghana pattern library | Done | `lib/patterns.ts` | 46 cards from MTN, CSA, and BoG notes. BM25 returns the nearest three when they are close to the best score. The result lists them as matches. The same three titles are added to the live prompt. |
| Cited verdict and a drop pass | Done | `lib/grounding.ts`, `lib/tavily.ts` | Lines that cite a URL or a source number we did not fetch are removed. No sources means the note says no web evidence was found. |
| Four bands and 3-sample agreement | Done | `lib/consistency.ts`, `lib/copy.ts` | Safe, Caution, Scam, Can't tell. Three samples only when confidence is under 70. In demo the votes come from the rules and the screen says the model was not called. |
| Highlighted spans and “What to do now” | Done | `lib/highlight.ts`, `lib/official.ts` | Trigger phrases are marked. Next steps are the fixed Ghana contacts. |
| Screenshot and conversation path | Partial | `lib/pipeline.ts`, home photo states | Blurry or tiny photos are rejected with a retry. In demo a photo is not sent to a model. Live mode can call the vision model only when there is no typed text. A multi-message turn is a pre-check signal, and the result says so. It is not a separate vision trajectory model. |
| Labelled eval | Done | `evals/` | 61 messages. Exact accuracy 96.7% on the offline rules. Two known gaps stay looks-ok on purpose. This is not a live Nemotron score. |
| “Not a scam” feedback | Done | `lib/not-scam.ts`, result screen | The note stays in this browser. The next similar official alert shows it, and a suspicious or unsure official alert can move to Safe. A PIN or OTP request, and any Scam band, stay a warning. |
| Mask PIN and OTP before a live model call | Done | `lib/redact.ts`, `lib/prompts.ts`, `lib/pipeline.ts` | PIN, OTP, password, and Ghana Card values are replaced with `[redacted]` before a live prompt or search query is built. Phone numbers stay, because they are what the check is about. Demo mode does not call the network. |

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
| Light and dark, 360 / 768 / 1440 | Done | `design/scamcheck/tokens.css`, `components.css` | v2 spec: indigo accent on `#FAFAFA` / `#0C0C0E`, Bricolage + Atkinson Hyperlegible Next/Mono, 52px targets, 4-segment meter. No kente strips. Desktop layout breaks at 960px. |
| Lighthouse 90 or better | Todo | Not measured on this pass. Run it on `npm run build && npm start`. |
| Favicon and Open Graph image | Done | `public/favicon.svg`, `app/icon.svg`, 192/512 PNGs on `#FAFAFA`, `public/og.png`. |
| Deploy config, sample mode on | Done | `Dockerfile`, `render.yaml`, `vercel.json`, `.env.example`, [DEPLOY.md](DEPLOY.md). Nothing is deployed until hosting is connected. |
