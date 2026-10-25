# ScamCheck GH — Brand & design system

> **Check before you send.** A warm, plain-spoken scam checker for Ghana’s mobile-money users.
> NVIDIA Nemotron reads the message, Tavily finds the proof, and the user gets a clear answer and what to do now.

Folder map
```
scamcheck-gh/
  NAME.md            name check + taglines
  BRAND.md           this file
  LICENSES.md        fonts, icons, tools
  tokens.json        SOURCE OF TRUTH for tokens
  tokens.css         generated CSS custom properties (light; dark via prefers-color-scheme or [data-theme=dark])
  tailwind.config.js generated Tailwind theme extension (points at the CSS vars)
  components.css     shared component layer (plain CSS, works without Tailwind)
  logo/              mark, lockups (light/dark), wordmark, app icon + Android adaptive layers, favicons (svg/png/ico)
  html/              reference screens (index.html links them all); html/_src = sources with icon placeholders
  mockups/           360x800@2x PNGs, 1440 desktop, 00-board.png presentation board
```

---

## 1. Design direction

**Warm, local, trustworthy. Not a Western fintech clone.**
- **Adinkra ink** (deep indigo) is the voice of authority. Adinkra cloth is traditionally printed in dark dye, and the indigo also keeps us clearly apart from MTN yellow, Telecel red and AT blue. A scam checker must never look like the network it is warning about.
- **Kente gold** is used sparingly. The woven kente band now appears **only in the logo mark**. Everywhere else, `.kente` is a quiet 2–3 px solid accent rule (v1.1): the hero underline, the top edge of verdict cards and the emergency banner. Keep the product restrained, like a polished consumer fintech app, not a festival poster.
- **Neutral backgrounds (v1.1).** Pages use plain zinc neutrals: near-white `#FAFAFA` in light mode and near-black `#0F0F11` in dark mode. Surfaces and borders are neutral greys too. Brand colour appears **only as an accent**: buttons, links, the logo, verdict cards and banners, the kente band, focus rings and charts. *(v1.0 had calico-cream backgrounds and a navy-tinted dark mode. Both are retired.)*
- **No decorative page backgrounds (v1.1).** The diamond lattice is retired; the `.lattice` class remains as a no-op. The kente band survives only as a thin accent: on the logo, the hero underline, the top of verdict cards and the emergency banner. Never use it as a page-level band.
- **Logo:** a speech bubble (the message) wearing a kente band, with a bold check. The meaning: *“this message has been checked, the Ghanaian way.”* It reads at 16 px (the favicon uses a solid band).

## 2. Palette (v1.1: neutral modes)

Primitives live in `tokens.json → primitive`. Use **semantic roles** (`--color-*`) in product code, never the primitives. In v1.1 the `neutral` ramp is **zinc** (it used to be warm calico). The token names did not change.

**Modes.** Light is the default. Dark applies automatically through `@media (prefers-color-scheme: dark)`. You can force either one with `<html data-theme="light">` or `<html data-theme="dark">`. The reference HTML includes a sun/moon `.theme-toggle` button that saves the choice in `localStorage('sc-theme')`. You can also pass `?theme=light|dark` in the URL.

