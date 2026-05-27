const { FEEDS } = require('../config')
const { normalizeFeedResponse } = require('../lib/view-models')

function registerHomeRoutes(app, ctx) {
  app.get('/', (req, res, next) => renderFeed(req, res, next, ctx, ctx.config.defaultFeed || 'builders'))
  app.get('/feed/:feedId', (req, res, next) => renderFeed(req, res, next, ctx, req.params.feedId))
}

async function renderFeed(req, res, next, ctx, feedId) {
  const feed = FEEDS[feedId]
  if (!feed) {
    return res.status(404).render('pages/error', {
      title: 'Feed not found',
      active: 'feed',
      message: 'Couldn’t find that feed.',
      detail: 'Pick one of the configured feed presets.'
    })
  }

  if (!ctx.provider.ready) {
    return res.render('pages/home', {
      title: `${feed.label} feed`,
      active: 'feed',
      feedId,
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
    const cacheKey = `feed:${ctx.provider.name}:${feedId}:${rank}:${cursor}`
    const payload = await ctx.cache.cached(cacheKey, ctx.config.cacheTtlSeconds * 1000, async () => {
      if (feed.mode === 'trending') return ctx.provider.fetchTrendingFeed({ limit: 20, cursor })
      return ctx.provider.fetchFeed({ feedId, query: feed.query, limit: 20, cursor })
    })
    const normalized = normalizeFeedResponse(payload)
    const casts = rank === 'recent'
      ? [...normalized.casts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      : [...normalized.casts].sort((a, b) => b.engagementScore - a.engagementScore)
    res.render('pages/home', {
      title: `${feed.label} feed`,
      active: 'feed',
      feedId,
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
      feedId,
      feed,
      rank: 'signal',
      casts: [],
      nextCursor: null,
      setupMessage: '',
      errorMessage: err.message || 'Farcaster data is slow right now. Try again in a minute.'
    })
  }
}

module.exports = { registerHomeRoutes }
