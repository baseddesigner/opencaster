const { normalizeFeedResponse, normalizeSearchUsers } = require('../lib/view-models')
const { parseCursor, parseSearchInput, parseSearchQuery } = require('../lib/params')

function registerSearchRoutes(app, ctx) {
  app.get('/search', async (req, res) => {
    const type = req.query.type === 'users' ? 'users' : 'casts'
    let query = ''
    let displayQuery = ''
    let authorUsername = ''
    let cursor = ''
    try {
      const parsedSearch = type === 'casts' ? parseSearchInput(req.query.q || '') : { displayQuery: parseSearchQuery(req.query.q || ''), query: parseSearchQuery(req.query.q || ''), authorUsername: '' }
      query = parsedSearch.query
      displayQuery = parsedSearch.displayQuery
      authorUsername = parsedSearch.authorUsername
      cursor = parseCursor(req.query.cursor || '')
    } catch (err) {
      return renderSearch(res.status(err.status || 400), { query: String(req.query.q || '').slice(0, 120), type, errorMessage: err.message || 'Search request is invalid.' })
    }

    if (!displayQuery) {
      return renderSearch(res, { query: '', type })
    }
    if (!ctx.provider.ready) {
      return renderSearch(res, { query: displayQuery, queryTerm: query, authorUsername, type, setupMessage: ctx.provider.setupMessage || ctx.config.providerSetupMessage || 'Provider setup required.' })
    }
    try {
      if (type === 'users') {
        const payload = await ctx.cache.cached(`search-users:${ctx.provider.name}:${query}`, ctx.config.cacheTtlSeconds * 1000, async () => ctx.provider.searchUsers(query, { limit: 20 }))
        return renderSearch(res, { title: 'Search users', query: displayQuery, queryTerm: query, authorUsername, type, users: normalizeSearchUsers(payload) })
      }
      const payload = await ctx.cache.cached(`search-casts:${ctx.provider.name}:${query}:${authorUsername}:${cursor}`, ctx.config.cacheTtlSeconds * 1000, async () => ctx.provider.searchCasts(query, { limit: 3, cursor, authorUsername }))
      const normalized = normalizeFeedResponse(payload)
      renderSearch(res, { title: 'Search casts', query: displayQuery, queryTerm: query, authorUsername, type, casts: normalized.casts, nextCursor: normalized.nextCursor })
    } catch (err) {
      renderSearch(res.status(err.status || 200), { query: displayQuery, queryTerm: query, authorUsername, type, errorMessage: err.message || 'Search is unavailable right now.' })
    }
  })
}

function renderSearch(res, state = {}) {
  const query = state.query || ''
  const queryTerm = state.queryTerm ?? query
  const authorUsername = state.authorUsername || ''
  return res.render('pages/search', {
    title: state.title || 'Search',
    active: 'search',
    query,
    queryTerm,
    authorUsername,
    clearAuthorHref: authorUsername ? `/search?q=${encodeURIComponent(queryTerm)}&type=casts` : '',
    type: state.type || 'casts',
    casts: state.casts || [],
    users: state.users || [],
    nextCursor: state.nextCursor || null,
    setupMessage: state.setupMessage || '',
    errorMessage: state.errorMessage || ''
  })
}

module.exports = { registerSearchRoutes }
