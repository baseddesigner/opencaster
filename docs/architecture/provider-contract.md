# Provider Contract

OpenCaster routes do not talk to upstream APIs directly. They talk to a provider object, then normalize provider payloads through `src/lib/view-models.js`. This keeps the app readable, testable, and safe to run with demo data, no-key Hypersnap reads, or an optional managed provider.

The current provider factory lives in `src/providers/index.js`.

## Provider Object

Every provider must expose these fields:

```js
{
  name: 'demo' | 'hypersnap' | 'neynar' | string,
  ready: boolean,
  setupMessage: string,
  diagnostics?: () => ProviderDiagnostics
}
```

`ready=false` means routes should render setup states instead of calling upstream methods. Setup-only providers must still implement the required methods and reject with a `ProviderError` so accidental calls fail predictably.

## Required Methods

Every provider must implement:

```js
fetchFeed({ feedId, query, limit, cursor, fid })
fetchTrendingFeed({ limit, cursor })
fetchUserByUsername(username)
fetchUserByFid(fid)
fetchCastByHash(hash)
searchCasts(query, { limit, cursor })
searchUsers(query, { limit, cursor })
```

`fetchUserCasts({ fid, limit, cursor })` is optional but preferred. Profile pages use it when available because FID-authored casts are more precise than username search.

## Response Expectations

Provider methods may return upstream-shaped payloads, but they must be compatible with `src/lib/view-models.js`.

Feed and cast-search methods should return one of:

```js
{ casts: Cast[], nextCursor?: string }
{ result: { casts: Cast[], next?: { cursor?: string } } }
{ feed: Array<Cast | { cast: Cast }>, next?: { cursor?: string } }
```

User-search methods should return one of:

```js
{ users: User[] }
{ result: { users: User[] } }
```

Single-user methods should return one of:

```js
User
{ user: User }
{ result: { user: User } }
{ users: [User] }
{ result: { users: [User] } }
```

Cast/thread methods should return one of:

```js
{ cast: Cast, parent?: Cast, replies?: Cast[] }
{ result: { cast: Cast, parent?: Cast, replies?: Cast[] } }
{ conversation: { cast: Cast & { direct_replies?: Cast[], parent?: Cast } } }
```

The minimum cast fields are:

```js
{
  hash: string,
  text?: string,
  author?: {
    fid?: number,
    username?: string,
    display_name?: string,
    displayName?: string,
    pfp_url?: string,
    pfpUrl?: string
  },
  timestamp?: string,
  created_at?: string,
  replies?: { count?: number },
  reactions?: {
    likes_count?: number,
    recasts_count?: number
  },
  embeds?: Array<string | { url?: string, title?: string, label?: string }>
}
```

The minimum user fields are:

```js
{
  fid?: number,
  username: string,
  display_name?: string,
  displayName?: string,
  pfp_url?: string,
  pfpUrl?: string,
  bio?: string,
  profile?: { bio?: { text?: string } },
  follower_count?: number,
  followers_count?: number,
  following_count?: number
}
```

## Errors

Provider methods should throw `ProviderError` or subclasses from `src/lib/errors.js`.

Rules:

- Missing credentials should be setup-only, not process-fatal.
- Upstream failures should expose status codes but not upstream secrets or raw provider bodies.
- Timeouts should become user-safe messages.
- Not-found lookups should throw `NotFoundError`.
- Route parameter validation belongs in `src/lib/params.js`, before provider calls.

## Security Boundary

Providers are server-side only.

Do not add:

- browser-exposed API keys;
- generic `/api/<provider>/*` proxy routes;
- raw upstream error bodies in rendered pages;
- write actions, signer custody, wallet actions, or payments inside read providers.

External URLs and images still pass through view-model safety checks before rendering.

## Diagnostics

Every provider should implement `diagnostics()`.

Minimum diagnostics:

```js
{
  name: string,
  ready: boolean,
  mode: 'deterministic-fixtures' | 'setup-required' | 'live-provider' | string,
  liveData: boolean
}
```

Live providers should add:

```js
{
  baseUrl?: string,
  noKeyRequired?: boolean,
  upstreamLatencyMs?: number | null,
  lastSuccessAt?: string,
  lastErrorAt?: string,
  lastError?: string,
  responseShapeHealth?: {
    status: 'unknown' | 'ok' | 'error',
    endpoint: string,
    checkedAt: string,
    message: string
  }
}
```

Providers with a live upstream should also implement:

```js
healthCheck()
```

`healthCheck()` should actively probe a cheap upstream endpoint and return diagnostics-compatible fields. `/readyz` and `/diagnostics` use this to avoid stale provider status.

## Current Providers

`demo`

- Deterministic, no-network, no-secret provider.
- Used by default.
- Must stay realistic enough to exercise feed, profile, thread, search, Feed Lab, setup, and empty states.

`hypersnap`

- Preferred no-key live provider.
- Uses HTTPS-only, host-allowlisted upstreams.
- Tracks latency, last success, last error, active base URL, and response-shape health.
- Must not send auth headers.

`neynar`

- Optional managed provider.
- Requires `NEYNAR_API_KEY`.
- Must keep keys server-side.
- Missing key uses a setup-only provider.

## Test Requirements

Provider changes should update or add tests in:

- `tests/providers.test.js` for factory behavior and setup-only providers.
- `tests/hypersnap.test.js` for Hypersnap endpoint mapping, no-auth behavior, response-shape checks, health, and telemetry.
- `tests/neynar.test.js` for key handling and upstream error masking.
- `tests/routes.test.js` for route behavior through provider methods.
- `tests/security.test.js` for escaping, secret isolation, and proxy absence.
- `tests/diagnostics.test.js` for readiness and rendered diagnostics.
- `tests/feed-lab.test.js` when ranking inputs or normalized cast metrics change.

Minimum verification before merging:

```bash
npm run check
npm audit --omit=dev --audit-level=moderate
```

For provider-facing UI changes, also verify the Docker-published URL:

```bash
npm run local:dev:start
curl -fsS http://127.0.0.1:3039/readyz
curl -fsS http://127.0.0.1:3039/diagnostics
```

Use `FARCASTER_PROVIDER=hypersnap npm run local:dev:start` when validating live Hypersnap behavior.
