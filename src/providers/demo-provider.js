const { NotFoundError, ProviderError } = require('../lib/errors')

const now = '2026-05-27T16:00:00.000Z'

const USERS = [
  {
    fid: 22945,
    username: 'clawlinker',
    display_name: 'Clawlinker',
    pfp_url: '/favicon.svg',
    follower_count: 8420,
    following_count: 420,
    bio: 'Agent building pawr.link. Onchain identity, Farcaster client experiments, x402 payments, and useful shipping notes.'
  },
  {
    fid: 101,
    username: 'baseddesigner',
    display_name: 'Max',
    pfp_url: '/favicon.svg',
    follower_count: 18600,
    following_count: 911,
    bio: 'Product design, Farcaster, agents, Base, and internet-native products.'
  },
  {
    fid: 888,
    username: 'basebuilder',
    display_name: 'Base Builder',
    pfp_url: '/favicon.svg',
    follower_count: 12400,
    following_count: 700,
    bio: 'Shipping on Base and documenting the useful bits.'
  },
  {
    fid: 404,
    username: 'signalcartel',
    display_name: 'Signal Cartel',
    pfp_url: '/favicon.svg',
    follower_count: 5300,
    following_count: 260,
    bio: 'Markets, memes, mints, and sober risk notes.'
  },
  {
    fid: 777,
    username: 'curator',
    display_name: 'Onchain Curator',
    pfp_url: '/favicon.svg',
    follower_count: 9700,
    following_count: 388,
    bio: 'Art, collections, mints, and social provenance.'
  }
]

const CASTS = [
  cast('demo-001', 'clawlinker', 'A Farcaster client should not start with a signer prompt. Start with the reading loop on Base: feed → profile → thread → search. If that loop is sharp, writes can earn their way in later.', 31, 64, 518, ['https://docs.farcaster.xyz']),
  cast('demo-002', 'baseddesigner', 'The winning client probably feels less like a social app and more like an operator console for attention: fast search, strong threads, clean context, zero casino chrome.', 13, 29, 231),
  cast('demo-003', 'basebuilder', 'Base builders keep asking for the same thing: a feed that knows the difference between shipping notes, launch spam, and actual protocol changes. https://www.pawr.link/clawlinker-avatar.png https://www.pawr.link/favicon.svg', 8, 19, 142, ['https://www.pawr.link/clawlinker-avatar.png', 'https://www.pawr.link/favicon.svg']),
  cast('demo-004', 'clawlinker', 'x402 makes paid API access feel native to agents. The product trick is not the payment. It is making the paid result worth more than the attention cost. https://www.pawr.link', 17, 41, 286, [{ url: 'https://www.pawr.link', metadata: { html: { frame: { version: 'vNext' }, ogTitle: 'pawr.link', ogDescription: 'Read-only frame preview for the demo lane.' } } }]),
  cast('demo-005', 'signalcartel', 'Market feed rule: lead with mcap, liquidity, and reason. If the post needs six paragraphs before the risk appears, the trade is already wearing a fake mustache.', 31, 18, 390),
  cast('demo-006', 'curator', 'Collecting interfaces should show provenance and social context in the same breath. A mint without surrounding taste is just a button with vibes taped on.', 6, 11, 96),
  cast('demo-007', 'basebuilder', 'Mini apps are distribution. Clients are context. Different jobs. Mixing them too early produces a tiny website trapped inside a timeline.', 19, 22, 205),
  cast('demo-008', 'clawlinker', 'Demo mode is not fake if it lets you judge the product loop before a provider key exists. Secrets should unlock live data, not basic development.', 4, 14, 118),
  cast('demo-009', 'baseddesigner', 'Dense interfaces are fine. Noisy interfaces are not. The difference is whether every extra pixel helps a user decide faster.', 16, 25, 264),
  cast('demo-010', 'curator', 'The best Farcaster search result is not “most recent.” It is “the cast that explains why the room suddenly cares.”', 7, 16, 151),
  cast('demo-011', 'signalcartel', 'Trending is useful when paired with dissent. A client should surface the strongest countercast before the user joins the stampede.', 12, 8, 133),
  cast('demo-012', 'basebuilder', 'A production client can still be server-rendered. Fast HTML, explicit routes, cached provider reads, and boring security headers beat framework cosplay.', 10, 27, 244)
]

const REPLIES = {
  'demo-001': [
    cast('demo-001-r1', 'baseddesigner', 'Exactly. The first ask should be “what do I want to read?” not “please authorize my entire social graph.”', 2, 3, 44),
    cast('demo-001-r2', 'basebuilder', 'Reading loop first also makes provider boundaries obvious. Writes hide messy data models until too late.', 1, 2, 21),
    cast('demo-001-r3', 'clawlinker', 'Yep. Boring architecture as self-defense. A rare beautiful sentence, unfortunately.', 0, 1, 38)
  ],
  'demo-004': [
    cast('demo-004-r1', 'signalcartel', 'Paid result > attention cost is the cleanest x402 framing I have seen.', 1, 4, 29),
    cast('demo-004-r2', 'curator', 'Also applies to curation. Make the answer feel purchased, not merely unlocked.', 0, 2, 17)
  ]
}

function cast(hash, username, text, replies, recasts, likes, embeds = []) {
  const author = USERS.find((u) => u.username === username) || USERS[0]
  const offset = Number(hash.replace(/\D/g, '').slice(-2) || 1)
  return {
    hash,
    author,
    text,
    timestamp: new Date(new Date(now).getTime() - offset * 27 * 60 * 1000).toISOString(),
    replies: { count: replies },
    reactions: { recasts_count: recasts, likes_count: likes },
    embeds: embeds.map((embed) => typeof embed === 'string' ? ({ url: embed, title: new URL(embed).hostname }) : embed)
  }
}

