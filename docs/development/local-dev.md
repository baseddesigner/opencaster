# Local Development

OpenCaster supports Docker-first local development for contributors who want a reproducible runtime without installing project dependencies on the host.

The container publishes the app to `127.0.0.1` only. The app listens on `0.0.0.0` inside the container so Docker can publish it, but the host binding stays loopback-only.

## Commands

```bash
npm run local:dev:start
npm run local:dev:status
npm run local:dev:logs
npm run local:dev:restart
npm run local:dev:rebuild
npm run local:dev:stop
```

Open <http://127.0.0.1:3039> after `local:dev:start`.

## Port And Provider

The default host port is `3039`. Use `OPENCASTER_PORT` if another local process already owns that port:

```bash
OPENCASTER_PORT=3040 npm run local:dev:start
```

Demo mode is the default and needs no credentials. To use Hypersnap live reads:

```bash
FARCASTER_PROVIDER=hypersnap npm run local:dev:start
```

`HYPERSNAP_BASE_URL` must use `https:` and its hostname must be present in `HYPERSNAP_ALLOWED_HOSTS`.

Feed presets load from `config/feed-presets.json` by default. To run Docker local dev with custom search lanes:

```bash
cp config/feed-presets.json config/feed-presets.local.json
FEED_PRESETS_FILE=config/feed-presets.local.json npm run local:dev:start
```

The local preset file is ignored by Git.

## Process Hygiene

`local:dev:start` first stops the project-local Compose stack with `docker compose down --remove-orphans`. It then refuses to start if the selected host port is still occupied. This avoids leaving duplicate dev servers fighting for the same port.

Use `npm run local:dev:stop` when you are done.
