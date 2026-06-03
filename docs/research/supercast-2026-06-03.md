# Supercast research: scheduling, composer, and product systems

Source inspected: <https://github.com/felirami/supercast-dump>

Fork: <https://github.com/clawlinker/supercast-dump>

Inspection date: 2026-06-03

Inspected revision: `a7b0aa1`

Our client: Opencaster, currently no-build and read-only.

## TL;DR

Supercast is the best reference here for future posting workflow: draft-first composing, scheduled posts, recurring drafts, multi-account posting, scheduled reactions on unpublished drafts, keyboard-first power-user UX, and monetization around creator tooling.

Do **not** copy source directly. The dump has no explicit license, no commit history, missing script files, and its README says it is no longer functional/developed and should not be used as a 1:1 fork. Treat it as a product/architecture specimen.

Best things to adapt conceptually:

1. Draft-first scheduling model.
2. Composer workbench with drafts sidebar, editor, preview/context column.
3. Two-step scheduling: choose time, then confirm schedule.
4. Deterministic idempotency keys for scheduled sends.
5. Recurring draft model with `nextScheduledAt` and `lastSentAt`.
6. Keyboard navigation and shortcut overlay.
7. Multi-account access model as a cautionary map: useful idea, but needs tighter scopes.

## Repo status and licensing

Verified facts:

- Public repo: `felirami/supercast-dump`
- Forked locally under: `clawlinker/supercast-dump`
- Last pushed: 2025-07-31
- No `LICENSE*` file found.
- No root `package.json`; two app folders: `supercast` and `super-auth`.
- README says this is a dump of all code, no commit history, no longer functional/developed, redundant/ugly in places, and not recommended as a 1:1 fork.

Implication: keep it as a reference repo and extract product patterns only.

## Architecture at a glance

```txt
supercast-dump/
  supercast/   main Next.js app
  super-auth/  separate copied auth/account-linking service
```

`supercast` includes:

- Next 13 App Router under `src/app`
- API routes under `src/app/api`
- Prisma schema/migrations under `src/prisma`
- UI under `src/components`
- providers/state under `src/providers`
- write/auth utilities under `src/utils`
- PWA worker under `worker/index.js`
- Vercel cron config in `vercel.json`

The product is write-heavy: posting, deletion, reactions, profile updates, scheduled drafts, payments, notifications, account sharing, and storage purchases.

## Scheduling: what to copy conceptually

### 1. Prefer the newer draft-first model

Reference files:

- `supercast/src/prisma/schema.prisma`
- `supercast/src/app/api/drafts/route.ts`
- `supercast/src/app/api/drafts/[id]/route.ts`
- `supercast/src/app/api/drafts/[id]/send/route.ts`
- `supercast/src/app/api/drafts/[id]/schedule/route.ts`
- `supercast/src/app/api/drafts/[id]/unschedule/route.ts`
- `supercast/src/utils/drafts.ts`

Supercast has both older scheduled-cast tables and a newer draft model. If Opencaster ever adds writes, choose one clean model: **draft-first**.

Useful draft fields from the schema:

- `text`
- `embeds`
- `channelId`
- `parentId` / `parentDraft` / `replyDraft`
- `isTopLevel`
- `authorId`
- `creatorId`
- `sendStatus`
- `recurring`
- `firstScheduledAt`
- `nextScheduledAt`
- `lastSentAt`
- `castHash`

Useful statuses:

- `DRAFT`
- `SCHEDULED`
- `SENT`
- `ERROR`
- `DELETED`

Useful recurring modes:

- `NONE`
- `DAILY`
- `WEEKLY`
- `MONTHLY`

Opencaster adaptation:

- Start with a durable draft entity before a scheduler.
- One-off scheduled draft: `sendStatus=SCHEDULED`, `nextScheduledAt=<time>`, becomes `SENT` after success.
- Recurring draft: stays `SCHEDULED`, advances `nextScheduledAt`, sets `lastSentAt`, stores the new `castHash` or send receipt separately.
- Store schedule timezone explicitly; Supercast does not make timezone handling obvious enough.

### 2. Two-step scheduling UX

Reference files:

- `supercast/src/components/casts/DraftComposeWindow/ScheduleButton.tsx`
- `supercast/src/components/casts/DraftComposeWindow/DraftActionButtons.tsx`
- `supercast/src/components/casts/ScheduleDatePicker.tsx`

Supercast separates picking a time from confirming the schedule. That is right.

Opencaster adaptation:

- Choosing a time should update local draft state only.
- Final CTA should clearly change from `Post` to `Schedule`.
- Confirmation should show account, channel, time/timezone, recurrence, and preview.
- Server validates all of it again.

### 3. Central publish function

Reference file:

- `supercast/src/utils/drafts.ts`