| Role | Light | Dark | Notes |
|---|---|---|---|
| `bg` | `#FAFAFA` | `#0F0F11` | Page background. Neutral, never tinted |
| `surface` / `surface-raised` | `#FFFFFF` / `#FFFFFF` | `#18181B` / `#1F1F23` | Cards, inputs |
| `surface-sunken` | `#F4F4F5` | `#0A0A0C` | Chips, I/O blocks, source rows, tracks |
| `border` / `border-strong` | `#E4E4E7` / `#D4D4D8` | `#27272A` / `#3F3F46` | |
| `surface-inverse` | `#18181B` | `#FAFAFA` | Rare. Prefer a fixed `neutral-900` panel for "dark strip" UI so it stays dark in both modes |
| `text` / `text-muted` / `text-subtle` | `#18181B` / `#52525B` / `#696971` | `#FAFAFA` / `#A1A1AA` / `#8E8E97` | Subtle is for placeholders and meta only |
| `primary` (Adinkra ink → gold in dark) | `#1B2559` | `#F0AE2E` | Primary buttons, active step, progress |
| `accent` (Kente gold) | `#F0AE2E` | `#F0AE2E` | Kente band, onboarding numbers, emergency CTA. Gold is a **fill only**; never use it as text on light backgrounds |
| `primary-soft` / `on-primary-soft` | `#F1F3FB` / `#1F2B6B` | `#2A2416` / `#FADB8F` | Soft buttons, citation chips. Gold-tinted in dark to match the gold primary |
| `info` bg / fg / border | `#F1F3FB` / `#283682` / `#C3CBEC` | `#191D33` / `#C3CBEC` / `#2E3664` | Indigo accent banner/chip |
| **Scam** bg / fg / border / solid | `#FFF2EF` / `#962614` / `#FDBBAE` / `#B8301B` | `#2A1411` / `#FDBBAE` / `#6A2519` / `#F48D7A` | Stop-sign icon (`octagon-x`) |
| **Suspicious** bg / fg / border / solid | `#FFF5E6` / `#8C4705` / `#FFCB85` / `#A85605` | `#2A1D0C` / `#FFCB85` / `#6A4212` / `#F9A94A` | Triangle (`triangle-alert`) |
| **Looks OK** bg / fg / border / solid | `#EEFAF3` / `#12643C` / `#A3E2BF` / `#167D4A` | `#0E2419` / `#A3E2BF` / `#1C4D34` / `#6BCB97` | Circle tick (`circle-check-big`) |
| `on-*-solid` | `#FFFFFF` | `#18181B` | Text/icon on solid verdict fills |
| `tool-nemotron` / `-ink` | `#76B900` / `#3E6400` | `#76B900` / `#A6E05A` | Dot or bar only. Text uses `-ink` |
| `tool-tavily` / `-ink` | `#3B6FE0` / `#1F4BB0` | `#7FA3F5` / `#A9C1FA` | Dot or bar only. Text uses `-ink` |

Shadows are now neutral `rgba(9,9,11,…)` (they used to be navy-tinted).

### Contrast (WCAG 2.2, re-computed for v1.1 by `_build/gen_tokens.py`)
| Pair (fg on bg) | Light | Dark |
|---|---|---|
| `text` on `bg` | #111113 on #FAFAFA = **18.07** AAA | #F4F4F5 on #111113 = **17.16** AAA |
| `text` on `surface` | #111113 on #FFFFFF = **18.86** AAA | #F4F4F5 on #18181B = **16.12** AAA |
| `text-muted` on `bg` | #52525B on #FAFAFA = **7.41** AAA | #A1A1AA on #111113 = **7.36** AAA |
| `text-muted` on `surface` | #52525B on #FFFFFF = **7.73** AAA | #A1A1AA on #18181B = **6.91** AA |
| `text-subtle` on `surface` | #71717A on #FFFFFF = **4.83** AA | #8E8E97 on #18181B = **5.46** AA |
| `on-primary` on `primary` | #FFFFFF on #0B7A73 = **5.19** AA | #042826 on #5FCDC3 = **8.23** AAA |
| `on-primary-soft` on `primary-soft` | #0E4E4B on #ECFAF8 = **8.87** AAA | #9FE4DC on #10302E = **9.84** AAA |
| `on-accent` on `accent` | #FFFFFF on #6A4FD3 = **5.72** AA | #1A1240 on #B9AAF8 = **8.44** AAA |
| `on-accent-soft` on `accent-soft` | #573EB3 on #F5F3FF = **6.97** AA | #D7CFFC on #211C36 = **11.07** AAA |
| `link` on `surface` | #0B625D on #FFFFFF = **7.19** AAA | #5FCDC3 on #18181B = **9.29** AAA |
| `focus` on `bg` | #6A4FD3 on #FAFAFA = **5.48** AA | #B9AAF8 on #111113 = **9.13** AAA |
| `scam-fg` on `scam-bg` | #A3231F on #FEF2F2 = **6.81** AA | #FCA5A5 on #2A1414 = **9.15** AAA |
| `on-scam-solid` on `scam-solid` | #FFFFFF on #C9302C = **5.33** AA | #111113 on #F87171 = **6.82** AA |
| `scam-solid` on `surface` | #C9302C on #FFFFFF = **5.33** AA | #F87171 on #18181B = **6.40** AA |
| `suspicious-fg` on `suspicious-bg` | #92400E on #FFF8EB = **6.71** AA | #F6B556 on #2A1E0E = **9.04** AAA |
| `on-suspicious-solid` on `suspicious-solid` | #FFFFFF on #B45309 = **5.02** AA | #111113 on #F6B556 = **10.47** AAA |
| `suspicious-solid` on `surface` | #B45309 on #FFFFFF = **5.02** AA | #F6B556 on #18181B = **9.84** AAA |
| `ok-fg` on `ok-bg` | #166534 on #F0FDF4 = **6.81** AA | #86EFAC on #11241A = **11.58** AAA |
| `on-ok-solid` on `ok-solid` | #FFFFFF on #15803D = **5.02** AA | #111113 on #4ADE80 = **10.82** AAA |
| `ok-solid` on `surface` | #15803D on #FFFFFF = **5.02** AA | #4ADE80 on #18181B = **10.17** AAA |
| `info-fg` on `info-bg` | #3F3F46 on #F4F4F5 = **9.50** AAA | #D4D4D8 on #202023 = **10.99** AAA |
| `text-inverse` on `surface-inverse` | #FFFFFF on #18181B = **17.72** AAA | #111113 on #F4F4F5 = **17.16** AAA |
| `text-on-inverse-muted` on `surface-inverse` | #D4D4D8 on #18181B = **11.99** AAA | #52525B on #F4F4F5 = **7.03** AAA |
| `tool-nemotron-ink` on `surface` | #3E6400 on #FFFFFF = **6.94** AA | #A6E05A on #18181B = **11.33** AAA |
| `tool-tavily-ink` on `surface` | #1F4BB0 on #FFFFFF = **7.80** AAA | #A9C1FA on #18181B = **9.87** AAA |

