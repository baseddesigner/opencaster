# Goal: Reference Client Source Reuse Pass

> **Implementation note:** Max approved exact source reuse from the Nook and Supercast reference repos under his responsibility. The repos still do not expose verified license metadata in GitHub or local `LICENSE*` files, so docs and comments must say “Max-approved reuse assumption,” not “license verified.”

## North Star

Make Opencaster feel like the best parts of mature Farcaster clients while keeping its current advantage: small, server-rendered, readable, read-only, and easy for agents to improve.

The goal is not to port Nook or Supercast. The goal is to selectively reuse/adapt their best implementation details where exact source helps quality, then translate them into Opencaster’s Express/EJS/vanilla stack without importing framework sludge.

## Reference Sources

- Nook: `wojventures/nook`
  - Local clone: `/root/.hermes/reference-repos/farcaster-clients/nook`
  - Current inspected rev: `aba8569e`
  - Best for: feed shell, cast rendering, embed/media/frame UI, display modes, profile/list/channel density, batching ideas.
- Supercast dump: `felirami/supercast-dump`
  - Local clone: `/root/.hermes/reference-repos/farcaster-clients/supercast-dump`
  - Current inspected rev: `a7b0aa1`
  - Best for: keyboard UX, search polish, composer/scheduling model, draft lifecycle, feed controls.

## Reuse Rule

Allowed:

- Copy exact snippets when useful.
- Translate React/TS/Next patterns into Express/EJS/vanilla JS.
- Preserve attribution in docs when source-derived.
- Keep copied/adapted code small and localized.

Required:

- Add a short source note in the relevant local research/goal doc when code is directly source-derived.
- Keep tests around every adapted behavior.
- Prefer local app-owned view models over provider/repo-specific payload shapes.
- Run `npm run check`, `npm run smoke`, production audit, and local rendered-route smoke before push.

Forbidden until explicitly approved later:

- App-side casts, likes, follows, DMs, token actions, payments, signer custody, or scheduler writes.
- Running reference repo code as trusted code.
- Adding Nook/Supercast as runtime dependencies.
- Importing their auth/account/write flows into production paths.
- Claiming license verification unless a real license/permission artifact is added.

## Current Baseline

Already shipped in `dd0a184` / documented in `19d5f6c`:

- Rich cast text segments.
- Classified embeds: link/image/video/quote/frame.
- Feed/profile display modes: `casts | media | frames | grid`.
- Keyboard shortcuts: `j/k`, `Enter`, `/`, `?`, `g h`, `g s`, `g l`.
- `from:username` search parsing.
- Safe outbound Farcaster actions.

This goal is the next pass: go deeper where exact source reuse now makes sense.

## Product Scope

### Must Ship

1. **Nook-grade cast rendering polish**
   - Improve mention/channel/URL rendering against real provider shapes.
   - Better hidden-URL behavior for embeds.
   - Better quote-cast cards with author/text preview when provider supplies it.
   - Image grids for multi-image casts.
   - Video/link/frame cards with clearer hierarchy.

2. **Nook-grade feed density**
   - Feed shell should scan faster on desktop.
   - Grid/media/frame modes should feel intentional, not filtered leftovers.
   - Add compact card variants where they improve reading speed.
   - Improve empty states per mode.

3. **Profile/list/channel header improvements**
   - Denser profile header with useful stats/actions.
   - Feed preset headers that explain why the lane exists.
   - Channel/list surfaces as read-only route/design seams if provider data exists.

4. **Supercast-grade read-only workflow polish**
   - Tighten keyboard selection, shortcut overlay, and visible focus states.
   - Add keyboard hints where they help without noise.
   - Improve `from:` search UX and search result filters.
   - Add safe feed toggles for replies/recasts/media/frames if provider payloads expose enough metadata.

5. **Write-mode architecture doc only**
   - Draft/composer/scheduling remains design-only.
   - Produce a concrete write-safety architecture doc before any write code.
   - Include auth, managed signers, CSRF, idempotency, audit logs, locks, retries, receipts, and human confirmation.

### Nice to Ship

- Lightweight command palette if it can be done with vanilla JS and no build step.
- Saved feed preset UX using static config links, not accounts/database.
- Better thread reader inspired by Nook conversation cards.
- Display-mode-aware smoke routes and screenshots.

### Explicitly Out of Scope

- React/Next/TS migration.
- Database-backed accounts/preferences.
- Composer UI that can publish.
- Scheduled publishing worker.
- Multi-account posting.
- Swaps, frames execution, custom actions execution, push notifications.