Supercast routes and cron share a central draft send function. This is the right shape even if the implementation has rough edges.

Opencaster adaptation:

```txt
publishDraft(draftId, actor)
  -> load draft scoped by actor/account
  -> validate signer/capability/status/schedule
  -> generate idempotency key
  -> send via provider
  -> persist receipt/cast hash/status in one transaction
  -> emit audit event
```

Do not duplicate publish logic between `post now` and `scheduled worker`.

### 4. Idempotency keys

Reference file:

- `supercast/src/utils/drafts.ts`

Supercast passes `idem` to Neynar based on draft ID and scheduled time. Good idea, but make it stricter.

Opencaster adaptation:

- One-off send: `draft:<draftId>:once`
- Scheduled send: `draft:<draftId>:scheduled:<nextScheduledAtISO>`
- Recurring send: `draft:<draftId>:run:<nextScheduledAtISO>`
- Persist the idempotency key and provider response receipt.

### 5. Scheduled reactions / shared draft preview

Reference files:

- `supercast/src/prisma/schema.prisma`
- `supercast/src/app/drafts/[id]/page.tsx`
- `supercast/src/app/api/drafts/[id]/preview/route.ts`
- `supercast/src/app/api/drafts/[id]/schedule-like/route.ts`
- `supercast/src/app/api/drafts/[id]/schedule-recast/route.ts`
- `supercast/src/app/api/drafts/[id]/schedule-reply/route.ts`
- `supercast/src/components/drafts/DraftPreview.tsx`
- `supercast/src/components/drafts/DraftPreviewReactionBar.tsx`
- `supercast/src/components/drafts/DraftPreviewReplyTextArea.tsx`

This is the spiciest product idea: share an unpublished draft, let collaborators queue likes/recasts/replies, then fire those after publish.

Opencaster adaptation:

- Treat as later/team feature, not v1.
- If built, add strict opt-in, audit logs, uniqueness constraints, per-account caps, and clear “will publish/recast/reply” confirmations.

## Scheduling: what to avoid

### Do not keep two scheduling systems

Reference files:

- Older tables: `ScheduledCast`, `ScheduledThread`
- Newer table: `Draft`

Supercast carries both. Opencaster should not.

### Do not return before persistence is complete

Reference file:

- `supercast/src/app/api/cast/schedule-thread/route.ts`

The code uses async `map` without awaiting scheduled cast creation. For us: use transactions or `Promise.all`, then return.

### Do not use missing/invisible workers

Reference files:

- `supercast/vercel.json`
- `supercast/src/app/api/cast/send-scheduled-drafts/route.ts`

The route imports `@/scripts/sendScheduledDrafts`, but `src/scripts` is absent in the dump. For us: scheduler code must be in-repo, tested, and observable.

### Do not trust client dates

Opencaster write routes should validate:

- future time
- timezone
- minimum lead time
- account permissions
- signer state
- text length
- embed limits
- channel validity
- recurrence bounds

### Do not write without a safety/audit layer

Any posting/scheduling work should wait for a separate write-safety architecture covering auth, signers, CSRF, idempotency, retries, audit logs, and user confirmation.

## Composer/workbench UX to steal conceptually

Reference files:

- `supercast/src/components/casts/DraftComposeWindow/index.tsx`
- `supercast/src/components/casts/DraftComposeWindow/DraftComposeUnit.tsx`
- `supercast/src/components/casts/DraftComposeWindow/DraftsColumn.tsx`
- `supercast/src/components/casts/DraftComposeWindow/DraftActionButtons.tsx`
- `supercast/src/components/casts/DraftComposeWindow/ScheduleButton.tsx`
- `supercast/src/components/casts/ChannelPickerButton.tsx`
- `supercast/src/components/casts/MentionAutocomplete.tsx`
- `supercast/src/components/casts/EmojiPickerButton.tsx`
- `supercast/src/components/casts/GIPHYButton.tsx`
- `supercast/src/components/casts/PollButton.tsx`

Reusable ideas:

- Composer as a workbench, not a tiny textarea.
- Left column: saved drafts.
- Main column: active draft / thread editor.
- Right column: channel/profile/preview context.
- Autosave indicator.
- Thread units as connected draft nodes.
- Channel picker with disabled state once sent/scheduled.
- Mention autocomplete.
- Attachment controls disabled when draft is already scheduled/sent.

Opencaster adaptation:

- This is future write-mode UI, likely not no-build V0.
- A small server-rendered v1 could be a drafts list + edit page + preview + schedule form.
- If we later add a frontend bundle, this composer is the best Supercast reference.

## Keyboard-first UX to steal now

Reference files:

- `supercast/src/components/Feed.tsx`
- `supercast/src/components/navigation/NavigationHotkeys.tsx`
- `supercast/src/components/navigation/HotkeyShortcutWindow.tsx`

