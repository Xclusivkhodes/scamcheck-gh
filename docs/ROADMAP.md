# Roadmap

Order is what to do next, not a calendar. Live model spend stays off until someone accepts the API budget.

## 1. Prove the bar that is still unmeasured

- Run Lighthouse on the production server (`npm run build && npm start`) for `/`, `/about`, `/privacy`, and `/disclaimer`. Performance, accessibility, best practices, and SEO each need 90 or better. Fix what fails. Record the scores in [FEATURES.md](FEATURES.md).
- Light and dark screenshots at 360, 768, and 1440 are in `docs/screenshots/` for the home page and a Scam result (v2 indigo, no kente). Radar, family, and Shield are at 390.
- Confirm a GitHub Actions run of `.github/workflows/android-apk.yml` and `.github/workflows/web.yml` is green. This machine cannot compile the APK.

## 2. Close detection gaps that do not need a vendor

Done 26 Oct 2026. Tests cover each one.

- Show `reportsForPhone` on the verdict when a number in the message is already on the radar.
- Return the nearest three pattern cards, not only the best one, and show them as “matches”.
- Redact PIN-like and OTP-like strings before any live prompt is built. Phone numbers stay. The demo path makes no network calls.
- Add a “Not a scam” control that stays on the device and is visible the next time a similar official alert is checked. It does not silence a PIN request or a Scam band.

A high-risk check can also raise a family alert. The watch link stores the band and the pattern title. It does not push a notification, and it does not store the message.

## 3. Live models, only after a budget OK

- Set `DEMO_MODE=false` with `NEBIUS_API_KEY` and `TAVILY_API_KEY` on the host, not in git.
- Run one short message, read `/api/readyz` (`mode` is `live`, `llm` is `ok`), and confirm the trace shows Lightning then Nano and that Ultra is absent. `/api/health` uses that same short shape and does not list model ids.
- Re-score a slice of `evals/dataset.ts` through `POST /api/check`. Publish precision and recall next to the offline 96.7%. Keep the two known gaps unless a live model beats them without new false alarms.
- Optional: `SCAMCHECK_RDAP=1` and `SAFE_BROWSING_API_KEY`.

## 4. Needs someone outside this repo

- WhatsApp send: a Meta app, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, and a real Graph call. Until then the stub must keep returning `sent: false`.
- A public USSD or SMS short code: a telco allocation. Do not invent a code on the site.
- Play Store: the SMS permissions declaration. The sideload APK and the restricted-settings steps in `android/PRIVACY.md` stay the install path.
- Twi: a native speaker reviews the strings in `lib/copy.ts` and `lib/i18n.ts` before the beta label comes off.

## 5. Leave alone unless a test forces it

- Do not flag “send the money now” when there is no amount, number, link, or named organisation.
- Do not store message text in Radar, My Shield’s server, or the family card.
- Do not raise the token ceilings past 1000 per call and 2400 per check without a new decision in [DECISIONS.md](DECISIONS.md).
