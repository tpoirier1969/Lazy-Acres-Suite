# Lazy Acres Suite — Codex instructions

## Project
This is the Lazy Acres Suite app shell for Tod and Donna.

Repo:
tpoirier1969/Lazy-Acres-Suite

GitHub Pages static app.

## Working rules
- Do not hand the user code to paste if you can edit the repo directly.
- Make small, reviewable commits.
- Do not invent placeholder visuals and call them done.
- Do not use emoji icons.
- Do not use generic fallback icons as final art.
- Do not break hash routing, search, theme switching, Today cards, or dashboard layout.
- Preserve:
  [hidden], .command-results[hidden] { display: none !important; }

## Visual direction
The app should feel like a premium Field Lab dashboard:
- modern
- outdoor/science/field-instrument feel
- organic
- soft dimensional surfaces
- parchment/moss/slate/teal/copper palette
- no childish icons
- no generic line icons
- no hard-edged pill buttons
- no thin obvious card borders

## Icon task
The current fallback SVG icons are temporary and unacceptable.

Replace the visible module icons with the selected polished Field Lab icons.

Target slugs:
- shopping
- scheduler
- recipes
- foraging
- camping
- fishing
- tv
- ski
- genealogy
- church-music

Preferred icon paths:
assets/app-shell/icons/field-lab/shopping.png
assets/app-shell/icons/field-lab/scheduler.png
assets/app-shell/icons/field-lab/recipes.png
assets/app-shell/icons/field-lab/foraging.png
assets/app-shell/icons/field-lab/camping.png
assets/app-shell/icons/field-lab/fishing.png
assets/app-shell/icons/field-lab/tv-tracker.png
assets/app-shell/icons/field-lab/ski.png
assets/app-shell/icons/field-lab/genealogy.png
assets/app-shell/icons/field-lab/church-music.png

If the selected polished icon files are not available in the repo, stop and say exactly that. Do not substitute the old SVGs or emoji.

## Testing
Before reporting done:
- verify all referenced icon paths exist
- verify app.js no longer relies on icon-sheet.js for module icons
- verify icon-fix.css is not forcing the old SVG icons
- run:
  node --check assets/app-shell/app.js
  node --check assets/app-shell/search.js
- inspect index.html cache-busters
- report files changed and commit SHA
