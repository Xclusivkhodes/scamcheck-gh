# ScamCheck GH — Brand & Frontend Spec v2.0

> Checked against the repo: Next.js 16 · React 19 · Tailwind v4 · shadcn/@base-ui · Lucide · views `home | checking | result | evidence | offline | error`. **Audience:** people in Ghana checking SMS, MoMo and WhatsApp messages, mostly on Android phones, often on slow or capped data. Many read English as a second language, and Twi is in beta.

Files in this folder: `tokens.css` (paste-in replacement), `tokens.json` / `tokens.ts` (same values), `components.css` (all component styles), `logo/` (mark, wordmark and lockup, light and dark), `favicon.svg`, renders `logo-sheet.png`, `main-light.png`, `main-dark.png`.

---

## 1. Brand concept & voice

**Concept: "Second look."** The friend who reads a message over your shoulder before you send money. They're sharp, warm and never preachy. The product's whole job is one honest verdict word and the next step to take.

- **Voice:** short sentences, under 15 words. We say "we", and the user is "you". Verbs come first ("Don't dial", "Block the number"). Don't use jargon: say *scam*, not *phishing*; say *PIN*, not *credentials*.
- **Tone by verdict:** *Scam* is firm and calm, with no exclamation marks. *Caution* is careful. *Safe* is reassuring, but never a promise ("Looks safe", not "100% safe"). *Can't tell* is honest about what we couldn't check.
- **Never:** fear-mongering, emoji as icons, ALL-CAPS sentences, blaming the victim ("you should have known").
- **Name usage:** "ScamCheck GH" in full, "ScamCheck" in running copy.

## 2. Colour

**Rules:** page backgrounds are neutral only. Indigo is an *accent*, used for the primary action, links, focus, the logo and the "soft" accent wash on small controls. It never fills a page or a section, and it's never used for a verdict. Verdicts use only the status palette.

**Why indigo:** it's not MTN yellow, Telecel red or AT blue, so we never look like a network impersonation (scammers copy those). It's far from the status hues: scam 5°, caution 28°, safe 145°, accent 239°. And it's distinct from MedVerify teal (186°) and Inbox Bodyguard plum (288°).

| Role | Light | Dark |
|---|---|---|
| Page `--color-bg` | `#FAFAFA` | `#0C0C0E` |
| Surface / card | `#FFFFFF` | `#161618` |
| Raised (seg active, popover) | `#FFFFFF` | `#1D1D20` |
| Sunken (inputs well, sms block) | `#F4F4F5` | `#09090B` |
| Border / strong | `#E4E4E7` / `#D4D4D8` | `#27272A` / `#3F3F46` |
| Text / muted / subtle | `#18181B` / `#52525B` / `#6B6B74` | `#F4F4F5` / `#A1A1AA` / `#8B8B94` |
| **Accent** `--color-primary` | **`#4447D1`** (hover `#3A3CB8`, pressed `#2F3194`) | **`#8B8FF7`** (hover `#A3A7F9`) |
| On accent | `#FFFFFF` | `#0C0C0E` |
| Accent soft / on-soft | `#EEEFFE` / `#2F3194` | `#1C1D3A` / `#C5C8FB` |
| Link / focus | `#3A3CB8` / `#6266E8` | `#A3A7F9` / `#8B8FF7` |
| **Scam** bg/fg/border/solid | `#FEF2F1` `#A12214` `#FBC5BF` `#C42B1C` | `#2B1311` `#FBC5BF` `#5C221B` `#EE6B5E` |
| **Caution** (`suspicious`) | `#FFF7EB` `#8F4300` `#FCD48F` `#B25400` | `#2A1C0B` `#FCD48F` `#5A3B12` `#F29A2E` |
| **Safe** (`ok`) | `#EEFAF2` `#116234` `#A6E3BE` `#16793F` | `#0F2217` `#A6E3BE` `#1E4A31` `#3FB373` |
| **Can't tell** (`unsure`) | `#F4F4F5` `#3F3F46` `#D4D4D8` `#52525B` | `#1D1D20` `#D4D4D8` `#3F3F46` `#A1A1AA` |
| Tool dots (6px dot only) | Nemotron `#76B900`, Tavily `#3B6FE0` | same / `#7FA3F5` |

