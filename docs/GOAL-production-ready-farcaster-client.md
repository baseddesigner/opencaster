# Goal: Production-Ready Farcaster Client

> **For Hermes:** Build this as far as possible without Max. Do not block on env vars, API keys, credentials, deployment accounts, paid services, or brand decisions. Create clean plug-in seams so those can be added later and everything works smoothly.

## North Star

Turn this repo from a no-build read-only V0 into a production-ready Farcaster client with a genuinely good UI: fast, dense, readable, safe, responsive, and opinionated enough to feel like a product instead of an API demo.

The end state should feel like a daily-use Farcaster power client for people who want signal, search, profiles, threads, and context quickly.

## Hard Constraints

- Do **not** require Max for env vars, API keys, paid provider setup, deployment credentials, signer approvals, wallet actions, or content decisions.
- Do **not** ship app-side casts, likes, follows, DMs, token-gated actions, payments, or signer custody unless Max explicitly approves that later.
- Do **not** expose provider keys in browser code, rendered HTML, logs, or errors.
- Do **not** add a generic provider proxy route.
- Do **not** block production-quality UI work on live Farcaster data. Build with deterministic mock/demo providers and swap in real providers later.
- Keep the app usable with zero secrets: demo data, setup states, mocked provider responses, and local smoke tests must all work.

## Product Scope

### Must Ship

- Home feed with clear ranking/filter controls.
- Vertical feeds / saved feed presets.
- Profile pages by username and FID.
- Cast/thread pages with embeds, parent context, replies, and outbound Farcaster links.
- Search for casts and users with useful empty/error/loading states.
- About/setup page that explains provider status without leaking secrets.
- Health endpoint and production readiness diagnostics.
- Mobile-first layout that still feels powerful on desktop.
- Keyboard-friendly navigation and visible focus states.
- Light/dark mode using design tokens, not one-off CSS hacks.
- Deterministic demo mode that needs no env vars.
- Provider boundary that supports `demo` now and `neynar`/other providers later.

### Later / Plug-In Seams Only

- Real Neynar or other managed provider credentials.
- SIWF/auth.
- Managed signers.
- App-side write actions.
- User accounts and preferences synced server-side.
- Database-backed saved feeds.
- Snapchain-backed indexing.
- Production deployment credentials.

## Architecture Goal

Keep the current simple stack unless there is a concrete reason not to:

- Node.js + Express.
- EJS server-rendered pages.
- Vanilla CSS/JS.
- Server-side provider adapters.
- App-owned view models.
- Short-lived cache.
- `node:test` coverage.

Add production structure without turning it into framework sludge:

```txt
src/
  providers/
    demo-provider.js
    neynar-provider.js
    index.js
  lib/
    view-models.js
    ranking.js
    diagnostics.js
    errors.js
    security.js
  routes/
    home.js
    feed.js
    profile.js
    cast.js
    search.js
    diagnostics.js
views/
  pages/
  partials/
public/
  app.css
  app.js
  design-system.css
  icons/
docs/
  GOAL-production-ready-farcaster-client.md
  UI-ITERATIONS.md
  PRODUCTION-CHECKLIST.md
```

## No-Env Development Strategy

Implement a first-class demo provider:

- `FARCASTER_PROVIDER` defaults to `demo`.
- Demo provider returns realistic deterministic feeds, users, casts, threads, replies, embeds, empty states, and error fixtures.
- Live provider is optional and auto-disabled when credentials are missing.
- Missing live credentials render a setup state, not a crash.
- Tests run entirely against demo/provider fixtures.

This means the app can be designed, tested, reviewed, and production-hardened before Max plugs in secrets.

## UI Goal

The UI should score **9/10 before completion**. Not “pretty enough.” Actually good.

Design posture:

- Dense but not cramped.
- Fast scanning over decorative cards.
- Clean light dashboard by default, with good dark mode.
- One primary accent max.
- Strong typography and spacing before color.
- Mobile bottom nav or thumb-safe primary navigation.
- Desktop split view when useful: feed + context/detail rail.
- Cast cards that make author, text, embeds, stats, and actions legible without sludge.
- Thread reading that feels calm, not like a JSON dump wearing a trench coat.

Avoid:

- Generic neon crypto dashboard.
- Fake metrics.
- Icon confetti.
- Glassmorphism.
- Placeholder testimonials.
- Random gradients.
- Copy that pretends the client has features it does not.

## Required Visual Iteration Loop

Before calling the UI complete, run multiple visual iterations and document them in `docs/UI-ITERATIONS.md`.

Minimum process:

1. **Iteration 1 — Baseline product shell**
   - Home feed, nav, cast card, search, profile preview.
   - Goal: functional hierarchy.

2. **Iteration 2 — Strong-fit redesign**
   - Improve density, typography, spacing, feeds, thread reading, mobile layout.
   - Goal: feels like a real client.

3. **Iteration 3 — Divergent pass**
   - Explore a different layout or interaction model: split view, command/search-first, dashboard rail, or reader mode.
   - Goal: discover a sharper product direction.

4. **Iteration 4 — Consolidation**
   - Pick the best direction, remove gimmicks, tighten components, states, and responsiveness.
   - Goal: shippable visual system.

5. **9/10 judgment pass**
   - Score against the rubric below.
   - If score < 9, do another iteration. No fake victory lap.

Each iteration must include:

- What changed.
- Screenshot or local artifact path if available.
- Self-score by rubric.
- What failed.
- What the next iteration fixes.

## UI Scoring Rubric

Score each 1–10:

- Visual hierarchy: can users scan the page in 3 seconds?
- Density: does it show enough without becoming noisy?
- Typography: are cast text, handles, metadata, and controls balanced?
- Navigation: are feed/search/profile/thread paths obvious?
- Thread readability: can a conversation be followed without friction?
- Mobile quality: does it feel native enough on phone widths?
- Desktop quality: does it use space intelligently?
- States: loading, empty, error, setup, and offline states feel designed.
- Accessibility: contrast, focus, targets, semantic structure.
- Product taste: would Max plausibly say “yeah, this is actually nice”?

Completion requires:

- Average score >= 9.
- No category below 8.
- At least one iteration after the first “good enough” moment. Good enough is where mediocre products go to die.

## Production Readiness Checklist

Create and satisfy `docs/PRODUCTION-CHECKLIST.md` covering:

- Security headers.
- Provider key isolation.
- No secret leaks in HTML/errors/logs.
- No generic proxy routes.
- HTML escaping for all user/provider content.
- Rate limiting or request throttling for expensive routes.
- Cache TTLs and cache-error behavior.
- Graceful provider outage behavior.
- Health and diagnostics routes.
- 404/500 pages.
- Responsive smoke tests.
- Accessibility pass.
- Lighthouse/manual performance notes if browser tooling is available.
- Deployment-ready `npm start` path.
- `.env.example` only; no required local `.env` for demo mode.

## Test Expectations

Keep or expand `npm run check` so it proves:

- Demo mode works with no env vars.
- Live provider missing credentials does not crash.
- Provider adapters normalize into stable view models.
- Routes render all key pages.
- User/cast content is escaped.
- Provider keys cannot appear in rendered output.
- Cache behavior is correct.
- Intent URLs are safe and encoded.
- Search/profile/cast pages tolerate weird provider payloads.
- There is no generic provider proxy.

Add a smoke script if useful:

```bash
npm run check
NODE_ENV=production FARCASTER_PROVIDER=demo HOST=127.0.0.1 PORT=3039 npm start
curl -fsS http://127.0.0.1:3039/healthz
curl -fsS http://127.0.0.1:3039/
curl -fsS http://127.0.0.1:3039/search?q=base&type=casts
```

## Acceptance Criteria

The goal is complete only when:

- The app runs with no secrets in demo mode.
- All existing and new tests pass.
- `npm run check` passes.
- The main pages are production-styled, responsive, and documented.
- UI iterations are documented and the final UI reaches the 9/10 rubric gate.
- Real provider integration can be enabled later by adding credentials/config only, not rewriting the app.
- Production checklist is complete or every remaining item is explicitly marked as Max-gated.
- README points to the goal, UI iterations, setup, and production checklist.

## One-Shot Implementation Prompt

Use this if delegating to a coding agent:

```txt
Build the Farcaster client toward docs/GOAL-production-ready-farcaster-client.md.

Do not ask Max for env vars, API keys, deployment credentials, paid services, or approvals. Default to demo mode and deterministic fixtures. Add clean provider seams so live providers can be plugged in later.

Prioritize production-ready UX and UI. Run at least 4 visual iterations, document them in docs/UI-ITERATIONS.md, and do not call the UI complete until it scores >=9/10 by the rubric with no category below 8. If it scores lower, keep iterating.

Do not add write actions, auth, signer custody, social posting, payments, or external side effects. Keep provider keys server-side only. Do not add a generic provider proxy.

Verify with npm run check, production demo-mode smoke tests, responsive/manual UI review where possible, and docs/PRODUCTION-CHECKLIST.md.

Ship the complete local implementation and leave only explicit Max-gated items for later.
```
