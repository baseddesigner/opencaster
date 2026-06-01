# Architecture implications for our Farcaster client

Accessed: 2026-05-27

## Current client state

Our app is now a production-shaped no-build Express/EJS Farcaster client with:

- default no-secret `demo` provider;
- optional Neynar seam;
- feed/profile/thread/search/about/diagnostics;
- no generic provider proxy;
- tests for escaping, secret non-leakage, provider defaults, routes, diagnostics, and UI blocker regressions.

This research says the next move should not be “run a Snapchain node tomorrow.” The next move is a **no-key Hypersnap provider** plus a raw Snapchain adapter behind the same provider boundary.

## Provider stack proposal

```txt
Route/view layer
  -> provider interface
      -> demo provider                 # current default, deterministic
      -> hypersnap provider            # no-key hydrated reads via haatz.quilibrium.com
      -> neynar provider               # optional key, production managed provider
      -> snapchain-http provider       # raw canonical reads via snap.farcaster.xyz or own node
      -> public-farcaster provider     # api/client.farcaster.xyz fallback
  -> cache/coalescing/rate guard
  -> stable view models
```

## Build order

### Phase 1 — Hypersnap provider

Goal: get real Farcaster data without private env vars.

Tasks:

- Add `FARCASTER_PROVIDER=hypersnap`.
- Add `HYPERSNAP_BASE_URL`, default `https://haatz.quilibrium.com`.
- Implement exact provider methods:
  - feed by FID or feed preset;
  - cast by hash;
  - user by username/FID;
  - cast search;
  - user search.
- Add response-shape normalization tests with recorded/minimal fixtures.
- Add `/diagnostics` provider health checks:
  - base URL;
  - last success/error;
  - latency bucket;
  - no key required.
- Keep `demo` default so boot remains no-network/no-secret.

Acceptance:

- `FARCASTER_PROVIDER=hypersnap npm run smoke` passes.
- Key pages render live data.
- No generic `GET /api/hypersnap/*` proxy appears.
- Endpoint failures show setup/error states, not stack traces.

### Phase 2 — Public Snapchain HTTP provider

Goal: prove raw canonical reads can power profile/cast/thread surfaces.

Tasks:

- Add `SNAPCHAIN_HTTP_BASE_URL`, default `https://snap.farcaster.xyz:3381`.
- Implement raw client methods for:
  - `/v1/info`;
  - `/v1/castsByFid`;
  - `/v1/castById`;
  - `/v1/castsByParent`;
  - `/v1/userDataByFid`;
  - `/v1/verificationsByFid`;
  - `/v1/linksByFid`;
  - `/v1/reactionsByCast` if available/needed.
- Add a hydration layer:
  - username/FID lookup from `fnames.farcaster.xyz` or public Farcaster API;
  - profile metadata from user data messages;
  - reaction counts if needed.

Acceptance:

- `/diagnostics` shows Snapchain node info.
- Profile and cast pages can render from raw Snapchain data for known FIDs/hashes.
- Search/feed remain Hypersnap/Neynar/public-Farcaster until we own an index.

### Phase 3 — Indexed mode

Goal: make Snapchain useful for search, feeds, ranking, and alerts.

Do this only if we want an actual data moat.

Options:

- Reuse `hub-monorepo/packages/shuttle` / Snapchain-compatible event sync to Postgres.
- Consume gRPC `Subscribe` / HTTP events continuously.
- Store normalized messages, users, follows, reactions, links, verifications, and onchain events.
- Add search index / ranking workers / materialized feeds.

Acceptance:

- Historical backfill is understood.
- Event pruning windows do not cause data loss.
- Feed/search quality beats managed-provider defaults for our chosen vertical.

## What to copy from Dylan’s Casterscan

- Upstream client modules per provider.
- Exact route contracts and Zod validation.
- Cache TTLs and request coalescing.
- Timeout wrappers.
- Public API + Snapchain + Hypersnap combined model.

## What not to copy

- Any client-exposed provider secret pattern.
- A generic proxy endpoint.
- Old hub implementation details from historical repos without modernizing.
- A full node/indexer before product need exists.

## Product implications

### If we want a general Farcaster client

Use Hypersnap/Neynar-style hydrated APIs. Raw Snapchain alone is too low-level.

### If we want a better search/ranking client

Snapchain/indexing becomes valuable. The asset is the derived database: normalized graph, labels, ranking, user feedback, and historical search.

### If we want agent-readable Farcaster intelligence

Best wedge:

```txt
Snapchain/Hypersnap ingest
  -> normalized local index
  -> vertical scoring feeds
  -> paid x402 endpoints for agents
  -> UI as receipt/debug surface
```

That has revenue shape. “A prettier Warpcast clone” does not.

## Recommended next implementation issue

Title: `feat: add no-key Hypersnap provider`

Scope:

- Add provider adapter for `https://haatz.quilibrium.com`.
- Wire feed/profile/thread/search routes through it.
- Add diagnostics and tests.
- Keep demo default.
- Add provider selection docs.

Why now:

- It uses Cassie’s free API find immediately.
- It keeps the project moving without asking maintainers for keys.
- It strengthens the provider seam we just built.
- It gives the UI real data without operating Snapchain infra.