Status tints (`*-bg`) are allowed **only inside the verdict panel, chips and banners**, never as a page or section background.

### Contrast (WCAG 2.2, computed by `_build/gen_tokens.py`)
| Pair (fg on bg) | Use | Light | Dark |
|---|---|---|---|
| `text` on `bg` | body text (≥4.5) | #18181B on #FAFAFA = **16.97** AAA | #F4F4F5 on #0C0C0E = **17.78** AAA |
| `text` on `surface` | body text (≥4.5) | #18181B on #FFFFFF = **17.72** AAA | #F4F4F5 on #161618 = **16.44** AAA |
| `text-muted` on `bg` | body text (≥4.5) | #52525B on #FAFAFA = **7.41** AAA | #A1A1AA on #0C0C0E = **7.63** AAA |
| `text-muted` on `surface` | body text (≥4.5) | #52525B on #FFFFFF = **7.73** AAA | #A1A1AA on #161618 = **7.05** AAA |
| `text-subtle` on `surface` | body text (≥4.5) | #6B6B74 on #FFFFFF = **5.28** AA | #8B8B94 on #161618 = **5.35** AA |
| `text-subtle` on `bg` | body text (≥4.5) | #6B6B74 on #FAFAFA = **5.05** AA | #8B8B94 on #0C0C0E = **5.79** AA |
| `on-primary` on `primary` | body text (≥4.5) | #FFFFFF on #4447D1 = **6.85** AA | #0C0C0E on #8B8FF7 = **6.86** AA |
| `primary` on `bg` | body text (≥4.5) | #4447D1 on #FAFAFA = **6.56** AA | #8B8FF7 on #0C0C0E = **6.86** AA |
| `primary` on `surface` | body text (≥4.5) | #4447D1 on #FFFFFF = **6.85** AA | #8B8FF7 on #161618 = **6.34** AA |
| `link` on `surface` | body text (≥4.5) | #3A3CB8 on #FFFFFF = **8.34** AAA | #A3A7F9 on #161618 = **8.13** AAA |
| `link` on `bg` | body text (≥4.5) | #3A3CB8 on #FAFAFA = **7.99** AAA | #A3A7F9 on #0C0C0E = **8.80** AAA |
| `on-primary-soft` on `primary-soft` | body text (≥4.5) | #2F3194 on #EEEFFE = **9.26** AAA | #C5C8FB on #1C1D3A = **10.13** AAA |
| `focus` on `bg` | UI / focus / icons (≥3) | #6266E8 on #FAFAFA = **4.39** AA (UI ≥3) | #8B8FF7 on #0C0C0E = **6.86** AA (UI ≥3) |
| `border-strong` on `surface` | hairline (decorative, no minimum) | #D4D4D8 on #FFFFFF = **1.48** decorative | #3F3F46 on #161618 = **1.73** decorative |
| `scam-fg` on `scam-bg` | body text (≥4.5) | #A12214 on #FEF2F1 = **6.97** AA | #FBC5BF on #2B1311 = **11.50** AAA |
| `on-scam-solid` on `scam-solid` | body text (≥4.5) | #FFFFFF on #C42B1C = **5.66** AA | #0C0C0E on #EE6B5E = **6.42** AA |
| `scam-solid` on `surface` | UI / focus / icons (≥3) | #C42B1C on #FFFFFF = **5.66** AA (UI ≥3) | #EE6B5E on #161618 = **5.94** AA (UI ≥3) |
| `suspicious-fg` on `suspicious-bg` | body text (≥4.5) | #8F4300 on #FFF7EB = **6.65** AA | #FCD48F on #2A1C0B = **11.78** AAA |
| `on-suspicious-solid` on `suspicious-solid` | body text (≥4.5) | #FFFFFF on #B25400 = **5.05** AA | #0C0C0E on #F29A2E = **8.78** AAA |
| `suspicious-solid` on `surface` | UI / focus / icons (≥3) | #B25400 on #FFFFFF = **5.05** AA (UI ≥3) | #F29A2E on #161618 = **8.12** AA (UI ≥3) |
| `ok-fg` on `ok-bg` | body text (≥4.5) | #116234 on #EEFAF2 = **6.95** AA | #A6E3BE on #0F2217 = **11.38** AAA |
| `on-ok-solid` on `ok-solid` | body text (≥4.5) | #FFFFFF on #16793F = **5.47** AA | #0C0C0E on #3FB373 = **7.36** AAA |
| `ok-solid` on `surface` | UI / focus / icons (≥3) | #16793F on #FFFFFF = **5.47** AA (UI ≥3) | #3FB373 on #161618 = **6.80** AA (UI ≥3) |
| `unsure-fg` on `unsure-bg` | body text (≥4.5) | #3F3F46 on #F4F4F5 = **9.50** AAA | #D4D4D8 on #1D1D20 = **11.38** AAA |
| `tool-nemotron-ink` on `surface` | body text (≥4.5) | #3E6400 on #FFFFFF = **6.94** AA | #A6E05A on #161618 = **11.56** AAA |
| `tool-tavily-ink` on `surface` | body text (≥4.5) | #1F4BB0 on #FFFFFF = **7.80** AAA | #A9C1FA on #161618 = **10.06** AAA |

