# Farcaster Lite Client

No-build V0 Farcaster browser.

- Express + EJS server-rendered HTML.
- No Next.js, React, TypeScript, Vite, database, auth, or signer flow.
- Neynar is called server-side only.
- V0 is read-only; actions open Farcaster directly.

## Current goal

- [`docs/GOAL-production-ready-farcaster-client.md`](docs/GOAL-production-ready-farcaster-client.md) — production-ready client target: no-Max demo mode, plug-in provider seams, visual iteration loop, and 9/10 UI gate.

## Setup

```bash
cd /root/.hermes/hermes-agent/farcaster-lite-client
cp .env.example .env
# optional later: edit .env and set NEYNAR_API_KEY for live data
npm install
npm run check
npm run dev
```

Open: http://127.0.0.1:3039

## Routes

- `/` default feed
- `/feed/:feedId` configured feed preset
- `/u/:username` profile
- `/fid/:fid` profile by FID
- `/cast/:hash` cast/thread
- `/search?q=...&type=casts|users` search
- `/about` explainer
- `/healthz` health check

## Commands

```bash
npm test
npm run check
npm run dev
npm start
```

There is no build command. That is the point.

## V0 boundaries

No app-side casts, likes, follows, auth, signer storage, Snapchain node, or Mini App hosting. Add those only after the read-only feed/search/profile experience proves useful.
