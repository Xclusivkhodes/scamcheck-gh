# READY v1.1: ScamCheck GH (neutral light/dark)
Finished Sun 25 Oct 2026 (Africa/Accra, GMT).

- Drop-in files: tokens.css, tokens.json, tailwind.config.js, components.css. All names are unchanged and only values changed (see CHANGELOG.md). The v1.0 copies are in v1.0-backup/.
- Palette and contrast: BRAND.md §1–2.
- Board: mockups/00-board.png (2400x2580). It shows light and dark phones, desktop in light and dark, and both neutral modes.
- Key screens in light and dark: mockups/01-landing*, 03-analysing*, 04-result*, 05-evidence*, 07-states*, and landing-desktop*. Each has a `-dark` twin.
- Rebuild: `python3 /workspace/hackathon/_build/gen_tokens.py tokens.json .`, then `python3 /workspace/hackathon/_build/build_html.py <app>`, then `python3 /workspace/hackathon/_build/mockups.py <app> sc landing,input,analysing,result,evidence,verdicts,states landing-desktop [light|dark]`.