Every text pair is ≥ 4.5:1. Every UI, focus and icon pair is ≥ 3:1. The primary button label is 6.85:1 in light and 6.86:1 in dark.

## 3. Typography

| Role | Family | Why |
|---|---|---|
| Display / verdict word | **Bricolage Grotesque** (variable, opsz 96, wght 600–750) | Characterful but sturdy. It gives a friendly "voice" to headlines. |
| Body / UI | **Atkinson Hyperlegible Next** (variable) | Designed by the Braille Institute for low-vision readers. It separates I/l/1 and O/0 clearly, which matters for codes and numbers. |
| Codes, numbers, short codes | **Atkinson Hyperlegible Mono** | `*170#`, phone numbers and amounts, in tabular figures. |

All three are OFL. Install with `@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/atkinson-hyperlegible-next` and `@fontsource-variable/atkinson-hyperlegible-mono`, or via `next/font/google`. Subset to **latin + latin-ext** only, and use `font-display: swap`. Preload only the body font. The display font is about 30 kB woff2 after subsetting.

Base size is **17px** (mobile reading distance, older users).

| Token | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|
| `verdict` | 44/46 (desktop 56) | 750 | −0.03em | One verdict word |
| `display` | 36/40 (desktop 48/51) | 700 | −0.03em | Home headline |
| `h1` | 28/34 | 700 | −0.02em | Screen titles |
| `h2` | 22/28 | 650 | −0.015em | Section titles |
| `h3` | 19/26 | 600 | −0.01em | Card titles |
| `body-lg` | 19/28.5 | 400 | 0 | Lead, verdict headline (700) |
| `body` | 17/26 | 400 | 0 | Default |
| `label` | 16/22 | 700 | 0 | Field labels, buttons |
| `small` | 15/22 | 400 | 0 | Secondary text (floor: nothing under 13px) |
| `overline` | 13/16 | 700 | 0.06em, caps | Badges |
| `mono` | 14/20 | 500 | 0 | Codes, counters |

## 4. Logo & wordmark

- **Mark:** a rounded speech bubble with a bold check. The tail sits low left, like a received message. It reads at 16px. Stroke check 6/64, round caps. The light version is an indigo bubble with a white check; the dark version is `#8B8FF7` with a near-black check.
- **Wordmark:** "ScamCheck" in Bricolage Grotesque 700 at −0.025em, with "GH" in the accent colour. All text is outlined to paths, so there's no font dependency.
- **Lockup:** mark height = wordmark cap block, gap 0.28 × height. Minimum size: lockup 20px tall, mark 16px. Clear space = the bubble's tail width on all sides.
- **Don't:** add kente, flags or gradients; recolour the mark per verdict; put the mark on an accent fill.
- **Files:** `logo/mark-{light,dark}.svg`, `logo/wordmark-{light,dark}.svg`, `logo/lockup-{light,dark}.svg`, `favicon.svg` (one file that switches with `prefers-color-scheme`). For PWA icons, export the mark at 192/512 on `#FAFAFA` with 12% padding.

## 5. Components (`components.css`)

Personality: **friendly and sturdy.** Controls have a 12px radius and cards 16px. Borders are 1px, cards get a soft two-layer shadow, and density is generous. **Tap targets are ≥ 48px, with 52px as the default.**

