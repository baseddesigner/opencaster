# GitHub: dylsteck relevant repos

Accessed: 2026-05-27

Profile: https://github.com/dylsteck

## 1) dylsteck/casterscan

- URL: https://github.com/dylsteck/casterscan
- Description: “A block explorer for Farcaster”
- Stars: 33
- Language: TypeScript
- Last pushed: 2026-05-23T23:12:03Z

This is the highest-value repo for our Snapchain/free-API path.

Relevant files:

- Snapchain upstream wrapper: https://github.com/dylsteck/casterscan/blob/main/app/server/upstream/snapchain.ts
- Hypersnap client: https://github.com/dylsteck/casterscan/blob/main/app/server/upstream/hypersnap-client.ts
- Farcaster public API wrapper: https://github.com/dylsteck/casterscan/blob/main/app/server/upstream/farcaster.ts
- API validation contracts: https://github.com/dylsteck/casterscan/blob/main/app/contracts/api.ts

Important endpoints/patterns:

- Snapchain base defaults to `https://snap.farcaster.xyz:3381`.
- Hypersnap public mirror defaults to `https://haatz.quilibrium.com`.
- Farcaster API defaults to `https://api.farcaster.xyz`.
- Routes/wrappers cover:
  - `/v1/info`
  - `/v1/castsByFid`
  - `/v1/reactionsByFid`
  - `/v1/linksByFid`
  - `/v1/verificationsByFid`
  - `/v1/onChainSignersByFid`
  - `/v1/castById`
  - `/v1/eventById`
  - `/v2/farcaster/cast`
  - `/v2/farcaster/user/bulk`
  - `/v2/farcaster/user/by_username`
  - `/v2/user`
  - `/v2/thread-casts`

What to copy conceptually:

- Three-upstream model: Snapchain raw + Hypersnap enriched + Farcaster public API hydration.
- Explicit upstream wrappers, not fetch calls scattered across routes.
- Zod validation around query params.
- Timeouts, cache/coalescing, optional Redis.
- Endpoint-specific API routes; no generic proxy.

## 2) dylsteck/litecast

- URL: https://github.com/dylsteck/litecast
- Description: “A beautiful yet simple Farcaster client”
- Stars: 67
- Language: TypeScript
- Last pushed: 2026-04-12T21:48:59Z

Best repo for actual client UX patterns.

Relevant files:

- Neynar constants: https://github.com/dylsteck/litecast/blob/main/lib/neynar/constants.ts
- Neynar client wrapper: https://github.com/dylsteck/litecast/blob/main/lib/neynar/client.ts
- Feed API route: https://github.com/dylsteck/litecast/blob/main/app/api/feed%2Bapi.ts

Useful endpoint classes:

- following/trending/for-you/channel feeds;
- user casts;
- cast + conversation;
- bulk users;
- user by username;
- notifications;
- cast/user/frame search;
- reactions.

Implication:

- Use for product/UX ideas: feed, thread, compose, embeds, mini-app embeds, mobile ergonomics.
- Do not copy client-exposed API-key patterns into production. Keep privileged keys server-side.

## 3) dylsteck/farcaster-api-proxy

- URL: https://github.com/dylsteck/farcaster-api-proxy
- Description: “A lightweight Farcaster client API proxy written in Go”
- Stars: 0
- Language: Go
- Last pushed: 2025-09-05T04:08:13Z

Relevant upstream:

- `https://client.farcaster.xyz/v2`

Routes observed:

- `GET /{username}` → `user-by-username`
- `GET /{username}/{hash}` → `user-thread-casts`
- `GET /fids/{fid}` → `user`
- `GET /search/casts?q=...` → `search-casts`
- `GET /search/users?q=...` → `search-users`
- `GET /search/summary?q=...` → `search-summary`

Implication:

- Very small pattern for server-side public-client-API reads.
- Needs production hardening if copied: validation, escaping, rate limits, cache, observability, narrower CORS.

## 4) dylsteck/farcaster-archive

- URL: https://github.com/dylsteck/farcaster-archive
- Stars: 0
- Language: TypeScript
- Last pushed: 2026-01-27T03:09:56Z

What it does:

- Archives all casts/replies for a Farcaster user to JSONL with incremental sync.

Relevant public endpoints:

- `https://api.farcaster.xyz/v2/casts?fid=...&limit=100&cursor=...`
- Neynar fallback: `/v2/farcaster/feed/user/casts` with `include_replies=true`.

Implication:

- Good pattern for per-user history import and cache warming.
- Useful if our client adds local archives, profile history, or user-specific search.

## 5) dylsteck/farcasterkit

- URL: https://github.com/dylsteck/farcasterkit
- Description: “React hooks for the best Farcaster apps”
- Stars: 55
- Language: TypeScript
- Last pushed: 2025-12-12T05:19:23Z

Useful pieces:

- API-over-Postgres shape.
- Old hub replicator/subscriber ideas:
  - backfill casts/reactions/links/signers/verifications/userdata;
  - subscribe to merge/revoke/prune/onchain/name events.

Caution:

- Older hub code. Use as architecture reference, not copy-paste protocol implementation.

## 6) dylsteck/opencast

- URL: https://github.com/dylsteck/opencast
- Description: “A fully open source Twitter flavoured Farcaster client”
- Stars: 0
- Language: TypeScript
- Fork
- Last pushed: 2024-09-23T17:01:01Z

Useful pieces:

- Self-hosted hub-backed client architecture.
- `@farcaster/hub-web` signing/submission patterns.
- Submit message routes and batch submission.

Caution:

- Older/forked. Protocol assumptions need updating for Snapchain.

## Other useful but secondary repos

- `dylsteck/litecast-web` — archived web Litecast, Neynar write/auth patterns.
- `dylsteck/siwf-next-app-router` — focused SIWF + NextAuth demo.
- `dylsteck/mini-app-template` — Base/Farcaster mini app template, Better Auth + SIWE + Convex.
- `dylsteck/minikit-kitchen-sink` — mini app notifications/webhooks.
- `dylsteck/tap` — AI assistant + mini-app generation patterns.
- `dylsteck/create-farcaster-app` — scaffold pointers.

## Ranking for reuse

1. `casterscan` — source this first for provider architecture.
2. `litecast` — source this for UI/feed/thread/product patterns.
3. `farcaster-api-proxy` — source this for exact public-client-API endpoints.
4. `farcaster-archive` — source this for per-user local sync.
5. `farcasterkit` — source this for indexer/API shape, with modernizing.
6. `opencast` — source this for old open social-client write architecture only if writes become in-scope.
