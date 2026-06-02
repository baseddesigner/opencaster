const { resolveFeedId } = require('../config')
const { normalizeFeedResponse } = require('../lib/view-models')

function registerHomeRoutes(app, ctx) {
  app.get('/', (req, res, next) => renderFeed(req, res, next, ctx, ctx.config.defaultFeed || 'builders'))
  app.get('/feed/:feedId', (req, res, next) => renderFeed(req, res, next, ctx, req.params.feedId))
}

async function loadFeedPayload({ ctx, feed, feedId, rank, cursor }) {
  const ttl = ctx.config.cacheTtlSeconds * 1000
  const primaryKey = `feed:${ctx.provider.name}:${feedId}:${rank}:${cursor}`
  const fallbackKey = `feed:${ctx.provider.name}:fallback:${feedId}:${rank}:${cursor}`
  const loadFallback = async () => {
    if (ctx.provider.fetchUserCasts) return ctx.provider.fetchUserCasts({ limit: 20, cursor })
    return ctx.provider.fetchTrendingFeed({ limit: 20, cursor })
  }

  let payload
  try {
    payload = await ctx.cache.cached(primaryKey, ttl, async () => {
      if (feed.mode === 'trending') return ctx.provider.fetchTrendingFeed({ limit: 20, cursor })
      return ctx.provider.fetchFeed({ feedId, query: feed.query, limit: 20, cursor })
    })
  } catch (err) {
    if (feed.fallback !== 'trending' || feed.mode === 'trending') throw err
    payload = await ctx.cache.cached(fallbackKey, ttl, loadFallback)
  }

  let normalized = normalizeFeedResponse(payload)
  if (!cursor && normalized.casts.length === 0 && feed.fallback === 'trending' && feed.mode !== 'trending') {
    payload = await ctx.cache.cached(fallbackKey, ttl, loadFallback)
    normalized = normalizeFeedResponse(payload)
  }
  return normalized
}

async function renderFeed(req, res, next, ctx, feedId) {
  const resolvedFeedId = resolveFeedId(feedId, ctx.config.feeds)
  const feed = ctx.config.feeds[resolvedFeedId]
  if (!feed) {
    return res.status(404).render('pages/error', {
      title: 'Feed not found',
      active: 'feed',
      message: 'Couldn’t find that feed.',
      detail: 'Pick one of the configured feed presets or update your feed preset file.'
    })
  }

  if (!ctx.provider.ready) {
    return res.render('pages/home', {
      title: `${feed.label} feed`,
      active: 'feed',
      feedId: resolvedFeedId,
      feed,
      rank: 'signal',
      casts: [],
      nextCursor: null,
      setupMessage: ctx.provider.setupMessage || ctx.config.providerSetupMessage || 'Provider setup required.',
      errorMessage: ''
    })
  }

  try {
    const cursor = req.query.cursor || ''
    const rank = req.query.rank === 'recent' ? 'recent' : 'signal'
    const normalized = await loadFeedPayload({ ctx, feed, feedId: resolvedFeedId, rank, cursor })
    const casts = rank === 'recent'
      ? [...normalized.casts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      : [...normalized.casts].sort((a, b) => b.engagementScore - a.engagementScore)
    res.render('pages/home', {
      title: `${feed.label} feed`,
      active: 'feed',
      feedId: resolvedFeedId,
      feed,
      rank,
      casts,
      nextCursor: normalized.nextCursor,
      setupMessage: '',
      errorMessage: ''
    })
  } catch (err) {
    res.render('pages/home', {
      title: `${feed.label} feed`,
      active: 'feed',
      feedId: resolvedFeedId,
      feed,
      rank: 'signal',
      casts: [],
      nextCursor: null,
      setupMessage: '',
      errorMessage: err.message || 'Farcaster data is slow right now. Try again in a minute.'
    })
  }
}

module.exports = { registerHomeRoutes, loadFeedPayload }
