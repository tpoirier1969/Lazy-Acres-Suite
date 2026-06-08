# Lazy Acres Suite

Clean modular app suite framework for `tpoirier1969/Lazy-Acres-Suite`.

This repository is currently framework-only. It does **not** migrate existing app logic, copy legacy app pages, implement Stripe, implement Supabase Auth, connect live Scheduler/Shopping/Weather/Recent Activity data, or implement real entitlement enforcement.

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

## Dashboard data adapters

Version `0.1.6` adds browser-side adapter seams for dashboard data without connecting real data in this repository. If `window.LAZY_ACRES_DASHBOARD_ADAPTERS` is not provided at runtime, the Today panels show short unavailable states instead of sample real-world data.

Missing live data/configuration in this environment:

- A readable Scheduler adapter or exported calendar data source.
- A browser-safe weather adapter or public forecast feed.
- A readable recent-activity adapter or local module activity export.
- A readable Shopping List adapter or exported list data source.

Do not use Supabase `service_role` keys in this browser shell. Future data connections must use browser-safe public configuration, an authenticated edge/API layer, or static exports safe to commit.

## Future work

Later phases can replace the testing auth, entitlement, billing, and dashboard data stubs with real services without rewriting the dashboard/router shell.
