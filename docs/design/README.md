# Design

This folder is the v1.1 handoff snapshot: brand notes and the token source.

| File | What it is |
| --- | --- |
| [BRAND.md](BRAND.md) | Direction, palette, contrast, voice |
| [tokens.json](tokens.json) | Token source of truth |
| [tokens.css](tokens.css) | Generated custom properties |
| [CHANGELOG.md](CHANGELOG.md) | What changed from v1.0 |
| [READY-v1.1.md](READY-v1.1.md) | Drop-in checklist |
| [NAME.md](NAME.md) | Name and taglines |
| [LICENSES.md](LICENSES.md) | Fonts and icons |
| [READY.md](READY.md) | Earlier v1.0 note |

The running app imports `design/scamcheck/tokens.css` and `design/scamcheck/components.css` (spec v2). This folder is the older v1.1 handoff. Do not import it from the app.

Light page background is `#FAFAFA`. Dark is `#0F0F11`. Brand colour is an accent only. `.kente` is a 2–3 px rule, not a woven page background. The page follows `prefers-color-scheme` until `localStorage` key `sc-theme` (or `?theme=`) sets `data-theme`.
