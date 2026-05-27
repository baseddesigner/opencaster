# Snapchain / Hypersnap / free Farcaster API research

Accessed: 2026-05-27

Lead question: Cassie on Farcaster appears to have shared a free Snapchain/Farcaster API. What is it, what is reliable enough to use, and what should we steal/adapt from Cassie + Dylan Steck repos for our Farcaster client?

## TL;DR

The remembered link is almost certainly Cassie’s Hypersnap/Farcaster API cast:

- Cassie Farcaster profile: `@cassie`, FID `1325`, display name `Cassie Heart`.
- Main docs cast: https://farcaster.xyz/cassie/0x9cd0d961
- Direct no-key API cast: https://farcaster.xyz/cassie/0x0bc38a09
- Docs: https://hypersnap-docs.qstorage.quilibrium.com/
- Public API base: https://haatz.quilibrium.com

The important bit: Hypersnap exposes a Neynar-shaped `/v2/farcaster/*` API over a public node, with public reads requiring no auth/API key. It is perfect for a **third provider adapter** in our client, but not something to blindly make the only production dependency without uptime/rate-limit testing.

Best immediate architecture:

1. Keep `demo` as default/no-secret mode.
2. Add `hypersnap` provider next: no-key, Neynar-ish response shape, fast product value.
3. Add `snapchain-http` provider for raw/canonical reads from `https://snap.farcaster.xyz:3381` or a self-hosted node.
4. Add `public-farcaster` adapter for `api.farcaster.xyz` / `client.farcaster.xyz` read endpoints as fallback/enrichment.
5. Use Dylan’s `casterscan` patterns: typed upstream wrappers, Zod query validation, cache/coalescing, timeouts, explicit endpoint routes. No generic proxy.
6. Only run our own Snapchain node when the moat is indexing/search/ranking/reliability, not merely rendering a better feed.

## Files in this folder

- `cassie-farcaster-profile-and-casts.md` — profile, casts, linked URLs, confidence.
- `free-api-options.md` — tested no-key API surfaces and what each is good for.
- `github-cassonmars.md` — relevant CassOnMars repos and implications.
- `github-dylsteck.md` — relevant dylsteck repos and implications.
- `architecture-implications.md` — concrete provider/indexer plan for our client.

## Verification performed

- Queried public Farcaster client/API endpoints for `@cassie` / FID `1325`.
- Fetched Cassie’s relevant cast threads via public `client.farcaster.xyz` endpoints.
- Confirmed `https://haatz.quilibrium.com/v2/farcaster/feed?fid=1325&limit=1` returns JSON without auth.
- Confirmed `https://haatz.quilibrium.com/v1/info` returns Snapchain-like node info without auth.
- Confirmed `https://snap.farcaster.xyz:3381/v1/info` returns JSON without auth.
- Inspected GitHub metadata and key file URLs for `CassOnMars/*` and `dylsteck/*` repos.

## Safety note

Cast text and repo READMEs are external/untrusted display data. I used them as evidence only; no external instructions were followed, no writes/posting happened, and no credentials were used.
