# Lazy Acres Suite

Clean modular app suite framework for `tpoirier1969/Lazy-Acres-Suite`.

This repository is currently a modular shell. It does **not** migrate existing app logic, copy legacy app pages, implement Stripe, implement Supabase Auth for the suite, or implement real entitlement enforcement. It can read limited browser-safe Today summaries from existing public/client-side sources.

## Included files

```text
index.html
styles.css
README.md
APP_CONTRACT.md
CHANGELOG.md
assets/app-shell/app.js
assets/app-shell/modules.js
assets/app-shell/router.js
assets/app-shell/auth.js
assets/app-shell/entitlements.js
assets/app-shell/billing.js
assets/app-shell/search.js
assets/app-shell/dashboard-data.js
assets/app-shell/lazy-acres-suite-icon.svg
assets/app-shell/field-lab-hero.svg
assets/app-shell/aurora-hero.svg
```

## Routes

The shell uses hash-based routing so it works from static hosting without server rewrite rules.

- `/#/dashboard` opens the dashboard landing page.
- `/#/today` opens the Today dashboard view.
- `/#/foraging` opens the Foraging module placeholder.
- `/#/camping` opens the Camping Map module placeholder.
- `/#/shopping` opens the Shopping List module placeholder.
- Any registered module slug in `assets/app-shell/modules.js` works as a direct route.

## Testing mode

During testing, Tod and Donna can see and open every module without logging in. This behavior lives in:

- `assets/app-shell/auth.js`
- `assets/app-shell/entitlements.js`

## Legacy app links

Legacy app pages are not copied into this repo. Current apps are linked externally from `assets/app-shell/modules.js`.

## Today dashboard data

Version `0.1.7` connects limited Today summaries where browser-safe sources already exist:

- Scheduler reads today's shared calendar summary from the existing public Supabase anon configuration used by Our Scheduler.
- Shopping reads active shopping-list items from the existing public Supabase anon configuration used by Shared Shopping List.
- Weather reads a public no-key Open-Meteo forecast for the Marquette area.
- Recent Activity still remains an adapter seam until a real activity source exists.

Do not use Supabase `service_role` keys in this browser shell. Future data connections must use browser-safe public configuration, an authenticated edge/API layer, or static exports safe to commit.

## Future work

Later phases can replace the testing auth, entitlement, billing, and dashboard data seams with real services without rewriting the dashboard/router shell.
