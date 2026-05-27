# GitHub: CassOnMars relevant repos

Accessed: 2026-05-27

Profile: https://github.com/CassOnMars

## 1) CassOnMars/snapchain

- URL: https://github.com/CassOnMars/snapchain
- Fork of canonical Snapchain implementation.
- Language: Rust
- Stars: 0
- Last pushed: 2026-02-16T06:49:37Z
- Description: “The open-source, canonical implementation of Farcaster's Snapchain network.”

Why it matters:

- Most relevant CassOnMars repo.
- This is protocol/infra, not a product client.
- It confirms the raw API surface and node-operation cost.

Relevant repo/docs surfaces:

- HTTP API: port `3381`.
- gRPC API: port `3383`.
- Node requirements in docs/repo family: 16GB RAM, 4 vCPU, public IP, 1.5–2TB storage class.
- Running a node is possible, but not free in any practical production sense.
- Docs point to `shuttle` / hub-monorepo style syncing for Postgres mirroring.

Important endpoints/classes:

- Reads: casts, reactions, links, user data, verifications, storage limits, signers, onchain events, username proofs.
- Events: `/v1/events`, `/v1/eventById`, gRPC `Subscribe`.
- Writes: `/v1/submitMessage`, `/v1/validateMessage`, gRPC `SubmitMessage`.
- Bulk/indexing-style reads exist in gRPC/protobuf for all cast/reaction/link/userdata/verifications by FID.

Implication for us:

- Do not build our main UI directly against raw Snapchain. It will feel like chewing wire.
- Build a raw adapter + hydration/indexing layer.
- If we self-host, use it for canonical ingestion/reliability/search moat, not just because it sounds decentralized.

## 2) CassOnMars/yoink-devcon

- URL: https://github.com/CassOnMars/yoink-devcon
- Fork of `horsefacts/yoink-devcon`.
- Language: TypeScript/Next-style app.
- Stars: 0
- Last pushed: 2024-12-06T02:44:29Z

Why it matters:

- Useful as Farcaster frame/mini-app example, not core client infrastructure.

Reusable pieces:

- `.well-known/farcaster.json` manifest pattern.
- Frame webhook route pattern.
- Transaction route pattern.
- Neynar enrichment for address/profile lookup.

Cautions:

- Some webhook code has signature-verification TODOs in the inspected fork lineage.
- Not an indexer or social client.

## 3) CassOnMars/farcaster-hub

- URL: https://github.com/CassOnMars/farcaster-hub
- Fork of early Farcaster hub code.
- Language: TypeScript
- Stars: 0
- Last pushed: 2022-08-27T03:04:20Z

Why it matters:

- Historical reference for message model/merge semantics.
- Not modern Snapchain production code.

Reusable pieces:

- API ergonomics for casts/reactions/follows/signers/verifications.
- Old conflict-resolution tests as conceptual material.

Caution:

- Do not base modern signing/submission on this repo. Use current Snapchain/protobuf/hub-web surfaces.

## 4) CassOnMars/eth-signature-verifier

- URL: https://github.com/CassOnMars/eth-signature-verifier
- Language: Rust
- Stars: 1
- Last pushed: 2025-05-01 (from subagent metadata)

Why it matters:

- Not Farcaster-specific, but relevant to SIWF/wallet verification, ERC-1271, and ERC-6492 smart-wallet signatures.

Implication for us:

- Keep in mind for auth/backend verification if we ever add SIWF or wallet/account association in Rust.
- Not needed for current read-only client.

## Non-findings

- No CassOnMars-owned production Farcaster client found.
- No CassOnMars-owned reusable public indexer found beyond Snapchain/Hypersnap-related infrastructure.
- Cassie’s most actionable contribution for us is the **Hypersnap public API**, not a repo to fork.