Every text pair passes **AA (4.5:1)** in both modes, and most pass AAA. The lowest is `text-subtle` on `surface-sunken` in light mode, at 4.95. Gold and NVIDIA green are only used as fills, dots and bars, never as body text on light backgrounds.

## 3. Typography
v1.1: display weights are toned down from 800 to 700, and headings use a steadier optical size (`opsz` 32), so headlines read calm and premium.

| Role | Font | Size / line height | Weight | Use |
|---|---|---|---|---|
| `verdict` | Bricolage Grotesque | 44 / 1.05 | 700 | The one word: Scam / Suspicious / Looks OK |
| `display` | Bricolage Grotesque | 40 / 1.08 (landing uses 34) | 700 | Hero |
| `h1` | Bricolage Grotesque | 30 / 1.15 | 700 | Screen titles |
| `h2` | Bricolage Grotesque | 24 / 1.2 | 650 | Section titles (“What to do now”) |
| `h3` | Bricolage Grotesque | 20 / 1.3 | 600 | Card titles, verdict sentence |
| `body-lg` | Atkinson Hyperlegible | 19 / 1.55 | 400 | Intro copy, input text |
| `body` | Atkinson Hyperlegible | **17 / 1.55** | 400 | Default. **Never go below 17 px for sentences a user must read** |
| `label` | Atkinson Hyperlegible | 17 / 1.3 | 700 | Buttons, field labels |
| `small` | Atkinson Hyperlegible | 15 / 1.45 | 400 | Meta and helper text only |
| `overline` | Atkinson Hyperlegible | 13 / 1.3, +8% tracking, caps | 700 | Tiny section labels (never vital info) |
| `mono` | JetBrains Mono | 13 / 1.4 | 500 | Model IDs, latency, search queries |

Why Atkinson Hyperlegible: it was designed by the Braille Institute for low-vision readers. Its letterforms are clearly different (slashed **0** vs **O**, tailed **l** vs **1** vs **I**), which matters for **phone numbers, amounts and USSD codes**. Bricolage Grotesque gives warmth and character in headings, without being kitsch.

