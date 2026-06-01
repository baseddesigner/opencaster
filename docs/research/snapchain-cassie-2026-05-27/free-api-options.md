# Free / no-key Farcaster + Snapchain API options

Accessed: 2026-05-27

## Option A — Hypersnap public API

- Base: `https://haatz.quilibrium.com`
- Docs: https://hypersnap-docs.qstorage.quilibrium.com/
- Cassie docs cast: https://farcaster.xyz/cassie/0x9cd0d961
- Cassie direct API cast: https://farcaster.xyz/cassie/0x0bc38a09
- Tested:
  - `GET https://haatz.quilibrium.com/v2/farcaster/feed?fid=1325&limit=1` → 200 JSON without auth.
  - `GET https://haatz.quilibrium.com/v1/info` → 200 JSON without auth.
- Docs evidence from `print.html`:
  - “Public reads (no auth). Casts, users, feeds, channels, reactions, follows, search.”
  - “No auth, no signed headers, no API key.”
  - Public node is listed as `https://haatz.quilibrium.com`.

Best use:

- First real no-key provider for our client.
- Neynar-shaped reads: feeds, profiles, casts, search, channel-style surfaces.
- Great for demo-to-live progression without maintainers handing over credentials.

Risks:

- Public mirror, not our infra.
- Unknown uptime/rate-limit/SLA.
- Need response-shape regression tests: “Neynar-shaped” is not identical to Neynar forever.
- We should cache/coalesce aggressively and add provider health/status UI.

Recommended adapter:

```txt
src/providers/hypersnap-provider.js
  fetchFeed({ feedId, cursor, limit, fid })
  fetchUserByUsername(username)
  fetchUserByFid(fid)
  fetchCastByHash(hash)
  searchCasts(query, { cursor, limit })
  searchUsers(query, { cursor, limit })
```

## Option B — Official/public Snapchain HTTP API

- Base tested: `https://snap.farcaster.xyz:3381`
- Tested: `GET https://snap.farcaster.xyz:3381/v1/info` → 200 JSON without auth.
- Snapchain repo/docs: https://github.com/farcasterxyz/snapchain
- CassOnMars fork: https://github.com/CassOnMars/snapchain

Common endpoints from docs/repo inspection:

- `/v1/info`
- `/v1/fids`
- `/v1/castById`
- `/v1/castsByFid`
- `/v1/castsByParent`
- `/v1/castsByMention`
- `/v1/reactionsByFid`
- `/v1/reactionsByCast`
- `/v1/linksByFid`
- `/v1/linksByTargetFid`
- `/v1/userDataByFid`
- `/v1/verificationsByFid`
- `/v1/storageLimitsByFid`
- `/v1/userNameProofByName`
- `/v1/onChainSignersByFid`
- `/v1/onChainEventsByFid`
- `/v1/events`
- `/v1/eventById`

Best use:

- Raw/canonical protocol data.
- Profile pages and per-FID history if we can hydrate names/avatars separately.
- Indexer ingestion/events, especially with gRPC later.

Risks:

- Raw protocol APIs are not feed/search/ranking APIs.
- No hydrated author objects, no “nice client” shape by default.
- Public endpoint may not be intended as a product dependency. Cache and be polite.
- For own node: docs imply 16GB RAM, 4 vCPU, public IP, and roughly 1.5–2TB disk. Infra cosplay tax is real.

Recommended adapter:

```txt
src/providers/snapchain-http-provider.js
  raw reads only; convert into our stable CastCard/ProfileCard via hydration layer
```

## Option C — Farcaster public API

- Base tested: `https://api.farcaster.xyz`
- Tested: `GET https://api.farcaster.xyz/v2/user?fid=1325` → 200 JSON without auth.
- Used in dylsteck repos for:
  - `/v2/user`
  - `/v2/thread-casts`
  - `/v2/casts`

Best use:

- User/profile hydration.
- Per-user casts/archive sync.
- Thread reads if route remains stable.

Risks:

- Public but not necessarily a contractual developer API.
- CORS/browser behavior may vary; call server-side.
- Need timeouts and fallback providers.

## Option D — Farcaster client API

- Base tested: `https://client.farcaster.xyz`
- Tested: `GET https://client.farcaster.xyz/v2/user-by-username?username=cassie` → 200 JSON without auth.
- Used in Dylan’s `farcaster-api-proxy`.
- Relevant endpoints observed:
  - `/v2/user-by-username?username=...`
  - `/v2/user-thread-casts?username=...&castHashPrefix=...&limit=...`
  - `/v2/user?fid=...`
  - `/v2/search-casts?q=...`
  - `/v2/search-users?q=...`
  - `/v2/search-summary?q=...`

Best use:

- Search/users/threads when Hypersnap is down or shape mismatch occurs.
- Server-side proxy route with careful validation.

Risks:

- “Client API” is the phrase that should make your whiskers twitch. It can change.
- Do not expose a generic proxy. Add exact routes only.

## Option E — fname registry

- Base: `https://fnames.farcaster.xyz`
- Use: username ↔ FID lookup.
- Example pattern from Snapchain docs: `/transfers?name=farcaster`.

Best use:

- Lightweight fallback for `username → fid` before calling raw Snapchain APIs.

## Ranking for our client

1. **Hypersnap** — highest immediate leverage. No key, hydrated, client-shaped.
2. **Public Farcaster API** — good enrichment fallback.
3. **Snapchain HTTP** — canonical raw provider and future indexer source.
4. **Farcaster client API** — useful but brittle; treat as fallback/server-only.
5. **Own Snapchain node** — only when reliability/indexing/search becomes the business, not now.
