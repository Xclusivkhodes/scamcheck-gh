# Changelog: ScamCheck GH design system

## v1.1 (25 Oct 2026, Felix's feedback): neutral modes
**No token or class was renamed or removed.** Only values changed, so `tokens.css`, `tokens.json`, `tailwind.config.js` and `components.css` can be swapped straight in. The v1.0 files are in `v1.0-backup/`.

### What changed
- Backgrounds are neutral in both modes. Light uses `#FAFAFA` and `#FFFFFF` with zinc greys. Dark uses `#0F0F11` and `#18181B` with zinc greys and **no navy tint**. The calico-cream backgrounds are gone.
- Brand colours (Adinkra indigo, Kente gold) are kept for accents only: buttons, links, logo, verdicts, banners, focus and charts.
- **Dark mode now follows `prefers-color-scheme`** through `@media` in tokens.css. `<html data-theme="light|dark">` overrides it. Tailwind `darkMode` is now a variant that matches both rules.
- Decorative backgrounds are removed. The `.lattice` diamond pattern is retired (the class is now a no-op), as are the kente band on the index page and the band above the desktop preview. The kente band stays only on the logo, the hero underline, verdict cards and the emergency banner.
- Contrast was re-checked for every listed text pair in both modes, and all pass AA. 20 extra pairs were added to the check (sunken surfaces, verdict backgrounds, raised surfaces).

### Token value changes
| Token | v1.0 | v1.1 |
|---|---|---|
| `--neutral-25` | #FFFCF7 | #FCFCFC |
| `--neutral-50` | #FBF6EE | #FAFAFA |
| `--neutral-100` | #F5EDE0 | #F4F4F5 |
| `--neutral-200` | #EADFCC | #E4E4E7 |
| `--neutral-300` | #D6C7AE | #D4D4D8 |
| `--neutral-400` | #AE9D82 | #A1A1AA |
| `--neutral-500` | #7A6A55 | #71717A |
| `--neutral-600` | #645747 | #52525B |
| `--neutral-700` | #4A4035 | #3F3F46 |
| `--neutral-800` | #322B23 | #27272A |
| `--neutral-900` | #1F1A15 | #18181B |
| `--color-bg` (light) | #FBF6EE | #FAFAFA |
| `--color-surface-sunken` (light) | #F5EDE0 | #F4F4F5 |
| `--color-surface-inverse` (light) | #1B2559 | #18181B |
| `--color-border` (light) | #EADFCC | #E4E4E7 |
| `--color-border-strong` (light) | #D6C7AE | #D4D4D8 |
| `--color-text` (light) | #11183B | #18181B |
| `--color-text-muted` (light) | #645747 | #52525B |
| `--color-text-subtle` (light) | #7A6A55 | #696971 |
| `--color-text-inverse` (light) | #FBF6EE | #FAFAFA |
| `--color-text-on-inverse-muted` (light) | #C3CBEC | #D4D4D8 |
| `--color-bg` (dark) | #11183B | #0F0F11 |
| `--color-surface` (dark) | #18214D | #18181B |
| `--color-surface-raised` (dark) | #1F2A5E | #1F1F23 |
| `--color-surface-sunken` (dark) | #0B1029 | #0A0A0C |
| `--color-surface-inverse` (dark) | #FBF6EE | #FAFAFA |
| `--color-border` (dark) | #2C3874 | #27272A |
| `--color-border-strong` (dark) | #3D4A8C | #3F3F46 |
| `--color-text` (dark) | #FBF6EE | #FAFAFA |
| `--color-text-muted` (dark) | #C3CBEC | #A1A1AA |
| `--color-text-subtle` (dark) | #9AA6DC | #8E8E97 |
| `--color-text-inverse` (dark) | #11183B | #18181B |
| `--color-text-on-inverse-muted` (dark) | #645747 | #52525B |
| `--color-primary-soft` (dark) | #26326E | #2A2416 |
| `--color-on-primary-soft` (dark) | #E2E6F6 | #FADB8F |
| `--color-accent-soft` (dark) | #2E2A3A | #2A2416 |
| `--color-scam-bg` (dark) | #3A1712 | #2A1411 |
| `--color-scam-border` (dark) | #7A2A1D | #6A2519 |
| `--color-on-scam-solid` (dark) | #11183B | #18181B |
| `--color-suspicious-bg` (dark) | #36230C | #2A1D0C |
| `--color-suspicious-border` (dark) | #7A4A12 | #6A4212 |
| `--color-on-suspicious-solid` (dark) | #11183B | #18181B |
| `--color-ok-bg` (dark) | #0F2E20 | #0E2419 |
| `--color-ok-border` (dark) | #1F5C3D | #1C4D34 |
| `--color-on-ok-solid` (dark) | #11183B | #18181B |
| `--color-info-bg` (dark) | #1F2A5E | #191D33 |
| `--color-info-border` (dark) | #3D4A8C | #2E3664 |
| `--shadow-xs` | navy rgba(17,24,59,…) | neutral rgba(9,9,11,…) |
| `--shadow-sm` | navy rgba(17,24,59,…) | neutral rgba(9,9,11,…) |
| `--shadow-md` | navy rgba(17,24,59,…) | neutral rgba(9,9,11,…) |
| `--shadow-lg` | navy rgba(17,24,59,…) | neutral rgba(9,9,11,…) |
| `--shadow-inset` | navy rgba(17,24,59,…) | neutral rgba(9,9,11,…) |

