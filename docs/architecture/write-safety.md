# Write-Safety Architecture

Opencaster stays read-only until these gates exist. This doc is the design seam for future casts, replies, likes, follows, drafts, and scheduling; it is not permission to ship writes.

## Non-negotiable boundary

Current product behavior:

- local pages render feeds, profiles, casts, search, channels, embeds, and diagnostics;
- write-intent links open Farcaster externally;
- no app-side cast, like, follow, DM, signer custody, scheduler write, payment, swap, frame action, or custom action execution exists.

Future write work must land behind an explicit feature flag and a separate review.

## Required gates before any write route

1. **Auth / identity**
   - SIWF or equivalent account binding.
   - Viewer FID must be explicit in server context.
   - Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax` or stricter.

2. **Managed signers only at first**
   - Use provider-managed signers.
   - Never store signer private keys in browser state.
   - Never accept arbitrary signer material over a public form.

3. **Human confirmation**
   - Every outbound cast/reply/quote/follow/like shows a final confirmation page.
   - Confirmation includes account, action type, text/media/link targets, and destination.
   - No background write from search/feed/thread pages.

4. **CSRF + method discipline**
   - Writes are `POST` only.
   - CSRF token required per form/action.
   - Reject JSON/form bodies above strict size limits.

5. **Idempotency**
   - Every write request carries an idempotency key.
   - Server stores key, actor, action type, normalized payload hash, status, provider response, and timestamps.
   - Duplicate key + same payload returns the existing receipt.
   - Duplicate key + different payload is rejected.

6. **Audit log / receipts**
   - Append-only audit row for every attempted write.
   - Receipt page after provider response: pending/success/failed, provider request id/hash, timestamp, actor, payload summary.
   - Errors are shown without leaking tokens or provider internals.

7. **Rate limits and abuse controls**
   - Per-session and per-FID write ceilings.
   - Stronger limits for replies/likes/follows than reads.
   - Server-side cooldowns independent of browser state.

8. **Scheduler locks before scheduling**
   - Draft-first model: `draft -> scheduled -> sending -> sent|failed|cancelled`.
   - One scheduler owner lock per draft id.
   - Retry with bounded attempts and backoff.
   - Never send a scheduled write without a prior human-confirmed draft receipt.

9. **Media and embed safety**
   - Allowlisted upload sources.
   - Safe URL validation before embed fetch/render.
   - No frame/custom action execution from Opencaster write flows.

10. **Operational kill switch**
   - Global env flag disables all write routes.
   - Provider signer revoke path documented.
   - Admin-visible recent write attempts and failures.

## Minimal data model

```txt
accounts(fid, username, auth_provider, created_at, last_seen_at)
signers(fid, provider, signer_id, status, created_at, revoked_at)
drafts(id, fid, type, text, embeds_json, reply_to_hash, status, created_at, updated_at)
write_requests(idempotency_key, fid, draft_id, action, payload_hash, status, provider_ref, error_code, created_at, updated_at)
audit_events(id, fid, action, draft_id, request_key, status, summary_json, created_at)
schedule_jobs(id, draft_id, fid, scheduled_for, status, locked_by, locked_until, attempts, last_error, created_at, updated_at)
```

## Route shape

```txt
GET  /compose                 render local draft form; no send
POST /drafts                  create/update draft; no send
GET  /drafts/:id/confirm      final human review
POST /drafts/:id/send         CSRF + idempotency + managed signer + receipt
POST /drafts/:id/schedule     CSRF + idempotency + future time + receipt
POST /drafts/:id/cancel       cancel unsent draft/job
GET  /receipts/:requestKey    immutable write receipt
```

## Acceptance gate for first write PR

- tests prove CSRF rejection, idempotency replay, duplicate-payload rejection, rate limits, audit rows, receipt rendering, and global kill switch;
- no write route exists without auth middleware;
- no private key path exists;
- local demo mode still has zero app-side writes;
- manual smoke proves a disabled write flag blocks every write endpoint.