## Architecture Goal

Keep the current stack:

```txt
Node.js + Express
EJS server-rendered pages
Vanilla CSS/JS
Server-side provider adapters
App-owned view models
node:test + supertest
```

Reference source should be translated into these app-owned layers:

```txt
reference repo component/utility
  -> extracted behavior contract
  -> node:test regression
  -> src/lib view model/helper
  -> EJS partial/CSS/vanilla JS
  -> rendered-route smoke
```

Do not import full reference modules. Their stacks are heavier and write-capable; Opencaster’s moat is small, boring, inspectable code.

## Implementation Order

### Phase 1: Source-derived render correctness

- Compare Nook cast text/link/embed utilities against Opencaster’s current `src/lib/cast-text.js` and `src/lib/view-models.js`.
- Add failing tests for provider shapes we do not cover yet.
- Patch the local helpers with source-derived logic where useful.
- Verify HTML escaping and unsafe URL filtering still hold.

### Phase 2: Source-derived embed/card UI

- Compare Nook embed components with `views/partials/embed-card.ejs` and CSS.
- Add tests for quote preview, image grids, video/link/frame cards.
- Patch EJS/CSS with adapted structure.
- Render smoke `/feed/builders?mode=media`, `/feed/builders?mode=frames`, `/cast/:hash`.

### Phase 3: Feed/profile density pass

- Reuse Nook shell/layout ideas where they map cleanly to CSS grid and EJS partials.
- Improve profile/feed headers and display-mode empty states.
- Keep mobile first-cast visibility and no horizontal overflow.

### Phase 4: Supercast read-only workflow pass

- Compare Supercast keyboard/search/feed controls against `public/app.js`, `src/routes/search.js`, and templates.
- Improve selection, shortcut overlay, `from:` parsing, and safe feed controls.
- No composer/publish code.

### Phase 5: Write-mode design doc

- Create `docs/architecture/write-safety.md`.
- Use Supercast scheduling as reference material only.
- Define gates before any future write implementation.

## Test Expectations

Every source-derived behavior needs a failing test first.

Required command gates:

```bash
npm run check
npm run smoke
npm audit --omit=dev --audit-level=moderate
```

Required rendered smoke after implementation:

```bash
HOST=127.0.0.1 PORT=3040 FARCASTER_PROVIDER=demo npm start
curl -fsS http://127.0.0.1:3040/healthz
curl -fsS 'http://127.0.0.1:3040/feed/builders?mode=media'
curl -fsS 'http://127.0.0.1:3040/feed/builders?mode=frames'
curl -fsS 'http://127.0.0.1:3040/search?q=from:clawlinker%20x402&type=casts'
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3040/api/neynar/v2/farcaster/feed
```

Expected proxy status: `404`.

## Acceptance Criteria

Complete means:

- Useful exact-source-derived patterns are implemented or explicitly rejected with reason.
- No Nook/Supercast runtime dependency is added.
- No write surface is added.
- Source-derived areas are documented honestly as Max-approved reuse assumption, not verified license.
- Tests cover text offsets, URL hiding, embed classification, display modes, keyboard/search behavior, and route rendering.
- `npm run check`, `npm run smoke`, production audit, local rendered smoke, and GitHub Actions all pass.
- README points to this goal and the reference research docs.

## One-Shot Implementation Prompt

```txt
Implement docs/GOAL-reference-client-source-reuse.md in Opencaster.

Max approved exact source reuse from `/root/.hermes/reference-repos/farcaster-clients/nook` and `/root/.hermes/reference-repos/farcaster-clients/supercast-dump` under his responsibility. GitHub/local license metadata is still unverified, so do not claim license verification. Add honest source notes where code is directly source-derived.

Keep Opencaster Express/EJS/vanilla JS. Do not migrate to React/Next/TS. Do not add Nook/Supercast as dependencies. Do not run reference repo code as trusted code. Translate useful source into local app-owned helpers, EJS partials, CSS, and vanilla JS.

Stay read-only: no app-side casts, likes, follows, DMs, signer custody, scheduler writes, payments, swaps, frame actions, or custom action execution.

Use TDD. Add failing tests first for each behavior, implement minimal code, then run `npm run check`, `npm run smoke`, `npm audit --omit=dev --audit-level=moderate`, local rendered-route curl smoke, commit, push, and verify GitHub Actions.
```