`$meta.version` is now 1.1.0, and there is a new flag, `$meta.followSystem: true`. The generator only emits the `@media` block when this flag is set, so MedVerify GH is unaffected until it opts in.

### Refinement pass: a polished product, not a demo (values only)
| Token / class | v1.0 | v1.1 |
|---|---|---|
| `--radius-xs / sm / md / lg / xl / 2xl` | 6 / 10 / 14 / 20 / 28 / 36 px | 4 / 8 / 10 / 14 / 18 / 24 px |
| `--text-verdict-weight`, `--text-display-weight`, `--text-h1-weight` | 800 | 700 |
| `--text-h2-weight` / `--text-h3-weight` | 700 / 700 | 650 / 600 |
| `--text-display-tracking`, `--text-verdict-tracking` | -0.025em | -0.03em |
| `--ease-spring` | cubic-bezier(.34,1.56,.64,1) (overshoot) | cubic-bezier(.22,1,.36,1) |
| `.kente` (+ modifiers) | 8 px two-row checker weave | 3 px solid accent rule (2 px for `--thin`). Verdict modifiers use the verdict solid colour |
| `.verdict-badge`, `.onb-num`, `.source-fav` radius | 20 / 10 / 9 px | 16 / 8 / 7 px |
| `.action-num`, `.onb-num`, `.cite`, `.source-fav` weight | 800 | 700 |
| `.model::before` | rotated diamond | 7 px round dot |
| `.t-verdict, .t-display, .t-h1–h3` | auto optical size | `font-variation-settings: "opsz" 32` (a calmer Bricolage cut) |

### components.css (additions and fixes; existing class names unchanged)
- `.lattice::before` is now `content: none`.
- New classes: `.theme-toggle`, `.only-light`, `.only-dark`.
- `.kente` weave ink is fixed to `--brand-900`. Before, it used `--color-primary`, which turns gold in dark mode, so the weave vanished.
- The `.model-avatar--tavily` icon colour is now `var(--color-surface)`, so it reads on the light-blue dark-mode fill.
- `.model-avatar--nemotron` has a faint inner ring, so it shows on dark surfaces.
- `.progress` has a 1px inner ring, so the track shows on the neutral dark background.
- The `.bottom-bar` shadow is neutral.

### Build pipeline
- `_build/gen_tokens.py` adds the `followSystem` support (the `@media` block, the Tailwind variant and extra contrast pairs). Without the flag, its output is unchanged.
- `_build/build_html.py` now prefers `<app>/components.css`. Before, it always used the shared `_build/components.css`, which MedVerify still uses and which was left at v1.0.
- `_build/mockups.py` takes an optional 5th argument, `light` or `dark`, and writes `-dark` file names. Dark renders use `prefers-color-scheme: dark`.
- Reference HTML: `partials/head.html` has a theme bootstrap script and `scToggleTheme()`, plus theme-color metas for both modes. Logos swap light and dark lockups. The toggle was added to the landing topbar, the evidence topbar, the desktop header and the index page.

## v1.0 (25 Oct 2026)
Initial system.
