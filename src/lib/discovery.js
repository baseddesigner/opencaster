const { AppError } = require('./errors')
const { normalizeFeedResponse } = require('./view-models')

const STOPWORDS = new Set([
  'about', 'after', 'again', 'also', 'because', 'before', 'being', 'casts', 'client', 'could',
  'every', 'farcaster', 'first', 'from', 'have', 'into', 'less', 'like', 'more', 'need',
  'only', 'over', 'post', 'probably', 'should', 'that', 'their', 'there', 'thing', 'this',
  'thread', 'through', 'what', 'when', 'where', 'which', 'while', 'with', 'would', 'your'
])

function extractDiscoveryTerms(text = '', max = 5) {
  const counts = new Map()
  const words = String(text || '')
    .replace(/https?:\/\/\S+/gi, ' ')
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9-]{2,}/g) || []

  for (const word of words) {
    if (STOPWORDS.has(word) || word.length < 4) continue
    counts.set(word, (counts.get(word) || 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([word]) => word)
}

function withWhy(casts = [], whyShown) {
  return casts.map((cast) => ({ ...cast, whyShown }))
}

function discoveryFetchLimit(limit, excludeSize = 0, cushion = 3) {
  return Math.min(limit + excludeSize + cushion, 25)
}

async function loadAuthorRecentCasts(ctx, cast, { limit = 4, excludeHashes = new Set() } = {}) {
  const fid = cast?.author?.fid
  const username = cast?.author?.username || ''
  if (!fid && !username) return []

  const fetchLimit = discoveryFetchLimit(limit, excludeHashes.size, 1)
  const cacheKey = `discovery-author:${ctx.provider.name}:${fid || username}:${limit}`
  const payload = await ctx.cache.cached(cacheKey, ctx.config.cacheTtlSeconds * 1000, async () => {
    if (fid && ctx.provider.fetchUserCasts) return ctx.provider.fetchUserCasts({ fid, limit: fetchLimit })
    if (fid && ctx.provider.fetchFeed) return ctx.provider.fetchFeed({ fid, limit: fetchLimit })
    return ctx.provider.searchCasts(username, { limit: fetchLimit })
  })

  return withWhy(
    normalizeFeedResponse(payload).casts
      .filter((item) => !excludeHashes.has(item.hash))
      .slice(0, limit),
    `Recent cast from @${username || 'this author'}`
  )
}

async function loadRelatedCasts(ctx, cast, { limit = 4, excludeHashes = new Set() } = {}) {
  if (!ctx.provider.searchCasts) return { query: '', casts: [] }
  const terms = extractDiscoveryTerms(`${cast?.text || ''} ${cast?.author?.username || ''}`, 5)
  const query = terms.join(' ') || cast?.author?.username || ''
  if (!query) return { query: '', casts: [] }

  const fetchLimit = discoveryFetchLimit(limit, excludeHashes.size)
  const cacheKey = `discovery-related:${ctx.provider.name}:${query}:${limit}`
  const payload = await ctx.cache.cached(cacheKey, ctx.config.cacheTtlSeconds * 1000, async () => {
    return ctx.provider.searchCasts(query, { limit: fetchLimit })
  })

  const casts = normalizeFeedResponse(payload).casts
    .filter((item) => !excludeHashes.has(item.hash))
    .slice(0, limit)

  return {
    query,
    casts: withWhy(casts, `Matches: ${query}`)
  }
}

async function buildCastDiscovery(ctx, { cast, parent, replies = [] }) {
  if (!cast) return emptyCastDiscovery()
  const excludeHashes = new Set([cast.hash, parent?.hash, ...replies.map((reply) => reply.hash)].filter(Boolean))
  const [authorRecent, related] = await Promise.all([
    optionalDiscovery(() => loadAuthorRecentCasts(ctx, cast, { excludeHashes })),
    optionalDiscovery(() => loadRelatedCasts(ctx, cast, { excludeHashes }), { query: '', casts: [] })
  ])

  return {
    authorRecent,
    relatedCasts: related.casts,
    relatedQuery: related.query,
    embeds: (cast.embeds || []).map((embed) => ({
      ...embed,
      whyShown: 'Linked or embedded in this cast'
    })),
    context: {
      parentWhy: parent ? 'Direct parent fetched from the cast conversation.' : '',
      repliesWhy: replies.length ? 'Direct replies fetched from the cast conversation.' : ''
    }
  }
}

async function buildProfileDiscovery(ctx, { profile, casts = [] }) {
  if (!profile) return emptyProfileDiscovery()
  const seedText = [
    profile.username,
    profile.bio,
    ...casts.slice(0, 2).map((cast) => cast.text)
  ].join(' ')
  const terms = extractDiscoveryTerms(seedText, 5)
  const query = terms.join(' ') || profile.username
  const excludeHashes = new Set(casts.map((cast) => cast.hash).filter(Boolean))

  const related = await optionalDiscovery(async () => {
    if (!ctx.provider.searchCasts || !query) return { casts: [] }
    const payload = await ctx.cache.cached(`discovery-profile:${ctx.provider.name}:${profile.fid || profile.username}:${query}`, ctx.config.cacheTtlSeconds * 1000, async () => {
      return ctx.provider.searchCasts(query, { limit: 6 + excludeHashes.size })
    })
    return {
      query,
      casts: withWhy(
        normalizeFeedResponse(payload).casts
          .filter((cast) => !excludeHashes.has(cast.hash))
          .slice(0, 4),
        `Related to @${profile.username}: ${query}`
      )
    }
  }, { query: '', casts: [] })

  return {
    relatedQuery: related.query,
    relatedCasts: related.casts,
    recentWhy: `Authored by @${profile.username}`
  }
}

async function optionalDiscovery(loader, fallback = []) {
  try {
    return await loader()
  } catch (err) {
    if (!(err instanceof AppError)) throw err
    return fallback
  }
}

function emptyCastDiscovery() {
  return { authorRecent: [], relatedCasts: [], relatedQuery: '', embeds: [], context: { parentWhy: '', repliesWhy: '' } }
}

function emptyProfileDiscovery() {
  return { relatedQuery: '', relatedCasts: [], recentWhy: '' }
}

module.exports = {
  extractDiscoveryTerms,
  buildCastDiscovery,
  buildProfileDiscovery,
  discoveryFetchLimit,
  emptyCastDiscovery,
  emptyProfileDiscovery,
  loadAuthorRecentCasts,
  loadRelatedCasts
}
