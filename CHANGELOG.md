# Changelog

## 0.1.5 - Basic suite search

- Added a basic command/search enhancer for the suite header.
- Search now covers Home, Today, and the current module registry.
- Pressing Enter opens the best match; clicking a result opens that route.
- Added a new suite SVG icon asset and bumped cache-buster query strings to `0.1.5`.

## 0.1.4 - Theme prototype

- Reworked the dashboard into a fuller Field Lab-style page prototype with header, command bar, side rail, hero, module grid, and quick panels.
- Added an automatic theme system: Field Lab during the day and Aurora Utility at night.
- Added manual theme controls for Auto, Field, and Aurora.
- Added theme-aware CSS variables, per-app accent colors, and Aurora dark-mode styling.
- Added a first real-page pass at soft membrane-style controls and raised module surfaces.
- Bumped cache-buster query strings to `0.1.4`.

## 0.1.3 - Copy module links

- Added a Copy link button to dashboard app cards and module detail pages.
- Copy buttons write the live Lazy Acres Suite module route to the clipboard.
- Bumped cache-buster query strings to `0.1.3`.

## 0.1.2 - Shared landing icon

- Reused the existing Lazy Acres Home icon assets for browser favicons, Apple touch icon, and the suite header mark.
- Bumped cache-buster query strings to `0.1.2`.

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
