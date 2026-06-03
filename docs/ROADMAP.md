# Roadmap

OpenCaster should become a reference Farcaster client that is easy for agents to improve and useful for humans to read. The product direction is agent-first in the contribution loop: clear files, narrow contracts, deterministic tests, and explicit acceptance gates. That should produce better human UI/UX, not replace it. Agents should make the repo easier to extend; humans should get faster context, clearer feeds, and less timeline noise.

This roadmap is intentionally file-first. Work should start as docs, config, provider contracts, fixtures, tests, and server-rendered UI before adding accounts, databases, auth, writes, or wallet flows.

## Track 1: Feed Lab

Goal: make feed ranking inspectable instead of magical.

Current foundation:

- `/lab` compares ranking modes for recent, engagement, replies, likes, and recasts.
- Each cast shows a score breakdown.
- Feed presets are file-configured through `config/feed-presets.json`.

Near-term work:

- Add clearer "why ranked here" explanations for each mode.
- Let contributors add ranking fixtures that demonstrate edge cases.
- Add mode-specific empty states and provider-error states.
- Compare preset queries side by side, not just ranking modes inside one feed.
- Document how to add a ranking mode with tests.

Agent-friendly contribution points:

- Add fixtures under tests that describe expected order for a ranking mode.
- Add small pure functions in `src/lib/feed-lab.js`.
- Keep ranking explanations deterministic and testable.

Human UX bar:

- A user should understand why a cast is above another cast without reading source code.
- Ranking controls should stay fast, dense, and useful on mobile.
- Feed Lab should feel like an operator tool, not a novelty page.

Later:

- Add OpenRank when a reliable provider path exists.
- Add graph-aware ranking inputs once the provider layer can expose them safely.
- Add exportable ranking reports for contributors comparing provider behavior.

## Track 2: Provider Platform

Goal: make OpenCaster a clean reference implementation for read-only Farcaster providers, with Hypersnap preferred first.

Current foundation:

- Provider calls stay server-side.
- `demo`, `hypersnap`, and optional `neynar` providers share a documented contract.
- `/diagnostics` and `/readyz` expose provider mode, latency, last success, last error, active base URL, and response-shape health.
- Routes normalize provider payloads through app-owned view models before rendering.

Near-term work:

- Expand provider contract examples for feed, cast, profile, search, and diagnostics payloads.
- Add provider shape fixtures that contributors can copy when adding or debugging providers.
- Improve Hypersnap fallback behavior for slow or malformed upstream responses.
- Add per-route provider diagnostics so contributors can see which method powered a page.
- Document provider limitations plainly in the UI when live data is partial.

Agent-friendly contribution points:

- Keep provider methods explicit; do not add generic provider proxy routes.
- Add failing provider-shape tests before changing normalizers.
- Prefer small adapters and fixtures over broad abstractions.
- Make every provider behavior observable through tests or diagnostics.

Human UX bar:

- A reader should never need to know which provider failed to keep browsing useful pages.
- Setup states should explain what is missing without exposing secrets or internals.
- Live-provider pages should degrade into partial context, not blank pages.

Later:

- Add provider comparison tooling for the same cast/profile/feed across providers.
- Add owned indexing/search only when Hypersnap and public provider paths are not enough.
- Add provider conformance checks that can run in CI against fixtures and optional live endpoints.

## Track 3: Open Source Readiness

Goal: make the repo easy to inspect, easy to change, and safe to publish.

Current foundation:

- Security boundaries are documented and tested.
- Docker-first local development exists.
- Feed presets and provider contracts are file-based.
- The app is no-build, read-only, and small enough for new contributors to understand.

Near-term work:

- Add issue templates for bug reports, provider-shape reports, feed preset proposals, and ranking experiments.
- Add a contributor map that points agents and humans to the right files for common changes.
- Add labels or docs for "good first agent task" and "good first human review task."
- Keep README links, package metadata, and examples aligned with the public repo name.
- Add screenshots or short recordings for `/`, `/lab`, `/cast/:hash`, `/u/:username`, and `/diagnostics`.

Agent-friendly contribution points:

- Every meaningful change should name the files to inspect, the tests to run, and the expected user-visible result.
- Docs should include copy-paste commands and acceptance criteria.
- Tests should prefer deterministic demo fixtures before live-provider checks.
- Roadmap items should be phrased as small, reviewable pull requests.

Human UX bar:

- Public pages should be understandable without reading architecture docs.
- Navigation should help users move from feed to profile to cast context to search without dead ends.
- Accessibility should be treated as product quality: semantic headings, keyboard focus, readable contrast, safe link behavior, and mobile layouts that do not obscure content.

Later:

- Add an accessibility checklist and source-level tests where practical.
- Add visual QA artifacts for critical pages.
- Add a public contributor dashboard once issue volume justifies it.

## Track 4: Reference Client Extraction

Goal: extract the best proven Farcaster-client UX patterns from Nook and Supercast without inheriting their code, licensing ambiguity, or write-surface risk.

Current foundation:

- Nook and Supercast are forked under `clawlinker` and cloned locally for reference.
- Nook research documents frontend/client UX patterns: rich cast cards, display modes, embed handling, custom actions, lists, notifications, profile/channel headers.
- Supercast research documents draft-first scheduling, composer workbench UX, keyboard shortcuts, multi-account/auth lessons, and monetization/product systems.
- Combined extraction plan lives at `docs/research/client-reference-extraction-2026-06-03.md`.

Near-term work:

- Implement Nook-inspired cast text rendering with UTF-8 byte-offset-safe mentions/channels.
- Add a central embed view model and richer static embed cards.
- Add read-only media/frame/grid display modes.
- Add Supercast-inspired keyboard navigation and shortcut help.
- Add Supercast-inspired search parsing for `from:username`.

Later:

- Design a write-safety gate before any posting/scheduling work: auth, managed signers, scoped account access, CSRF, idempotency, audit logs, scheduler locks, retries, and receipts.
- Build draft-first scheduling only after that safety layer is explicit and approved.
- Treat custom actions and scheduled reactions as future power-user features, not early public surface.

## Operating Rules

- Stay read-only until the product has earned a write surface.
- Prefer config and fixtures before accounts and databases.
- Prefer server-rendered, inspectable UI before frontend build complexity.
- Prefer explicit provider methods before generic abstractions.
- Prefer test-backed, agent-readable tasks before broad roadmap promises.
- Build for agent-driven contribution, then hold the human UI to a higher bar because of it.
