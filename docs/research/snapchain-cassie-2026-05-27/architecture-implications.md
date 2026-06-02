# Architecture implications for our Farcaster client

Accessed: 2026-05-27
Updated: 2026-06-02

## Current client state

Our app is now a production-shaped no-build Express/EJS Farcaster client with:

- default no-secret `demo` provider;
- optional Neynar seam;
- feed/profile/thread/search/about/diagnostics;
- no generic provider proxy;
- tests for escaping, secret non-leakage, provider defaults, routes, diagnostics, and UI blocker regressions.

This research says the next move should not be “run a Snapchain node tomorrow.” The next move is a **no-key Hypersnap provider** and deeper Hypersnap compatibility before any raw Snapchain provider work. The raw Snapchain path is reserved for owned indexing, search, ranking, or node operations.

2026-06-02 update: prefer `farcasterorg/hypersnap` over Farcaster's raw Snapchain provider path for OpenCaster. That repo is public, describes itself as "Snapchain, made hyperdimensional," and includes the Rust/Docker operational surface we would rather track if we eventually operate infrastructure. For app-level reads, the hosted Hypersnap HTTP API remains the preferred source.

## Provider stack proposal

```txt
Route/view layer
  -> provider interface
      -> demo provider                 # current default, deterministic
      -> hypersnap provider            # no-key hydrated reads via haatz.quilibrium.com
      -> neynar provider               # optional key, production managed provider
      -> public-farcaster provider     # api/client.farcaster.xyz fallback
      -> snapchain/indexed provider    # later owned index, not next app provider
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

### Phase 2 — Hypersnap hardening and coverage

Goal: make Hypersnap the preferred live read path and prove it is reliable enough for public OpenCaster usage.

Tasks:

- Expand endpoint fixtures for feeds, casts, users, search, conversation, and health.
- Track upstream latency and last success/error in diagnostics.
- Keep `HYPERSNAP_BASE_URL` HTTPS-only and host-allowlisted.
- Document the relationship between hosted Hypersnap reads and the `farcasterorg/hypersnap` repo.
- Treat public Farcaster APIs as fallback/enrichment, not the primary provider.

Acceptance:

- `/diagnostics` clearly reports Hypersnap health, base host, and no-key mode.
- Hypersnap smoke paths pass without Neynar credentials.
- Fixture tests catch response-shape drift.
- No raw Snapchain provider is added unless it supports a concrete owned-indexing/search need.

### Phase 3 — Indexed mode

Goal: make Snapchain/Hypersnap infrastructure useful for search, feeds, ranking, and alerts.

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

Snapchain/Hypersnap indexing becomes valuable. The asset is the derived database: normalized graph, labels, ranking, user feedback, and historical search.

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
