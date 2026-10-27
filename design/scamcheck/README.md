# Design specs — ScamCheck GH · MedVerify GH · Inbox Bodyguard

There are three separate identities, each with its own accent, fonts, logo and component layer. **Don't share component CSS between the apps.**

| App | Concept | Accent (light / dark) | Fonts | Personality |
|---|---|---|---|---|
| [ScamCheck GH](scamcheck-gh/SPEC.md) | "Second look": a sharp, warm friend | Indigo `#4447D1` / `#8B8FF7` | Bricolage Grotesque + Atkinson Hyperlegible Next/Mono | Friendly and sturdy: radius 12/16, soft shadows, tinted verdict panel, 52px targets |
| [MedVerify GH](medverify-gh/SPEC.md) | "The pharmacy label": a careful pharmacist | Teal `#0B6E7A` / `#4FC8D3` | IBM Plex Sans + Plex Mono | Clinical: hairlines, pill buttons, no shadows, mono eyebrows, solid verdict strip |
| [Inbox Bodyguard](inbox-bodyguard/SPEC.md) | "Quiet security": a pro mail client | Plum `#862F9B` / `#D08BE3` | Geist + Geist Mono (Instrument Serif for marketing) | Dense desktop: 32px controls, borders only, inline guard banner with evidence |

## Shared rules (rules, not shared CSS)

- **Neutral page backgrounds only.** Light is white or near-white with grey surfaces. Dark is `#0A0A0B`–`#18181B`. The accent is never a page, section, gradient or pattern fill.
- **The theme follows the system**, with a toggle (System → Light → Dark). Selectors are `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])`, `[data-theme="dark"]` and `[data-theme="light"]`. The choice is stored in `localStorage` as `sc-theme`, `mv-theme` and `ib-theme`, and the `?theme=` URL param overrides it. Set the theme in an inline `<head>` script before paint to avoid a flash.
- **WCAG 2.2 AA** for every text pair, and ≥ 3:1 for UI, focus and icons. The full contrast tables are in each SPEC (§2), and *no pair fails*.
- **Status ≠ accent.** A verdict always shows colour + icon + word. Accent hues are 239°, 186° and 288°; status hues are about 5°, 28° and 150°.
- **4/8 spacing grid.** Reduced motion sets every duration token to 0.
- All fonts are OFL; icons are Lucide (ISC) or Phosphor (MIT). Tooling is open source: Python fontTools/HarfBuzz for outlining and headless Chrome via playwright-core for renders.

## Folder contents (per app)

```
<app>/SPEC.md           full spec: concept, voice, colour + contrast, type, logo, components, screens, states, motion, migration
<app>/tokens.css        drop-in CSS custom properties (light, dark, system, reduced-motion)
<app>/tokens.json/.ts   the same values for JS / Tailwind theme
<app>/components.css    that app's component layer (sc: .btn/.card/.verdict… · mv: own classes · ib: .ib-*)
<app>/logo/             mark, wordmark, lockup × light/dark (text outlined to paths)
<app>/favicon.svg       self-switching with prefers-color-scheme
<app>/logo-sheet.png    logo sheet
<app>/main-light.png    main screens, light
<app>/main-dark.png     main screens, dark
_build/                 generators (gen_tokens.py is the single source of truth), mockup HTML, render.js
```

Regenerate everything: `cd _build && python gen_tokens.py && python gen_logos.py && python gen_sheets.py && python mock_sc.py && python mock_mv.py && python mock_ib.py`, then `node render.js <html> <png> <w> <h> <scale>`.

## Font installs

- **ScamCheck:** `npm i @fontsource-variable/bricolage-grotesque @fontsource-variable/atkinson-hyperlegible-next @fontsource-variable/atkinson-hyperlegible-mono`, then remove `@fontsource/atkinson-hyperlegible` and `@fontsource/jetbrains-mono`.
- **MedVerify:** `npm i @fontsource-variable/ibm-plex-sans @fontsource/ibm-plex-mono`, then remove `@fontsource/onest`, `@fontsource/source-sans-3` and `@fontsource/geist-mono`.
- **Inbox Bodyguard:** no change (`next/font/google`: Geist, Geist_Mono, Instrument_Serif).

## Top repo conflicts (details in each SPEC §Migration)

1. ScamCheck and MedVerify share one generated token schema and component layer. Each app replaces it with its own `components.css`.
2. ScamCheck: the dark primary flips to kente gold `#F0AE2E`, which sits next to the caution amber, and there are kente strips on the hero and verdict. Remove them. Light navy `#1B2559` becomes indigo. `globals.css` imports `hackathon/design/.../app.css` + `extras.css`; replace them.
3. MedVerify: the accent `#0B7A73` (176°) is too close to "ok" green, so move to `#0B6E7A`. Onest/Source Sans 3/Geist Mono become Plex. The dark `themeColor` doesn't match the bg.
4. Inbox Bodyguard: `--accent` **equals** `--guard-safe` (`#0E6C58`), so change it to plum. The iris/sky model-lane colours become neutral. The dark bg `#111113` becomes `#0A0A0B`.
5. Tool brand colours (Nemotron green, Tavily blue) appear only as 6px dots.
6. Update the `themeColor` meta per app: sc `#FAFAFA`/`#0C0C0E`, mv `#FFFFFF`/`#111113`, ib `#FFFFFF`/`#0A0A0B`.
7. **Inbox Bodyguard isn't Ghana-focused** (the Alex Rivera / Northline demo). Confirm the audience with Circuit.
