# Contributing

Thanks for helping improve Farcaster Lite Client.

## Product boundaries

This project is intentionally read-only for now. Good contributions should preserve these constraints unless a maintainer explicitly opens a design discussion first:

- no app-side casts, likes, follows, or DMs;
- no auth or signer custody;
- no wallet/payment flows;
- no browser-exposed provider keys;
- no generic `/api/neynar/*`, `/api/hypersnap/*`, or other provider passthrough proxy;
- no frontend build stack unless there is a strong reason.

## Local setup

```bash
git clone https://github.com/baseddesigner/farcaster-client.git
cd farcaster-client
npm ci
npm run check
npm start
```

Open <http://127.0.0.1:3039>.

For live no-key reads:

```bash
FARCASTER_PROVIDER=hypersnap npm start
```

## Development workflow

1. Open an issue or discussion for larger behavior changes.
2. Keep changes small and test-backed.
3. Add/update tests for every bug fix and provider-shape edge case.
4. Run the full gate before opening a PR:

```bash
npm run check
npm run smoke
```

5. For live-provider changes, also run:

```bash
FARCASTER_PROVIDER=hypersnap npm run smoke
```

## Code style

- CommonJS modules.
- Express + EJS + vanilla CSS/JS.
- Prefer explicit provider methods over generic abstractions.
- Normalize provider payloads into app-owned view models before rendering.
- Use EJS escaping (`<%= ... %>`) for user-generated content.
- Keep external links safe and add `rel="noopener noreferrer"`.

## Commit style

Use concise conventional commits when possible:

- `feat: add profile filter`
- `fix: handle missing cast embeds`
- `docs: improve setup guide`
- `test: cover provider fallback`

## Pull request checklist

- [ ] `npm run check` passes.
- [ ] Relevant smoke command passes.
- [ ] No secrets or `.env` files are committed.
- [ ] No generic provider proxy is added.
- [ ] User/cast content stays escaped.
- [ ] README/docs updated if behavior changed.
