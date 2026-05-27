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

  if (!ctx.config.apiKey) {
    return res.render('pages/home', {
      title: `${feed.label} feed`,
      active: 'feed',
      feedId,
      feed,
      casts: [],
      nextCursor: null,
      setupMessage: 'Add NEYNAR_API_KEY to .env to load live Farcaster data.',
      errorMessage: ''
    })
  }

  try {
    const cursor = req.query.cursor || ''
    const cacheKey = `feed:${feedId}:${cursor}`
    const payload = await ctx.cache.cached(cacheKey, ctx.config.cacheTtlSeconds * 1000, async () => {
      if (feed.mode === 'trending') return ctx.neynarClient.fetchTrendingFeed({ limit: 20, cursor })
      return ctx.neynarClient.fetchFeed({ feedId, query: feed.query, limit: 20, cursor })
    })
    const normalized = normalizeFeedResponse(payload)
    res.render('pages/home', {
      title: `${feed.label} feed`,
      active: 'feed',
      feedId,
      feed,
      casts: normalized.casts,
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
      casts: [],
      nextCursor: null,
      setupMessage: '',
      errorMessage: err.message || 'Farcaster data is slow right now. Try again in a minute.'
    })
  }
}

module.exports = { registerHomeRoutes }