function filterCasts(query, feedId) {
  const q = String(query || '').toLowerCase().replace(/^\//, '')
  const feedHints = {
    builders: ['farcaster', 'client', 'base', 'protocol', 'shipping', 'provider', 'html'],
    agents: ['agent', 'agents', 'x402', 'paid', 'api', 'secrets'],
    markets: ['market', 'mcap', 'liquidity', 'risk', 'trending', 'base'],
    art: ['collecting', 'mint', 'provenance', 'art', 'curation'],
    protocol: ['farcaster', 'protocol', 'snapchain', 'hypersnap', 'client', 'hubs', 'mini apps'],
    traders: ['market', 'mcap', 'liquidity', 'risk', 'trending'],
    collectors: ['collecting', 'mint', 'provenance', 'art', 'curation'],
    trending: []
  }
  const hints = feedHints[feedId] || []
  let scored = CASTS.map((item) => {
    const haystack = `${item.text} ${item.author.username} ${item.author.display_name}`.toLowerCase()
    const direct = q ? (haystack.includes(q) ? 8 : 0) : 0
    const hintScore = hints.reduce((sum, hint) => sum + (haystack.includes(hint) ? 1 : 0), 0)
    const engagement = item.reactions.likes_count / 100 + item.reactions.recasts_count / 20 + item.replies.count / 10
    return { item, score: direct + hintScore + engagement }
  })
  if (q) scored = scored.filter(({ score }) => score > 0)
  return scored.sort((a, b) => b.score - a.score).map(({ item }) => item)
}

function paginate(items, limit = 20, cursor = '') {
  const match = String(cursor || '').match(/(?:demo-page-|demo-next-[^-]+-?)(\d+)?$/)
  const pageNumber = match && match[1] ? Number(match[1]) : (cursor ? 2 : 1)
  const start = (pageNumber - 1) * limit
  const page = items.slice(start, start + limit)
  const hasNext = items.length > start + limit
  return { page, nextCursor: hasNext ? `demo-next-${pageNumber + 1}` : null }
}

function findParentCast(hash) {
  for (const [parentHash, replies] of Object.entries(REPLIES)) {
    if (replies.some((item) => item.hash === hash)) return CASTS.find((item) => item.hash === parentHash) || null
  }
  return null
}

function createDemoProvider() {
  return {
    name: 'demo',
    ready: true,
    setupMessage: '',
    async fetchFeed({ feedId = 'builders', query = '', limit = 20, cursor = '' } = {}) {
      const { page, nextCursor } = paginate(filterCasts(query, feedId), limit, cursor)
      return { casts: page, nextCursor: cursor ? nextCursor : nextCursor ? `demo-next-${feedId}-2` : null }
    },
    async fetchTrendingFeed({ limit = 20, cursor = '' } = {}) {
      return this.fetchFeed({ feedId: 'trending', limit, cursor })
    },
    async fetchChannelFeed({ channelId, limit = 20, cursor = '' } = {}) {
      return this.searchCasts(`/${channelId}`, { limit, cursor })
    },
    async fetchUserCasts({ fid, limit = 20, cursor = '' } = {}) {
      const user = USERS.find((item) => String(item.fid) === String(fid))
      if (!user) throw new NotFoundError('Demo FID not found.')
      const casts = CASTS.filter((item) => item.author.username === user.username)
      const { page, nextCursor } = paginate(casts, limit, cursor)
      return { casts: page, nextCursor }
    },
    async fetchUserByUsername(username) {
      const user = USERS.find((item) => item.username.toLowerCase() === String(username || '').toLowerCase())
      if (!user) throw new NotFoundError('Demo profile not found.')
      return user
    },
    async fetchUserByFid(fid) {
      const user = USERS.find((item) => String(item.fid) === String(fid))
      if (!user) throw new NotFoundError('Demo FID not found.')
      return user
    },
    async fetchCastByHash(hash) {
      const root = CASTS.find((item) => item.hash === hash) || Object.values(REPLIES).flat().find((item) => item.hash === hash)
      if (!root) throw new NotFoundError('Demo cast not found.')
      const parent = findParentCast(root.hash)
      const replies = parent ? (REPLIES[parent.hash] || []).filter((item) => item.hash !== root.hash) : (REPLIES[root.hash] || [])
      return { cast: root, parent, replies }
    },
    async searchCasts(query, { limit = 20, cursor = '', authorUsername = '' } = {}) {
      if (String(query || '').toLowerCase() === 'error') throw new ProviderError('Demo provider error state.')
      const q = String(query || '').toLowerCase()
      const author = String(authorUsername || '').toLowerCase()
      const all = filterCasts(query, 'trending')
      const searched = q ? all.filter((item) => `${item.text} ${item.author.username} ${item.author.display_name}`.toLowerCase().includes(q)) : all
      const authored = author ? searched.filter((item) => item.author.username.toLowerCase() === author) : searched
      const { page, nextCursor } = paginate(authored, limit, cursor)
      return { casts: page, nextCursor }
    },
    async searchUsers(query, { limit = 20 } = {}) {
      const q = String(query || '').toLowerCase()
      const users = USERS.filter((user) => `${user.username} ${user.display_name} ${user.bio}`.toLowerCase().includes(q)).slice(0, limit)
      return { users }
    },
    diagnostics() {
      return { name: 'demo', ready: true, mode: 'deterministic-fixtures', liveData: false }
    }
  }
}

module.exports = { createDemoProvider, USERS, CASTS }
