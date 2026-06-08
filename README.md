# Lazy Acres Suite

Clean modular app suite framework for `tpoirier1969/Lazy-Acres-Suite`.

This repository is currently framework-only. It does **not** migrate existing app logic, copy legacy app pages, implement Stripe, implement Supabase Auth, or implement real entitlement enforcement.

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
```

## Routes

The shell uses hash-based routing so it works from static hosting without server rewrite rules.

- `/#/dashboard` opens the dashboard landing page.
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

## Future work

Later phases can replace the testing auth, entitlement, and billing stubs with real services without rewriting the dashboard/router shell.
