# Farcaster Lite Client

[![verify](https://github.com/baseddesigner/farcaster-client/actions/workflows/verify.yml/badge.svg)](https://github.com/baseddesigner/farcaster-client/actions/workflows/verify.yml)

A no-build, read-only Farcaster client built with Express, EJS, and vanilla CSS/JS.

It is intentionally small: render useful Farcaster feeds, profiles, threads, and search results without shipping a frontend bundle or requiring credentials for local development.

## Status

Early public-preview quality. The app is read-only by design: no casts, likes, follows, auth, signer custody, payments, or wallet flows.

## Features

- Server-rendered HTML with Express + EJS.
- Vanilla CSS/JS; no React, TypeScript, Vite, or frontend build step.
- Deterministic `demo` provider for zero-secret local development.
- Optional no-key `hypersnap` provider for live Farcaster reads through Cassie’s public Hypersnap node.
- Optional server-side Neynar provider for later managed reads.
- Hypersnap-first live data strategy; raw Snapchain is reserved for later owned indexing/search infrastructure.
- Feed Lab for comparing recent, engagement, replies, likes, and recasts ranking modes with per-cast score breakdowns.
- Hypersnap diagnostics for upstream latency, last success/error, active base URL, and response-shape health.
- Explicit app routes only; no generic provider proxy.
- CSP, HSTS, `nosniff`, escaped user content, and provider-key isolation tests.
- Node test suite covering routes, providers, view models, security, pagination, and smoke paths.

## Quick start

Requirements:

- Node.js 22+
- npm

```bash
git clone https://github.com/baseddesigner/farcaster-client.git
cd farcaster-client
npm ci
npm run check
npm start
```

Open <http://127.0.0.1:3039>.

Demo mode is the default and needs no environment variables.

Docker-first local development is also available:

```bash
npm run local:dev:start
npm run local:dev:logs
npm run local:dev:stop
```

See [`docs/development/local-dev.md`](docs/development/local-dev.md) for restart, rebuild, status, port, and provider options.

## Live data without keys

Hypersnap mode uses `https://haatz.quilibrium.com` server-side. No provider key is required.

```bash
FARCASTER_PROVIDER=hypersnap \
NODE_ENV=production \
HOST=127.0.0.1 \
PORT=3039 \
npm start
```

Optional knobs:

```bash
HYPERSNAP_BASE_URL=https://haatz.quilibrium.com
HYPERSNAP_ALLOWED_HOSTS=haatz.quilibrium.com
HYPERSNAP_VIEWER_FID=1325
DEFAULT_FEED=builders
FEED_PRESETS_FILE=config/feed-presets.json
CACHE_TTL_SECONDS=60
PUBLIC_BASE_URL=http://127.0.0.1:3039
TRUST_PROXY=false
```

`HYPERSNAP_BASE_URL` must use `https:` and its hostname must be present in `HYPERSNAP_ALLOWED_HOSTS`.
Set `TRUST_PROXY` only for a known reverse proxy, for example `loopback`, `1`, or an explicit Express trust proxy value.

## Feed presets

Feed lanes are file-configured, not account/database-backed. Defaults live in [`config/feed-presets.json`](config/feed-presets.json) and include `builders`, `agents`, `markets`, `art`, `protocol`, and `trending`.

To experiment locally:

```bash
cp config/feed-presets.json config/feed-presets.local.json
FEED_PRESETS_FILE=config/feed-presets.local.json npm start
```

Each search preset needs `label`, `mode: "search"`, and `query`. `config/feed-presets.local.json` is ignored by Git.

## Neynar mode

Neynar is optional and stays server-side only.

```bash
cp .env.example .env
# set FARCASTER_PROVIDER=neynar
# set NEYNAR_API_KEY=<your key>
npm start
```

Never commit `.env` or provider keys.

## Routes

- `/` default feed
- `/feed/:feedId` configured feed preset
- `/lab` feed ranking lab
- `/u/:username` profile
- `/fid/:fid` profile by FID
- `/cast/:hash` cast/thread
- `/search?q=...&type=casts|users` search
- `/diagnostics` production status page
- `/readyz` JSON readiness endpoint
- `/about` explainer
- `/healthz` health check

## Commands

```bash
npm test
npm run check
npm run smoke
FARCASTER_PROVIDER=hypersnap npm run smoke
npm run dev
npm start
```

`node scripts/mobile-cdp-qa.js` can run responsive QA when the app is on `:3039` and Chromium CDP is on `:9223`.

There is no build command. That is the point.

## Security model

- Provider calls happen server-side.
- API keys must not appear in browser code, rendered HTML, logs, or errors.
- User and cast text is escaped by EJS.
- External links use safe URL checks and `noopener noreferrer`.
- The app intentionally does not expose `/api/neynar/*` or `/api/hypersnap/*` passthrough routes.

If you find a vulnerability, see [SECURITY.md](SECURITY.md).

## Project docs

- [`docs/ROADMAP.md`](docs/ROADMAP.md) — public roadmap for Feed Lab, Provider Platform, and Open Source Readiness.
- [`docs/GOAL-production-ready-farcaster-client.md`](docs/GOAL-production-ready-farcaster-client.md) — implementation target and acceptance gates.
- [`docs/UI-ITERATIONS.md`](docs/UI-ITERATIONS.md) — visual iterations and UI rubric.
- [`docs/PRODUCTION-CHECKLIST.md`](docs/PRODUCTION-CHECKLIST.md) — production readiness gates.
- [`docs/architecture/provider-contract.md`](docs/architecture/provider-contract.md) — provider interface, response shapes, errors, diagnostics, and tests.
- [`docs/research/snapchain-cassie-2026-05-27/`](docs/research/snapchain-cassie-2026-05-27/) — Cassie/Hypersnap/Snapchain research.

## Contributing

Contributions are welcome if they keep the project small, readable, and read-only. Start with [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
