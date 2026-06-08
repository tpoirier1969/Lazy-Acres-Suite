# Changelog

## 0.1.1 - Version flag and cache busting

- Added a visible version flag to the app shell header.
- Added version query strings to the root stylesheet and app-shell entry script.
- Added versioned imports for app-shell JavaScript modules so browser cache refreshes on release bumps.

## 0.1.0 - Framework package

- Added clean static app structure for Lazy Acres Suite.
- Added dashboard landing page shell.
- Added module registry grouped into household, commercial-candidate, and work areas.
- Added hash router with direct module routes.
- Added module placeholder cards with title, description, status, legacy app action, and dashboard return action.
- Added testing-mode auth and entitlement stubs so Tod and Donna can see and open every module without login.
- Added billing placeholder service with no Stripe implementation.
- Added documentation for the framework contract and current non-goals.
