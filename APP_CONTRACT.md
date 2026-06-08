# App Contract

This document defines the current framework-only contract for Lazy Acres Suite.

## Goals

- Provide a dashboard landing page.
- Provide a central module registry.
- Provide hash-based routing for static hosting.
- Provide direct module routes.
- Keep household, commercial-candidate, and work modules clearly separated.
- Keep Tod and Donna testing access open without login.
- Preserve seams for future auth, entitlement, and billing work.

## Non-goals for this phase

- No migration of existing app logic.
- No copied legacy pages.
- No `legacy/marquette-xc-ski.html` or other legacy HTML files.
- No Stripe implementation.
- No Supabase Auth implementation.
- No real entitlement enforcement.

## Module registry contract

Modules are registered in `assets/app-shell/modules.js` with:

- `slug`: hash route segment, for example `foraging` for `/#/foraging`.
- `title`: display title.
- `description`: dashboard and placeholder description.
- `status`: framework status label.
- `group`: one of `household`, `commercial-candidate`, or `work`.
- `legacyUrl`: optional external link to the current legacy app.
- `legacyLabel`: label for the legacy app button.

## Placeholder service contract

- `authService` returns an unauthenticated testing household session.
- `entitlementService` returns `canView: true` and `canOpen: true` for every module.
- `billingService` reports billing as disabled and not implemented.

Future real services should keep these public method names where practical so the app shell does not need to be rewritten.
