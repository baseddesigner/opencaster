# Farcaster Lite Client

Production-shaped, no-build Farcaster client.

- Express + EJS server-rendered HTML.
- Vanilla CSS/JS, no frontend build step.
- Defaults to deterministic `demo` provider; no env vars needed.
- Optional Neynar provider stays server-side only.
- Read-only by design; actions open Farcaster directly.

## Source docs

- [`docs/GOAL-production-ready-farcaster-client.md`](docs/GOAL-production-ready-farcaster-client.md) — implementation target and acceptance gates.
- [`docs/UI-ITERATIONS.md`](docs/UI-ITERATIONS.md) — visual iterations and 9/10 UI rubric.
- [`docs/PRODUCTION-CHECKLIST.md`](docs/PRODUCTION-CHECKLIST.md) — production readiness gates and Max-gated items.

## Setup

```bash
cd /root/.hermes/hermes-agent/farcaster-lite-client
npm install
npm run check
FARCASTER_PROVIDER=demo NODE_ENV=production HOST=127.0.0.1 PORT=3039 npm start
```

Open: http://127.0.0.1:3039

Live data later:

```bash
cp .env.example .env
# set FARCASTER_PROVIDER=neynar and NEYNAR_API_KEY=<your key>
npm start
```

## Routes

- `/` default feed
- `/feed/:feedId` configured feed preset
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
npm run dev
npm start
```

There is no build command. That is still the point.

## Boundaries

No app-side casts, likes, follows, auth, signer storage, payments, Snapchain node, or Mini App hosting. The app has clean provider seams so those can be plugged in later after explicit approval.