| Component | Spec |
|---|---|
| **Button** `.btn` | Height 52 (`.btn-md` 48, `.btn-lg` 56), radius 12, label 16/700, gap 8, icon 20. **Primary:** accent fill + white label + 1px inner highlight. **Secondary:** surface + 1px `border-strong` + shadow-xs. **Soft:** accent-soft wash, for in-field actions like *Paste*. **Ghost:** muted text, sunken on hover. Press scales to 0.98 in 80ms. Loading: an 18px spinner replaces the icon, the label stays, and `aria-busy`. Only **one** primary per screen. |
| **Textarea / input** | Radius 12, 1px `border-strong`, inset shadow. Textarea min 168px with 64px bottom padding for the tool row (*Paste* soft button left, mono counter right). Focus: accent border + 4px accent-soft ring. Error: scam-solid border + `.field-error` (icon + 15px bold text) below. Inputs are 52px tall. Placeholder in `text-subtle`. |
| **Card** `.card` | Surface, 1px border, radius 16, padding 20, `shadow-sm`. `.card-raised` uses `shadow-md`; `.card-flat` is sunken with no border. |
| **Verdict panel** `.verdict--{scam,suspicious,ok}` | A **status-tinted** panel (the only tinted surface in the app), 1px status border, radius 20, padding 24/20. Inside: a solid status badge ("VERDICT" + icon), the **verdict word** in display 44/750 in status fg, a headline in body-lg/700, then a divider and the confidence meter (4 segments, 8px, radius 2). The meter shows a word, never a percentage: "Not sure / Fairly sure / Sure / Very sure". `aria-live="polite"`. |
| **Badge / chip** | Chips are 32px pill, 15/700, with a 16px icon, used for "We noticed:" signals in caution or scam tints. Badges are 28px, radius 8, overline type. Tool attribution `.model` = 6px coloured dot + mono name. The tool brand colour appears **only** as that dot. |
| **Banner** | Radius 12, 1px border, 15px text, leading icon. Info (neutral), warn (caution), danger (scam). |
| **Nav / header** `.topbar` | 64px tall, sticky, translucent `bg` with blur. A hairline appears once scrolled. Left: lockup (26px), or a back button "← New check" on result screens. Right: language segmented control + theme icon button (44px). Desktop (≥ 768px): the same bar, with content centred at 560px max. |
| **Toggles** | `.seg` segmented pill (EN / Twi β): track sunken, thumb raised with shadow-sm, 32px buttons, `aria-pressed`. The theme toggle cycles System → Light → Dark, stored in `localStorage['sc-theme']`, and accepts `?theme=`. |
| **Steps (checking)** | Rows 40px tall with a 10px dot: pending (border-strong), active (accent, pulsing), done (safe-solid), error (scam-solid). |

## 6. Layout & key screens

- **Grid:** single column, 16px gutters, 560px max content. Spacing is on a 4px grid: 8 inside groups, 16 between fields, 24 between sections, 48 bottom padding.
- **Home** (`home`): topbar → display headline "Strange message? Check it first." → lead → field "Paste the message" (placeholder "Long-press here, then tap Paste") → "We noticed:" chips, which appear as the user types → **Check message** (primary, lg, block) → Photo / Screenshot (secondary, half width each) → privacy line "🔒 Not saved to disk. Only you see this message." (use the Lucide lock, not an emoji). Remove the kente underline.
- **Checking** (`checking`): the pasted message is shown collapsed and sunken. Steps: "Reading the message" → "Looking for known scam patterns" → "Checking numbers and links" → "Writing your answer". There's a *Cancel* ghost button.
- **Result** (`result`): verdict panel → card "What to do now" (numbered steps with accent-soft discs) → card "Why we think so" (the sms bubble with `mark.flag` underline highlights, then reasons with ✕ icons, then tool dots + "How we checked" link) → secondary block button "Warn family on WhatsApp" → ghost "Check another message".
- **Evidence** (`evidence`): the title "Which AI did what" and a list of cards, one per tool, each with a tool dot, what it read and what it returned, in mono where it's raw.
- **Desktop ≥ 1024px:** a two-column result. The verdict is sticky on the left (400px) and the reasons are on the right. The home page stays single-column and centred.

