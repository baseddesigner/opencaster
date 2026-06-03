# Client reference extraction plan: Nook UI + Supercast scheduling

Date: 2026-06-03

Reference repos:

- Nook: <https://github.com/wojventures/nook> / fork <https://github.com/clawlinker/nook>
- Supercast dump: <https://github.com/felirami/supercast-dump> / fork <https://github.com/clawlinker/supercast-dump>

Related research:

- [`nook-2026-06-03.md`](./nook-2026-06-03.md)
- [`supercast-2026-06-03.md`](./supercast-2026-06-03.md)

## Decision

Use the repos as references, not dependencies. Both are no-license/unclear-license dumps, so Opencaster should extract product and architecture patterns only.

Near-term priority: take Nook's frontend density and Supercast's read-only keyboard/feed/search polish. Defer Supercast-style scheduling until we intentionally cross the write-safety boundary.

## What to take from Nook first

### 1. Cast text renderer

Why: highest visible quality jump and easy to test.

Reference:

- `packages/app/components/farcaster/casts/cast-text.tsx`

Build in Opencaster:

- UTF-8 byte-offset mention/channel renderer.
- Safe HTML escaping.
- URL linkification.
- Hide URLs already displayed as embeds.
- Tests with emoji/multibyte text.

Acceptance:

- Casts with emoji before mentions render correctly.
- Mention/channel links route locally when possible.
- No raw cast text becomes HTML.

### 2. Embed renderer

Reference:

- `packages/app/components/embeds/Embed.tsx`
- `packages/app/components/embeds/EmbedUrl.tsx`
- `packages/app/components/embeds/EmbedImage.tsx`
- `packages/app/components/embeds/EmbedVideo.tsx`
- `packages/app/components/embeds/EmbedCast.tsx`
- `packages/app/components/embeds/frames/EmbedFrame.tsx`

Build in Opencaster:

- Central embed classifier/view model.
- Image/video cards.
- URL preview card when provider supplies metadata.
- Quote-cast card.
- Static frame preview card.

Avoid:

- Executing frame actions.
- Client-heavy media UI.

### 3. Display modes

Reference:

- `packages/app/components/farcaster/casts/cast-display.tsx`
- `packages/app/components/farcaster/casts/cast-display-grid.tsx`
- `packages/app/features/list/list-display-picker.tsx`

Build in Opencaster:

- `mode=casts|media|frames|grid` as route/query state.
- Feed/profile pages can choose display mode.
- Static mode tabs/links; no client router.

### 4. Profile/channel/list headers

Reference:

- `packages/app/features/farcaster/user-profile/user-header.tsx`
- `packages/app/features/farcaster/channel-profile/channel-header.tsx`
- `packages/app/features/list/list-header.tsx`

Build in Opencaster:

- Denser profile card with FID, counts, bio, avatar, local/outbound links.
- Channel header when provider supports channel data.
- Static list/feed preset header.

### 5. Custom cast actions as future extension point

Reference:

- `packages/app/components/farcaster/casts/cast-custom-action.tsx`
- `packages/app/features/settings/action-settings.tsx`
- `packages/app/features/explore/actions-feed.tsx`

Build in Opencaster later:

- Start read-only: configurable outbound action links or local tools.
- Do not execute arbitrary third-party actions until there is a permission/sandbox model.

## What to take from Supercast now

### 1. Keyboard navigation

Reference:

- `supercast/src/components/Feed.tsx`
- `supercast/src/components/navigation/NavigationHotkeys.tsx`
- `supercast/src/components/navigation/HotkeyShortcutWindow.tsx`

Build in Opencaster:

- `j/k`: move selection through visible casts.
- `Enter`: open selected cast.
- `/`: focus search.
- `?`: shortcuts overlay.
- `g h`, `g s`, `g l`: route jumps.

This is safe because it is read-only.

### 2. Search polish

Reference:

- `supercast/src/components/search/SearchBar.tsx`
- `supercast/src/components/search/Search.tsx`

Build in Opencaster:

- Parse `from:username` in search.
- Add type tabs for casts/users/channels when provider supports them.
- Optional progressive suggestions later.

### 3. Feed shell controls

Reference:

- `supercast/src/components/Feed.tsx`
- `supercast/src/components/FeedHeader.tsx`
- `supercast/src/components/lists/ListPicker.tsx`
- `supercast/src/components/WithRecastsToggle.tsx`

Build in Opencaster:

- Feed picker in header.
- Recasts/replies/media/frame toggles as links.
- Clear empty states.

## What to take from Supercast later

### Draft-first scheduling model

Reference:

- `supercast/src/prisma/schema.prisma`
- `supercast/src/app/api/drafts/*`
- `supercast/src/utils/drafts.ts`
- `supercast/vercel.json`

Future Opencaster model:

```txt
Draft
  id
  creatorId
  authorAccountId
  text
  embeds
  channelId
  parentDraftId
  status: DRAFT | SCHEDULED | SENT | ERROR | DELETED
  recurring: NONE | DAILY | WEEKLY | MONTHLY
  firstScheduledAt
  nextScheduledAt
  lastSentAt
  timezone
  castHash
  providerReceipt
```

Rules:

- One central publish function.
- One scheduler worker.
- Idempotency key per draft run.
- Write audit log for every attempt.
- Scheduler locks rows before sending.
- Recurring sends produce separate run receipts.

### Composer workbench

Reference:

- `supercast/src/components/casts/DraftComposeWindow/index.tsx`
- `supercast/src/components/casts/DraftComposeWindow/DraftComposeUnit.tsx`
- `supercast/src/components/casts/DraftComposeWindow/DraftsColumn.tsx`
- `supercast/src/components/casts/DraftComposeWindow/DraftActionButtons.tsx`
- `supercast/src/components/casts/DraftComposeWindow/ScheduleButton.tsx`

Future Opencaster UX:

- Left: drafts.
- Center: active draft/thread editor.
- Right: preview/channel/account context.
- Autosave state.
- Schedule confirmation.
- Account selector only after auth/access model exists.

## Required write-safety gate before scheduling

Do not build scheduling as a hidden write path. It needs:

- SIWF/auth.
- Managed signer strategy; no local signer custody by default.
- Account access model with scopes.
- CSRF protection.
- Per-account rate limits.
- Human confirmation for publishing and scheduling.
- Idempotency keys.
- Audit log and receipts.
- Scheduler lock/retry/failure visibility.
- Tests for duplicate sends, signer failures, expired schedule, bad timezone, and provider timeout.

## Suggested implementation order

### Phase 1: Nook UI extraction, still read-only

1. Rich cast text renderer.
2. Embed renderer.
3. Media/frame/grid modes.
4. Profile/channel/list headers.
5. Custom outbound actions skeleton.

### Phase 2: Supercast read-only UX extraction

1. Keyboard navigation.
2. Shortcut help overlay.
3. Search `from:` parser.
4. Feed picker + recast/reply toggles.

### Phase 3: Write-mode design only

1. Draft/schedule schema design doc.
2. Write-safety architecture doc.
3. Provider signer decision doc.
4. Non-production prototype behind feature flag.

### Phase 4: Scheduling implementation only after approval

1. Draft CRUD.
2. Composer workbench.
3. Schedule confirmation.
4. Scheduler worker.
5. Receipts/audit log.
6. Recurring drafts.

## Bottom line

Use Nook to make Opencaster feel like a polished Farcaster reader.

Use Supercast to design a serious creator/posting layer later.

Do not let scheduling sneak in before auth/signer/audit exists. That's how you build a tweet cannon with a calendar UI. Cute until it bites someone.