Supercast has power-user shortcuts:

- `j/k` move through feed
- `Enter` open selected cast
- route jumps like `g+h`, `g+n`
- composer shortcuts
- shortcut help window

Opencaster adaptation for read-only now:

- Add `j/k` feed selection.
- Add `Enter` open selected cast.
- Add `/` focus search.
- Add `?` help overlay.
- Add `g h`, `g s`, `g l` route jumps.

This is high impact and does not require write/auth.

## Search/feed shell UX to steal now

Reference files:

- `supercast/src/components/search/SearchBar.tsx`
- `supercast/src/components/search/Search.tsx`
- `supercast/src/components/Feed.tsx`
- `supercast/src/components/FeedHeader.tsx`
- `supercast/src/components/lists/ListPicker.tsx`
- `supercast/src/components/WithRecastsToggle.tsx`

Useful ideas:

- Search with suggestions and `from:username` parsing.
- List/feed picker in the feed header.
- Toggle recasts on/off.
- Pull-to-refresh and loading skeletons.
- Empty states that explain what happened.

Opencaster adaptation:

- Add server-rendered `from:` query parsing first.
- Add feed picker and simple toggles as links/forms.
- Use skeletons only if progressive enhancement warrants it.

## Multi-account/auth lessons

Reference files:

- `supercast/src/utils/auth/isAuthenticated.ts`
- `supercast/src/utils/auth/isAuthorized.ts`
- `supercast/src/providers/SupercastUserStateProvider.tsx`
- `supercast/src/app/api/account/create-connection/route.ts`
- `supercast/src/app/api/account/delegate-access/route.ts`
- `supercast/src/app/api/account/create-signer/route.ts`
- `supercast/src/app/api/account/signer-approval/route.ts`
- `supercast/src/utils/signer.ts`
- `supercast/src/prisma/schema.prisma`

Useful product idea:

- One human account can operate multiple Farcaster accounts.
- Accounts can be delegated/shared.
- Posting UI has an `asFid` concept.

Opencaster adaptation:

- Use explicit scoped account access, not broad all-or-nothing sharing.
- Server derives the acting account from validated access; never trust `asFid` alone.
- Bind signer approval to authenticated user, intended FID, nonce, session, and expiry.
- Scopes should look like: `read`, `draft`, `publish`, `delete`, `profile_update`, `delegate_admin`.

## Monetization lessons

Reference files:

- `supercast/src/providers/PaywallProvider.tsx`
- `supercast/src/utils/checkout.ts`
- `supercast/src/app/api/payment-session/route.ts`
- `supercast/src/app/api/stripe/*`
- `supercast/src/app/api/crypto-checkout/*`
- `supercast/src/prisma/schema.prisma`

Supercast monetized creator tooling:

- membership plan
- registration/product payments
- storage purchases
- Stripe and Daimo paths

Opencaster product gates later:

- multi-account management
- scheduled publishing
- team/shared accounts
- analytics retention
- advanced search/list workflows

Avoid:

- multiple overlapping billing systems
- non-deterministic idempotency keys
- webhooks that do not verify amount/product/currency
- month math based only on 31-day approximations

## Safety gotchas observed

These are not dunking; this is exactly why dumps are useful. We can learn without inheriting scars.

- No explicit license.
- Missing scheduling worker scripts in the dump.
- Two scheduling systems coexist.
- Some routes can return before async persistence finishes.
- Some update paths appear weakly scoped by ownership.
- Missing/malformed Authorization can crash auth parsing.
- Some URL preview/upload surfaces look risky without stricter auth/SSRF protection.
- Analytics/logging touches sensitive product/payment/write events.

## Recommended Opencaster extraction order

### Safe now: read-only UX

1. Keyboard navigation and shortcut help.
2. Search `from:` parsing and better feed picker UX.
3. Feed shell polish: list picker, recast toggle, clearer empty states.

### Next after Nook UI work

1. Static media/frame display modes.
2. Rich embed cards.
3. Profile/channel/list headers.
4. Local-only bookmarks/saved views.

### Later write-mode architecture

1. Draft data model and write-safety design doc.
2. Composer workbench prototype behind a feature flag.
3. Managed signer/auth proof, no custody.
4. Scheduler worker with idempotency, locks, receipts, retries, and audit logs.
5. Recurring drafts.
6. Shared draft previews and scheduled reactions only after all of the above.

## Bottom line

Nook is our best frontend/client-UX reference. Supercast is our best creator workflow and scheduling reference.

Nook tells us how a Farcaster reader should *feel*.

Supercast tells us what a serious Farcaster posting tool must *remember, schedule, guard, and monetize*.

Opencaster should take Nook's frontend density first, then Supercast's draft/scheduling model only after we build a real write-safety layer.