## 4. Space, shape, motion
- **Spacing:** 4 px base (`--space-1` = 4 px … `--space-24` = 96 px). Screen gutter is 20 px. Space between sections is 32–40 px.
- **Tap targets:** at least `--size-tap-min` 48 px. Main actions use 56 px (`btn-md`), and the main CTA uses 64 px (`btn-lg`).
- **Radii (v1.1, tighter):** xs 4, sm 8, md 10 (buttons, inputs), lg 14 (cards), xl 18 (verdict, raised input card), 2xl 24, pill.
- **Shadows** are neutral (`rgba(9,9,11,…)`, v1.1). Use only `md` (input card) and `lg` (floating previews). Keep everything else flat with 1 px borders.
- **Motion:** `fast` 150 ms for presses, `base` 240 ms for reveals, `step` 700 ms between pipeline step reveals, `pulse` 1.6 s for the active step halo. Easing is `standard` cubic-bezier(.2,0,0,1). In v1.1, `spring` no longer overshoots: it is now cubic-bezier(.22,1,.36,1). `prefers-reduced-motion` sets all durations to 0 (already in tokens.css).
- **Focus ring:** `--focus-ring` = a 2 px bg-coloured gap plus a 3 px `--color-focus` (indigo 8.3:1 on the neutral bg; gold in dark mode). Applied to `:focus-visible`.

## 5. Voice & tone
- **Plain English, short sentences, an action first.** “Don’t send money.” Not: “We recommend that you refrain from…”
- Aim for about a Primary-6 reading level. One idea per sentence. Use numbers as digits (“GHS 1,250”, “292”).
- **Calm, not scary.** Even for a Scam, say what to do next. Never shame the user (“Many people get this message”).
- **Local, not slangy.** Use “MoMo”, “PIN”, “network”, “Cash In”. Avoid pidgin in core copy. Use warmth in small places (“God bless you” appears only when we quote the scammer).
- **Honest about AI.** “How sure we are”, “AI can make mistakes”, name each model. Never say “100% safe”. The OK verdict is **“Looks OK”**, not “Safe”.
- **Twi:** the EN | Twi toggle is in the top bar. Twi strings in the mocks (“Ɛyɛ nnaadaa” = it is deceit/scam; “Hwɛ yie” = be careful) are **placeholders that a native speaker must review** before launch. Mark Twi text with `lang="tw"`. Atkinson lacks some Akan letters (ɛ, ɔ), so the browser falls back to the system font for those glyphs. That is acceptable, but test it on a real device.

## 6. Components (in `components.css`, the same in MedVerify GH)
| Class | What | Notes |
|---|---|---|
| `.app`, `.topbar`, `.bottom-bar`, `.page-pad` | Shell | `.bottom-bar` is a sticky CTA area with a solid bg and safe-area padding |
| `.btn` + `-primary/-secondary/-soft/-accent/-ghost/-danger`, sizes `-md` (56) `-lg` (64) `-icon` | Buttons | Label = icon + verb. One primary per screen |
| `.card`, `.card-raised`, `.card-sunken` | Surfaces | |
| `.kente` (+ `--thin`, `--scam`, `--suspicious`, `--ok`) | Signature woven band | Decorative, `aria-hidden` |
| `.lattice` | *Retired in v1.1* (no-op) | Don’t use |
| `.theme-toggle` + `.only-light` / `.only-dark` | v1.1 light/dark toggle; swaps artwork such as the logo lockup | Button calls `scToggleTheme()` (defined in `partials/head.html`) |
| `.lang` | EN / Twi toggle | `aria-pressed` buttons, 40 px tall in a 48 px group |
| `.seg` | Paste / Photo / Upload tabs | `role=tablist`, 56 px |
| `.textarea`, `.input`, `.field-label`, `.field-error`, `.input--error` | Form | Error = icon + text + red border (never the colour alone) |
| `.chip`, `.chip-example`, `.chip--scam/…`, `.tag-example` | Chips | `.chip-example` is 48 px tall: it is a button. `.tag-example` marks sample data |
| `.sms`, `.flag`, `.flag--warn` | The pasted message, with risky phrases highlighted | Highlight = bg + underline + bold |
| `.model`, `.model--nemotron/--tavily`, `.model-avatar--*` | Model / tool identity | Diamond dot + name text |
| `.steps`, `.step--done/--active/--pending/--error`, `.step-dot` | Live pipeline | `aria-current="step"` on the active step |
| `.verdict` + `--scam/--suspicious/--ok`, `.verdict-badge`, `.verdict-word`, `.meter`, `.verdict-pill` | Verdict | Sets `--v-*` vars, so everything inside follows the verdict colours |
| `.action`, `.action-num(--stop)`, `.call` | “What to do now” | `.call` is a 56 px tap row with a `tel:` link |
| `.reason`, `.quote` | “Why we think so” | Quote the exact phrase from the message |
| `.tl`, `.tl-item`, `.io`, `.latency`, `.model-id`, `.source`, `.cite`, `.split`, `.legend` | Evidence / which model did what | |
| `.banner--info/warn/error/ok` | Inline states | |
| `.skeleton`, `.spin`, `.caret`, `.progress` | Loading & streaming | |

