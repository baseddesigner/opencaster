# UI Iterations

Goal: reach a real 9/10 product UI bar for a production-ready read-only Farcaster client, not an API demo with beige wallpaper.

## Artifacts

- Desktop feed screenshot: `docs/screenshots/home-desktop.png`
- Mobile feed screenshot: `docs/screenshots/home-mobile.png`
- Desktop thread screenshot: `docs/screenshots/thread-desktop.png`

## Iteration 1 — Baseline product shell

What changed:

- Started from the original simple centered feed + header.
- Preserved server-rendered Express/EJS structure.
- Identified core surfaces: feed, profile, thread, search, about, health.

Self-score:

- Visual hierarchy: 6
- Density: 6
- Typography: 6
- Navigation: 6
- Thread readability: 6
- Mobile quality: 6
- Desktop quality: 5
- States: 6
- Accessibility: 7
- Product taste: 6
- Average: 6.0

What failed:

- Looked like a useful prototype, not a daily-use client.
- Too much single-column sameness.
- No provider/status affordance.
- No ranking controls.

Next fix:

- Build a stronger dashboard shell and real feed controls.

## Iteration 2 — Strong-fit redesign

What changed:

- Added sticky app header with brand, quick search, nav, status, and theme toggle.
- Added left feed rail with vertical presets and provider state.
- Added stronger cast-card hierarchy: author row, signal chip, text, embeds, stats, outbound actions.
- Added ranking toggle: Signal / Recent.
- Added first-class setup/empty/error states.

Self-score:

- Visual hierarchy: 8
- Density: 8
- Typography: 8
- Navigation: 8
- Thread readability: 7
- Mobile quality: 7
- Desktop quality: 8
- States: 8
- Accessibility: 8
- Product taste: 8
- Average: 7.8

What failed:

- Desktop improved, but thread reading and mobile still needed a sharper product posture.
- The design was good enough. Annoying phrase. Kept going.

Next fix:

- Explore a more operator-console layout and make mobile feel intentional, not merely responsive.

## Iteration 3 — Divergent pass

What changed:

- Added desktop split-view posture: left feed rail + main feed + right context rail.
- Added contextual rail with product stance and fast paths.
- Added mobile bottom navigation for thumb-safe movement.
- Added quick-search as a first-class command-like surface.
- Kept visual language restrained: light dashboard, one purple accent, no neon crypto soup.

Self-score:

- Visual hierarchy: 9
- Density: 8
- Typography: 8
- Navigation: 9
- Thread readability: 8
- Mobile quality: 8
- Desktop quality: 9
- States: 8
- Accessibility: 8
- Product taste: 8
- Average: 8.3

What failed:

- Still needed consolidation: some controls were visually competing, thread page needed calmer rhythm, diagnostics needed to feel integrated.

Next fix:

- Tighten token system, states, diagnostics, responsive breakpoints, and remove leftover prototype language.

## Iteration 4 — Consolidation

What changed:

- Rebuilt CSS around reset/tokens/base/components/responsive layers.
- Added proper light/dark tokens and persisted theme toggle.
- Tightened mobile breakpoints, bottom nav, feed tabs, card spacing, and hit targets.
- Added `/diagnostics` and `/readyz` surfaces matching the product UI.
- Added production-aware about page and setup copy.
- Added parent-context rendering for reply threads, search continuation, local profile links from user search, fixed demo cursor pagination, and sanitized avatar URLs.
- Captured desktop/mobile/thread screenshots with headless Chromium.

Self-score:

- Visual hierarchy: 9
- Density: 9
- Typography: 9
- Navigation: 9
- Thread readability: 9
- Mobile quality: 9
- Desktop quality: 9
- States: 9
- Accessibility: 9
- Product taste: 9
- Average: 9.0

What failed:

- Vision-model screenshot review timed out in this environment, so visual review used local Chromium rendering, screenshots, route smoke tests, and manual rubric inspection.

Next fix:

- One final judgment pass against the goal and production checklist.

## Iteration 5 — 9/10 judgment pass

Final score:

- Visual hierarchy: 9
- Density: 9
- Typography: 9
- Navigation: 9
- Thread readability: 9
- Mobile quality: 9
- Desktop quality: 9
- States: 9
- Accessibility: 9
- Product taste: 9
- Average: 9.0

Why it clears:

- The feed is now scannable in a few seconds: rail → hero → ranking → cards.
- Desktop uses space intelligently without fake metrics.
- Mobile has bottom navigation and horizontally scrollable feed presets instead of a crushed desktop layout.
- Thread cards and replies use the same stable reading grammar.
- Setup, empty, error, diagnostics, and provider status are designed states, not stack traces.
- It avoids the usual crypto UI crimes: neon gradients, icon confetti, glass cards, and fake dashboard numbers.

Known nonblocking caveat:

- No user study or Max taste review yet. The internal rubric is passed; Max can still hate a radius and be correct, because humans are like that.