## 7. Empty, loading & error states (copy)

| State | UI | Copy |
|---|---|---|
| Empty home | Placeholder + disabled-looking but enabled primary button (it validates on tap) | Placeholder "Long-press here, then tap Paste". Helper: "Works with SMS, MoMo alerts and WhatsApp." |
| Too short | Field error | "Paste the whole message, not just one word." |
| Loading | Steps list + top 2px accent progress | "Checking… this takes about 10 seconds." After 15s: "Still checking. Slow network? We'll keep trying." |
| Offline | Neutral banner + card | "No internet right now. You can still read our tips: never share your PIN, and call the network on its official number." Button: "Try again" |
| Server error | Danger banner | "Something went wrong on our side. Your message wasn't saved. Try again in a minute." |
| Can't tell | `verdict` (unsure) | Word "Can't tell". "We couldn't check this one. Treat it with care: don't send money or your PIN until you've called the sender on a number you already know." |
| Safe | `verdict--ok` | Word "Looks safe". "We found nothing that matches known scams. If it asks for money or your PIN, it's not safe." |

## 8. Motion

| Token | Value | Use |
|---|---|---|
| `--duration-instant` | 80ms | Press scale |
| `--duration-fast` | 140ms | Hover and colour changes |
| `--duration-base` | 220ms | Toggles, chips appearing |
| `--duration-slow` | 360ms | Verdict panel entrance (fade + 8px rise, `--ease-enter`) |
| `--duration-step` | 520ms | Minimum time each checking step is shown |
| `--ease-standard` | `cubic-bezier(.2,0,0,1)` | Default |
| `--ease-enter` | `cubic-bezier(.05,.7,.1,1)` | Entrances |
| `--ease-exit` | `cubic-bezier(.3,0,.8,.15)` | Exits (use 0.75 × the duration) |

Don't use bouncing, confetti or a shaking scam panel. **Reduced motion:** every duration token becomes 0ms, `components.css` forces animations to a single 0ms frame, pulse dots become static, and the press scale is removed.

## 9. Performance & low-bandwidth

- Fonts are subset (latin and latin-ext). Use 3 files at most and preload only one. The system fallback stack is metric-close.
- Use inline SVG icons from `lucide-react` with per-icon imports (tree-shaken), at 20px with stroke 2.
- No images on Home. The logo is inline SVG. `theme-color` is `#FAFAFA` / `#0C0C0E`.
- Budget: first load JS under 120 kB gzip, and LCP under 2.5s on a Moto G-class phone over Slow 4G.

## 10. Migration — conflicts in the current repo

1. **`app/globals.css` imports `hackathon/design/scamcheck-gh/html/assets/app.css`** and `app/extras.css`. Replace both with `tokens.css` + `components.css` from this folder.
2. **The dark primary flips to gold** (`--color-primary: #F0AE2E` in dark), and kente gold `#F0AE2E` (hue 40°) sits next to caution amber. Gold is removed from the palette. Indigo is the only accent in both themes.
3. **The kente strips** `.kente`, `.kente--thin` and `.kente--{tone}` (checker-app.tsx lines ~597, 762, 866, 1057) must be deleted. The hero underline and the verdict top strips go too.
4. **Light primary `#1B2559` (navy)** becomes `#4447D1`.
5. **Dark bg `#0F0F11`** becomes `#0C0C0E` (update the `themeColor` in `layout.tsx`).
6. **The fonts** were Atkinson Hyperlegible v1 + JetBrains Mono; they become Atkinson Hyperlegible **Next** + Atkinson Hyperlegible **Mono**. Bricolage stays.
7. **A shared skeleton with MedVerify:** both repos have the same generated `components.css` and the same token schema. This file is ScamCheck-only. Don't copy it into MedVerify.
8. **Tool chips** (`model--tavily`, `model--nemotron`) currently fill with brand colours. They become a 6px dot + mono text.
9. **The verdict word map** (`verdictWord` in `lib/copy.ts`): keep the four bands. *Recommended:* show "Safe" as **"Looks safe"** on the verdict panel, so it is never read as a guarantee. The band name in the docs can stay "Safe".
10. Keep the existing semantic token **names**. Only the values change, plus the new `--color-unsure-*`, `--size-tap-*` and `--focus-ring` tokens.