**Verdict rule:** every verdict shows **shape + icon + word + colour**, plus a one-line instruction: Scam = octagon “stop sign” (`octagon-x`), Suspicious = triangle (`triangle-alert`), Looks OK = circle tick (`circle-check-big`). Low confidence (< 60%) shows a neutral **“We’re not sure”** card and says “treat it as suspicious”.

**Confidence:** show words first, then the number: “Very sure · 96%”. A 5-segment meter: 1 = < 40, 2 = 40–59, 3 = 60–74, 4 = 75–89, 5 = ≥ 90. Labels: Not sure / A bit sure / Fairly sure / Sure / Very sure.

## 7. “Which model did what” pattern
Judges want to see clearly which AI is doing what. We show it at **three depths**:
1. **Landing:** “Who checks your message”, 3 rows (Nemotron reads → Tavily searches → Nemotron weighs), in plain words.
2. **Live (analysing screen):** each pipeline step shows a **model chip** (`.model--nemotron` / `.model--tavily`), a running **latency** counter, and its **output streaming in** (facts found, the search query, sources arriving). The user watches the AI work. This *is* the aha moment.
3. **Evidence screen:** a **time-split bar** (colour = which model/tool, width = time), then a **timeline card per step** with role, model name, exact model ID (mono), **In → Out** summary, latency, and **numbered sources** with links. Sources are cited inline in the reasons as `.cite` superscripts [1][2][3].
4. The **last step is “ScamCheck rules · no AI”**. The “What to do now” numbers come from a **hard-coded, human-checked list**, never from the LLM. Keep it that way: an LLM inventing a fraud hotline would be a disaster.

Suggested API shape for the frontend (adapt to the backend):
```json
{ "verdict": "scam|suspicious|ok|unsure", "confidence": 0.96, "headline": "Do not send any money back…",
  "reasons": [{"title":"…","quote":"…","severity":"scam|warn|ok","cites":[1,2]}],
  "actions": ["no_pin","check_balance_mtn","report_mtn","report_csa","share"],
  "steps": [{"id":"extract","label":"Read the message","provider":"nemotron","model":"nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
             "status":"done","ms":1200,"input":"SMS text, 214 characters","output":"Amount GHS 1,250 · phone …"}, …],
  "sources": [{"n":1,"title":"…","url":"https://…","host":"jbklutse.com"}] }
```
Model IDs in the mocks (`nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`, `nvidia/nemotron-3-super-120b-a12b`) are **examples** from the Nebius Token Factory catalogue. Render whatever the backend actually calls. For photos/screenshots, add a first step “Reading your screenshot”, using the vision model you actually use (e.g. Nemotron VL).

## 8. Real Ghana actions (verified 25 Oct 2026)
| Action | Number / path | Source | Status |
|---|---|---|---|
| Report MoMo fraud (MTN) | Dial `*170#` → 6 My Wallet → 4 → reason; email mmfraudteam.GH@mtn.com | MTN Ghana Help Centre: help-center.mtn.com.gh/hc/en-us/articles/10592692795026 | ✅ official |
| MTN customer care | `100` | MTN (several sources) | ✅ |
| Cyber Security Authority (24 h) | Call or SMS **292**, WhatsApp 0501603111, report@csa.gov.gh | csa.gov.gh/report | ✅ official |
| Ghana Police | 191 or 18555 (toll-free); CID Cyber Crime Unit | police.gov.gh/en/index.php/cyber-crime/ | ✅ official |
| MTN fraud SMS | Text details to `1515` | Secondary (mfidie.com, pcbossonline) | ⚠️ not on MTN’s own page. Prefer `*170#` |
| Telecel Cash | `100`, 050 555 5111, WhatsApp 050 100 0300 | Secondary directory (ministryofcyberaffairs.com, “read on official site 3 Oct 2026”) | ⚠️ re-check on telecel.com.gh before shipping |
| AT Money (ex-AirtelTigo) | **PLACEHOLDER**: shown with the dashed `.placeholder-num` style until verified | Only a blog source (0302 100 000) | ❌ not verified |

