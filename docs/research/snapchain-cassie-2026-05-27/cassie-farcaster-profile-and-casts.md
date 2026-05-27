# Cassie Farcaster profile + relevant casts

Accessed: 2026-05-27

## Identity

- Farcaster handle: `@cassie`
- FID: `1325`
- Display name: `Cassie Heart`
- Public profile URL: https://farcaster.xyz/cassie
- Public user endpoint checked: `https://client.farcaster.xyz/v2/user-by-username?username=cassie`
- Confidence: high. `cassonmars` did not resolve as the Farcaster fname in the public checks; GitHub is `CassOnMars`, Farcaster appears to be `cassie`.

## Relevant casts

### 1) Free Farcaster APIs / Hypersnap docs

- Cast: https://farcaster.xyz/cassie/0x9cd0d961
- Hash: `0x9cd0d9611a2af8a237d8805b17dc08cc34eeca2e`
- Timestamp: 2026-04-11T11:37:19Z
- Quoted excerpt: “Farhack and Saturday snap event builders: here's a simple guide for free farcaster APIs to build your snaps, miniapps, clients, and agents with.”
- Link: https://hypersnap-docs.qstorage.quilibrium.com/
- Why it matters: This is the likely remembered link. The docs describe the Hypersnap Farcaster API and a public node.

### 2) Direct no-key Neynar-shaped API

- Cast: https://farcaster.xyz/cassie/0x0bc38a09
- Hash: `0x0bc38a09aadbc32e322e95530c5f39e21e4bb681`
- Timestamp: 2026-04-08T03:18:52Z
- Quoted excerpt: “btw you can get neynar's api for free: https://haatz.quilibrium.com/v2/farcaster/feed?fid=1325 supports all endpoints, including feed generation, call without an api key.”
- Link: https://haatz.quilibrium.com/v2/farcaster/feed?fid=1325
- Verification: `https://haatz.quilibrium.com/v2/farcaster/feed?fid=1325&limit=1` returned public JSON without auth.
- Why it matters: This gives us a practical no-key provider path for feed/user/cast/search-shaped reads.

### 3) Hypersnap GraphQL query layer / light-client direction

- Cast: https://farcaster.xyz/cassie/0xd0f74a51
- Hash: `0xd0f74a5102242e97a8f5aad34ac414bd16239925`
- Timestamp: 2026-02-22T09:46:39Z
- Quoted excerpt: “FIP: GraphQL Query Layer… Adds a GraphQL query endpoint to Hypersnap nodes, enabling light clients to fetch exactly the data they need in a single round-trip without running a backend…”
- Link: https://github.com/orgs/farcasterorg/discussions/16
- Why it matters: Directionally important: the Farcaster/Snapchain ecosystem is aware raw protocol APIs are awkward for clients. GraphQL would reduce our need for custom aggregation endpoints if/when it lands.

### 4) Snapchain node ops / docker compose issue

- Cast: https://farcaster.xyz/cassie/0x44a0cff2
- Hash: `0x44a0cff25417dcddc330c5a7981ec139f7c7a8a7`
- Timestamp: 2026-01-30T07:36:47Z
- Quoted excerpt: “If you're running a snapchain node and you're seeing signature issues, make sure you update your docker-config...”
- Embedded raw config URL: `https://raw.githubusercontent.com/farcasterxyz/snapchain/5242bc026727442174b656a2e47e92f5e61f1941/docker-compose.mainnet.yml`
- Why it matters: Running a node is real ops work. Snapchain is not “drop in API key and done.”

### 5) Farcaster hubs → Snapchain transition thread

- Cast: https://farcaster.xyz/cassie/0x5942ebcb
- Hash: `0x5942ebcbbdff3a580b5b3b8e0f16f3d4bacb9c48`
- Timestamp: 2024-10-01T23:40:14Z
- Quoted excerpt: “Do you have questions about the changes coming to Farcaster hubs? This thread might have some answers.”
- Linked thread: https://warpcast.com/androidsixteen.eth/0x1ffba497
- Linked public doc: https://warpcast.notion.site/Snapchain-Public-0e6b7e51faf74be1846803cb74493886
- Why it matters: Background on why hubs were changing: sync complexity and eventual-consistency pain.

## Profile read

Cassie’s recent relevant posting pattern is not “client UI tips”; it is infra/protocol access:

- make Farcaster data cheaper/easier to query;
- expose Hypersnap as a public no-key API surface;
- push toward light-client-friendly APIs;
- treat node operation as possible but nontrivial;
- keep the developer path open enough that builders can ship without managed-provider tax immediately.

Product implication: use Cassie’s Hypersnap work as an adapter/fallback/experimentation path, not as the whole product strategy. Build provider seams and cache hardening around it.
