# ScamCheck GH

A mobile-first check for suspicious MoMo, SMS, and WhatsApp messages in Ghana. Paste a message and get one of four bands — **Safe**, **Caution**, **Scam**, or **Can't tell** — plus the numbers to call.

Sample mode is the default. It does not call Nebius or Tavily.

New here? Read [AGENTS.md](AGENTS.md), then [docs/FEATURES.md](docs/FEATURES.md) for what is built and [docs/ROADMAP.md](docs/ROADMAP.md) for what is left. Decisions are in [docs/DECISIONS.md](docs/DECISIONS.md). Deploy steps are in [docs/DEPLOY.md](docs/DEPLOY.md).

## Run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:4317

```bash
npm test          # unit
npm run eval      # offline labelled set, no model calls
npm run typecheck
npm run lint
npm run e2e       # Playwright, sample mode, port 4317
npm run build && npm start
```

Copy `.env.example` to `.env` only when you mean to leave sample mode. Set `DEMO_MODE=false` only after the API budget is accepted. You need `NEBIUS_API_KEY` and `TAVILY_API_KEY`. Do not commit `.env`.

On 25 Oct 2026: unit tests 30 passed, eval 59/61 (96.7%), Playwright 20 passed, production build succeeded. Lighthouse has not been measured yet.

## Why this is not a vague warning

| Gap | What ScamCheck does |
| --- | --- |
| Android scam detection lists no African country, and Messages launched in the US, UK, and Canada first. | The pattern library is Ghana MoMo: fake reversals, PIN asks, promo fees, fake GRA links. Next steps are CSA 292 and MTN `*170#`. |
| Other apps often stop at “likely suspicious”. | The screen uses four bands. A sure scam says **Scam**. A thin case says **Can't tell**. |
| Real receipts and family texts get flagged as spam elsewhere. | Official hosts and “do not share your PIN” lower the score. A normal alert can stay **Safe**. A vague note does not become a warning. |

Twi strings are a **beta** translation. A native speaker has not checked them.

## What a check does

1. **Rules, before any model.** Ghana numbers, `*170#`-style short codes, GH¢ amounts, links, punycode, and lookalike brands by edit distance. Domain age (public RDAP) and Google Safe Browsing run only if you opt in.
2. **Pattern library.** The nearest of 46 curated examples is shown, for example “Fake wrong transfer (MTN MoMo, 2024)”.
3. **Cheap model first.** Lightning classifies. Nano writes the answer. Super is used only when the first pass is under 70% sure or the amount is at least GH¢500. Ultra is rejected.
4. **Three samples when it is unsure.** In sample mode the votes come from the rules. Live mode calls Lightning three times only in that case, and only if the token budget allows it.
5. **A second pass drops unsupported lines.** A sentence that names a link or a source number we did not fetch is removed.
6. **Fixed contacts.** MTN `*170#`, care 100, CSA 292, Police 191 / 18555. The model cannot add a number.

## Coming back

- **Share to ScamCheck.** The manifest has a `share_target` for `/share`. Install the PWA and share text into the box. Nothing is read from the SMS inbox.
- **WhatsApp.** `/whatsapp` and `POST /api/whatsapp` return a verdict. They do not send a WhatsApp message. A Meta app is still required. See [docs/FEATURES.md](docs/FEATURES.md).
- **Check for Mum.** `/family` stores a name in this browser. The card at `/family/card` has the band and the next step, not the full message.
- **Ghana Scam Radar.** `/radar` lists sample patterns plus anonymised checks from this server.
- **My Shield, this week, USSD.** `/shield` is on-device history. `/digest` is the quiz. `/ussd` explains why there is no public short code.

## Android

The companion is in `android/`. It is a sideload debug APK, not a Play listing. Install steps, including Android 13+ **Allow restricted settings**, are in [android/PRIVACY.md](android/PRIVACY.md). GitHub Actions (`.github/workflows/android-apk.yml`) builds the APK. The app keeps message text on the phone unless the person taps **Check with AI**.

## Layout

```
app/api/check        check
app/api/whatsapp     bot stub
lib/precheck.ts      numbers, links, lookalikes
lib/patterns.ts      Ghana pattern library
lib/routing.ts       Lightning, Nano, Super
lib/pipeline.ts      demo or live check
lib/official.ts      human-checked numbers
android/             phone companion
```

Design tokens: [docs/design](docs/design) and `hackathon/design/scamcheck-gh`. Light `#FAFAFA`, dark `#0F0F11`.

License: MIT.
