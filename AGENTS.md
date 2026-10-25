<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ScamCheck GH

A checker for suspicious MoMo, SMS, and WhatsApp messages in Ghana. The person pastes a message and gets Safe, Caution, Scam, or Can't tell, plus the numbers to call.

Read [docs/FEATURES.md](docs/FEATURES.md) before adding scope, [docs/DECISIONS.md](docs/DECISIONS.md) before changing the pipeline, and [docs/ROADMAP.md](docs/ROADMAP.md) for what is still open. The briefs are in [docs/research](docs/research). Brand and tokens are in [docs/design](docs/design).

## How to run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:4317. Sample mode is on. No key is required.

```bash
npm test
npm run eval
npm run typecheck
npm run lint
npm run e2e
npm run build && npm start
```

`e2e` starts the dev server itself. `DEMO_MODE=true` is set in `playwright.config.ts`.

## How to deploy

[docs/DEPLOY.md](docs/DEPLOY.md). `Dockerfile` and `render.yaml` for Render or a Hugging Face Docker Space. `vercel.json` for Vercel. Copy `.env.example`. Leave `DEMO_MODE=true` until someone accepts the API budget.

Push `main` to `origin` and to the `github` remote (`https://github.com/Xclusivkhodes/scamcheck-gh`). Never commit `.env`, API keys, or a filled `.env.local`.

## Constraints

- `DEMO_MODE` defaults on. Live Nebius or Tavily calls need an explicit OK and `DEMO_MODE=false` plus the keys. Tests and Playwright stay on sample mode.
- Token ceilings: 1000 per call, 2400 per check. Ultra is rejected. Super is only for a low-confidence or high-amount verdict.
- Do not read the SMS inbox from the website. The Android app may, only after an explanation and a permission grant, and only uploads when the person taps Check with AI.
- Contacts in `lib/official.ts` are fixed. Do not let a model invent a phone number. No 419 in the UI.
- Design is v1.1: light `#FAFAFA`, dark `#0F0F11`, brand as accent, thin kente rule. Do not put colour overrides in `app/extras.css`. Do not use emoji as icons. Do not use a lattice or a woven page background.
- Copy says “Not saved to disk” because a 15-minute memory cache exists.
- Twi is an unverified beta. Say so in the UI if you add Twi strings.
- Professional bar: every state (loading, empty, error, offline), unit tests, Playwright, WCAG AA, Lighthouse 90 or better once measured, a README that matches the code.

## Layout

```
app/                 pages and route handlers
components/          client UI; checker-app.tsx is the check flow
lib/pipeline.ts      demo or live check
lib/precheck.ts      rules before any model
lib/heuristics.ts    offline verdict the demo and the eval use
lib/patterns.ts      46 curated Ghana cards
lib/routing.ts       Lightning, Nano, Super
lib/official.ts      phone numbers
android/             Kotlin companion and the JVM classifier
evals/               labelled messages
e2e/                 Playwright
hackathon/design/    compiled CSS the app imports
```

## Conventions

- TypeScript, strict. Path alias `@/`.
- Internal verdicts stay `looks_ok | suspicious | scam | unsure`. UI copy goes through `verdictWord` in `lib/copy.ts`.
- Server code only talks to Nebius and Tavily. The browser talks to `/api/check`.
- `export const dynamic` is incompatible with `cacheComponents`. Use `connection()` or a request read instead.
- Heuristic changes need `npm test` and `npm run eval`. A new miss is a known gap only when flagging it would punish ordinary messages.
- Android classifier tests stay in `android/classifier` with no Android SDK imports, so they can run on a JVM.
- Do not add auth, a database, or a second component library. shadcn primitives are already available; the check UI uses the design-pack classes.
- Update [docs/FEATURES.md](docs/FEATURES.md) and [docs/ROADMAP.md](docs/ROADMAP.md) when a feature’s status changes.