Show the **network-specific** row that matches the message (MTN / Telecel / AT), and always show CSA 292.

## 9. Engineer handoff
**Wiring tokens**
1. Global CSS: `@import "tokens.css";` then the Tailwind directives. In the same entry file, wrap `components.css` in `@layer components { … }` (see `design/_build/build_html.py`).
2. `tailwind.config.js`: copy or merge `theme.extend`. Every value is a `var(--…)`, so themes switch with no rebuild. Dark follows the OS automatically, and `data-theme="dark"` or `data-theme="light"` on `<html>` overrides it. Tailwind `dark:` variants follow the same rule. Utilities: `bg-primary`, `text-scam-fg`, `border-ok-border`, `rounded-xl`, `shadow-md`, `text-h2`, `min-h-tap`, `duration-base ease-standard`…
3. Don’t edit tokens.css by hand. Edit `tokens.json` and run `python3 _build/gen_tokens.py tokens.json .` (the build scripts are in `design/_build/`: gen_tokens.py, logos.py, build_html.py, mockups.py).
4. Fonts: use the Google Fonts `<link>` in `html/_src/partials/head.html` (with `display=swap`). The fallbacks are system-ui/Roboto, so layout survives without the webfonts. For offline/PWA builds, self-host the three families (all OFL).
5. Icons: Lucide (`lucide-react` or `lucide-static`). Use the same names as in `html/assets/icons-used.txt`. Stroke 2, sizes 16/20/24/32/44.
6. Favicon / PWA: `logo/favicon.svg` + `favicon.ico`, `app-icon-192.png`, `app-icon-512.png`, `apple-touch-icon-180.png`. Android adaptive: `adaptive-foreground.svg` (inside the 66% safe zone), `adaptive-background.svg`, `adaptive-monochrome.svg`. `theme-color` `#1B2559`.

**States (all drawn in `html/states.html` and `analysing.html`)**
- **Empty:** the CTA stays enabled. Tapping it with < 20 chars shows `.field-error` “Paste the whole message, not just one word.” Show the example chips prominently.
- **Pre-scan hints (input):** cheap client-side regex for amounts (`GHS|GH₵|cedis`), phone numbers, links and words like “mistake / reverse / PIN / urgent”, shown as chips under the textarea. This gives instant value before any AI call.
- **Loading / streaming:** stream server-sent events per step: `step.start` → set `.step--active` (pulse) + start the latency counter. `step.delta` → append text into `.step-body` (use `.caret` while streaming, `.skeleton` rows for sources not yet arrived). `step.done` → `.step--done` + final ms. Reveal steps at least `--duration-step` apart, so fast steps don’t flash by. Progress bar = done steps / total. Announce the step title with `aria-live="polite"`.
- **Slow network:** after 8 s with no event, show `.banner--warn` “Still checking… your network is slow.” Keep the steps visible.
- **Error:** mark the failed step `.step--error` with a human reason, then “Try again” (primary) + “Answer without web search” (ghost). The latter returns a verdict that must be labelled “Checked without web sources”.
- **Offline:** detect with `navigator.onLine` + a failed fetch. Queue the message in localStorage, show the offline card + “Don’t send money or share your PIN” and auto-retry on `online`.
- **Low confidence:** confidence < 0.6 or `verdict:"unsure"` → the neutral “We’re not sure” card. Never show “Looks OK” at low confidence.
- **Photo / upload:** show a thumbnail in the `.sms` slot, add a “Reading your screenshot” step (vision model), and let the user edit the extracted text before checking.

**Performance (mid-range Android, 3G/4G):** keep the hero JS-light. The compiled CSS here is about 37 KB minified (≈8 KB gzipped). Preconnect fonts. No hero images, the pattern is a 300-byte inline SVG. Keep the total first load under 150 KB.

**Accessibility checklist:** body text ≥ 17 px; taps ≥ 48 px; verdict uses `role="status"`; icons are `aria-hidden` with visible text; `lang="tw"` on Twi; focus ring on everything; the meter is `aria-hidden` because the words carry the meaning; tested on 360 × 800 with zoom at 200%.

**Privacy copy:** screens say “Not stored” and “deleted after the check”. **Only keep this copy if the backend really does that.** Otherwise change it.
