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

The running app does not import this copy. It imports the compiled stylesheet from `hackathon/design/scamcheck-gh/html/assets/app.css`. That folder is the same v1.1 drop, plus component CSS, the Tailwind config, logos, and mockups. If you change a token, change it in `hackathon/design/scamcheck-gh` and copy the result back here so the two do not drift.

Light page background is `#FAFAFA`. Dark is `#0F0F11`. Brand colour is an accent only. `.kente` is a 2–3 px rule, not a woven page background. The page follows `prefers-color-scheme` until `localStorage` key `sc-theme` (or `?theme=`) sets `data-theme`.
