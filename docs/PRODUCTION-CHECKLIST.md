# Production Checklist

Status: complete for no-secret demo-mode production readiness and no-key Hypersnap live-read readiness. Neynar credentials and write/auth surfaces remain Max-gated by design.

## Runtime

- [x] `FARCASTER_PROVIDER=demo` works with no `.env` and no secrets.
- [x] `NODE_ENV=production FARCASTER_PROVIDER=demo npm start` boots.
- [x] `npm run check` passes.
- [x] `npm run smoke` covers core routes and confirms no generic provider proxy.
- [x] `FARCASTER_PROVIDER=hypersnap npm run smoke` covers live no-key core routes.
- [x] `/healthz` returns plain `ok` for simple process health.
- [x] `/readyz` returns JSON readiness without secrets.
- [x] `/diagnostics` renders production status without secrets.

## Provider boundary

- [x] Demo provider is deterministic and realistic enough for UI/product review.
- [x] Hypersnap provider gives no-key live reads through `https://haatz.quilibrium.com`.
- [x] Neynar provider remains optional.
- [x] Missing Neynar credentials render setup states instead of crashing.
- [x] Real provider integration can be enabled later via config/credentials only.
- [x] Routes depend on provider methods + view models, not raw provider payloads.
- [x] Provider keys stay server-side.

## Security

- [x] `X-Powered-By` disabled.
- [x] `X-Content-Type-Options: nosniff` set.
- [x] `Referrer-Policy` set.
- [x] `Permissions-Policy` set.
- [x] Content Security Policy set.
- [x] No generic `/api/neynar/*`, `/api/hypersnap/*`, or provider proxy exists.
- [x] Provider key does not appear in rendered HTML, errors, diagnostics, or readiness JSON.
- [x] User/cast content renders through EJS escaping.
- [x] Unsafe external embed URLs and avatar/profile image URLs are filtered.
- [x] External links use `target="_blank" rel="noopener noreferrer"`.
- [x] Basic in-memory request rate limiting is installed.

## UX / UI

- [x] Home feed with ranking controls.
- [x] Vertical feed presets.
- [x] Profile pages by username and FID.
- [x] Cast/thread pages with replies, parent context, and outbound Farcaster links.
- [x] Search for casts and users with cast pagination and local profile links.
- [x] About/setup positioning page.
- [x] Designed setup, empty, and error states.
- [x] Mobile bottom navigation.
- [x] Desktop rail + main feed + context layout.
- [x] Light/dark tokens and persisted theme toggle.
- [x] Focus states and 44px-ish mobile controls.
- [x] Chromium screenshots captured for desktop, mobile, and thread pages.
- [x] UI iterations documented with final 9/10 rubric score.

## Tests

- [x] Config defaults to demo mode.
- [x] Production demo mode does not require env vars.
- [x] Hypersnap config works without keys and defaults to Cassie’s public node.
- [x] Hypersnap client sends no auth headers and maps feed/user/cast/search endpoints.
- [x] Missing Neynar key is setup-only, not fatal.
- [x] Demo provider covers feed/search/profile/thread.
- [x] Provider factory selects demo or setup-only Neynar correctly.
- [x] Routes render all key pages.
- [x] Security headers are tested.
- [x] HTML escaping and unsafe embed filtering are tested.
- [x] Secret non-leak tests cover pages and diagnostics.
- [x] No generic provider proxy route exists.

## Max-gated later

- [ ] Live Neynar key and production provider selection.
- [ ] Production hosting/deployment credentials.
- [ ] SIWF/auth.
- [ ] Managed signers.
- [ ] App-side casts, likes, follows, DMs, payments, or other external side effects.
- [ ] Database-backed user preferences / saved feeds.
- [ ] Snapchain-backed owned indexing.
