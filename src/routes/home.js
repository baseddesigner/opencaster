const { resolveFeedId } = require('../config')
const { normalizeFeedResponse } = require('../lib/view-models')
const { parseChannelId } = require('../lib/params')
const {
  DISPLAY_MODES,
  displayModeHref,
  feedControlHref,
  filterCastsForDisplayMode,
  filterCastsForFeedControls,
  normalizeDisplayMode,
  normalizeFeedControls
} = require('../lib/display-modes')

function registerHomeRoutes(app, ctx) {
  app.get('/', (req, res, next) => renderFeed(req, res, next, ctx, ctx.config.defaultFeed || 'builders'))
  app.get('/feed/:feedId', (req, res, next) => renderFeed(req, res, next, ctx, req.params.feedId))
  app.get('/channel/:channelId', (req, res, next) => renderChannel(req, res, next, ctx))
}

async function loadFeedPayload({ ctx, feed, feedId, cursor }) {
  const ttl = ctx.config.cacheTtlSeconds * 1000
  const primaryKey = `feed:${ctx.provider.name}:${feedId}:${feed.mode}:${feed.query || ''}:${cursor}`
  const fallbackKey = `feed:${ctx.provider.name}:fallback:${feedId}:${feed.fallback || ''}:${cursor}`
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

async function loadChannelPayload({ ctx, channelId, cursor }) {
  const ttl = ctx.config.cacheTtlSeconds * 1000
  const key = `channel:${ctx.provider.name}:${channelId}:${cursor}`
  const payload = await ctx.cache.cached(key, ttl, async () => {
    if (ctx.provider.fetchChannelFeed) return ctx.provider.fetchChannelFeed({ channelId, limit: 20, cursor })
    if (ctx.provider.searchCasts) return ctx.provider.searchCasts(`/${channelId}`, { limit: 20, cursor })
    return ctx.provider.fetchFeed({ feedId: channelId, query: `/${channelId}`, limit: 20, cursor })
  })
  return normalizeFeedResponse(payload)
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

  const cursor = req.query.cursor || ''
  const rank = req.query.rank === 'recent' ? 'recent' : 'signal'
  const displayMode = normalizeDisplayMode(req.query.mode)
  const feedControls = normalizeFeedControls(req.query)
  const basePath = `/feed/${resolvedFeedId}`

  if (!ctx.provider.ready) {
    return renderFeedPage(res, {
      title: `${feed.label} feed`,
      feedId: resolvedFeedId,
      feed,
      rank,
      displayMode,
      feedControls,
      basePath,
      cursor,
      casts: [],
      totalCasts: 0,
      nextCursor: null,
      setupMessage: ctx.provider.setupMessage || ctx.config.providerSetupMessage || 'Provider setup required.',
      errorMessage: ''
    })
  }

  try {
    const normalized = await loadFeedPayload({ ctx, feed, feedId: resolvedFeedId, cursor })
    const casts = presentCasts(normalized.casts, { rank, displayMode, feedControls })
    renderFeedPage(res, {
      title: `${feed.label} feed`,
      feedId: resolvedFeedId,
      feed,
      rank,
      displayMode,
      feedControls,
      basePath,
      cursor,
      casts,
      totalCasts: normalized.casts.length,
      nextCursor: normalized.nextCursor,
      setupMessage: '',
      errorMessage: ''
    })
  } catch (err) {
    renderFeedPage(res, {
      title: `${feed.label} feed`,
      feedId: resolvedFeedId,
      feed,
      rank: 'signal',
      displayMode,
      feedControls,
      basePath,
      cursor: '',
      casts: [],
      totalCasts: 0,
      nextCursor: null,
      setupMessage: '',
      errorMessage: err.message || 'Farcaster data is slow right now. Try again in a minute.'
    })
  }
}

async function renderChannel(req, res, next, ctx) {
  let channelId
  try {
    channelId = parseChannelId(req.params.channelId)
  } catch (err) {
    return next(err)
  }
  const cursor = req.query.cursor || ''
  const rank = req.query.rank === 'recent' ? 'recent' : 'signal'
  const displayMode = normalizeDisplayMode(req.query.mode)
  const feedControls = normalizeFeedControls(req.query)
  const basePath = `/channel/${channelId}`
  const feed = {
    label: `Channel /${channelId}`,
    shortLabel: `/${channelId}`,
    description: `Read-only channel lane for /${channelId}. Uses provider channel data when available, with search fallback only for reads.`,
    mode: 'channel',
    query: `/${channelId}`,
    accent: 'Channel lane'
  }

  if (!ctx.provider.ready) {
    return renderFeedPage(res, {
      title: `Channel /${channelId}`,
      feedId: `channel-${channelId}`,
      feed,
      rank,
      displayMode,
      feedControls,
      basePath,
      cursor,
      casts: [],
      totalCasts: 0,
      nextCursor: null,
      setupMessage: ctx.provider.setupMessage || ctx.config.providerSetupMessage || 'Provider setup required.',
      errorMessage: ''
    })
  }

  try {
    const normalized = await loadChannelPayload({ ctx, channelId, cursor })
    const casts = presentCasts(normalized.casts, { rank, displayMode, feedControls })
    renderFeedPage(res, {
      title: `Channel /${channelId}`,
      feedId: `channel-${channelId}`,
      feed,
      rank,
      displayMode,
      feedControls,
      basePath,
      cursor,
      casts,
      totalCasts: normalized.casts.length,
      nextCursor: normalized.nextCursor,
      setupMessage: '',
      errorMessage: ''
    })
  } catch (err) {
    renderFeedPage(res, {
      title: `Channel /${channelId}`,
      feedId: `channel-${channelId}`,
      feed,
      rank,
      displayMode,
      feedControls,
      basePath,
      cursor,
      casts: [],
      totalCasts: 0,
      nextCursor: null,
      setupMessage: '',
      errorMessage: err.message || 'Channel data is unavailable right now.'
    })
  }
}

function presentCasts(casts, { rank, displayMode, feedControls }) {
  const rankedCasts = rank === 'recent'
    ? [...casts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    : [...casts].sort((a, b) => b.engagementScore - a.engagementScore)
  return filterCastsForFeedControls(filterCastsForDisplayMode(rankedCasts, displayMode), feedControls)
}

function renderFeedPage(res, state) {
  const queryState = { rank: state.rank, cursor: state.cursor, mode: state.displayMode, ...state.feedControls }
  const feedHref = (next = {}) => {
    const params = new URLSearchParams()
    const merged = { ...queryState, ...next }
    for (const [key, value] of Object.entries(merged)) {
      if (value === undefined || value === null || value === '') continue
      if (key === 'mode' && normalizeDisplayMode(value) === 'casts') continue
      if ((key === 'replies' || key === 'recasts') && value !== 'hide') continue
      params.set(key, String(value))
    }
    const suffix = params.toString()
    return suffix ? `${state.basePath}?${suffix}` : state.basePath
  }
  return res.render('pages/home', {
    title: state.title,
    active: 'feed',
    feedId: state.feedId,
    feed: state.feed,
    rank: state.rank,
    displayMode: state.displayMode,
    displayModes: DISPLAY_MODES,
    feedControls: state.feedControls,
    feedHref,
    displayModeHref: (targetMode) => displayModeHref(state.basePath, queryState, targetMode),
    feedControlHref: (controlName, targetValue) => feedControlHref(state.basePath, queryState, controlName, targetValue),
    casts: state.casts,
    totalCasts: state.totalCasts,
    nextCursor: state.nextCursor,
    setupMessage: state.setupMessage,
    errorMessage: state.errorMessage
  })
}

module.exports = { registerHomeRoutes, loadFeedPayload, loadChannelPayload }
