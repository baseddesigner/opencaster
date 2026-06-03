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
      return res.status(err.status || 400).render('pages/search', { title: 'Search', active: 'search', query: String(req.query.q || '').slice(0, 120), type, casts: [], users: [], nextCursor: null, setupMessage: '', errorMessage: err.message || 'Search request is invalid.' })
    }

    if (!displayQuery) {
      return res.render('pages/search', { title: 'Search', active: 'search', query: '', type, casts: [], users: [], nextCursor: null, setupMessage: '', errorMessage: '' })
    }
    if (!ctx.provider.ready) {
      return res.render('pages/search', { title: 'Search', active: 'search', query: displayQuery, type, casts: [], users: [], nextCursor: null, setupMessage: ctx.provider.setupMessage || ctx.config.providerSetupMessage || 'Provider setup required.', errorMessage: '' })
    }
    try {
      if (type === 'users') {
        const payload = await ctx.cache.cached(`search-users:${ctx.provider.name}:${query}`, ctx.config.cacheTtlSeconds * 1000, async () => ctx.provider.searchUsers(query, { limit: 20 }))
        return res.render('pages/search', { title: 'Search users', active: 'search', query: displayQuery, type, casts: [], users: normalizeSearchUsers(payload), nextCursor: null, setupMessage: '', errorMessage: '' })
      }
      const payload = await ctx.cache.cached(`search-casts:${ctx.provider.name}:${query}:${authorUsername}:${cursor}`, ctx.config.cacheTtlSeconds * 1000, async () => ctx.provider.searchCasts(query, { limit: 3, cursor, authorUsername }))
      const normalized = normalizeFeedResponse(payload)
      res.render('pages/search', { title: 'Search casts', active: 'search', query: displayQuery, type, casts: normalized.casts, users: [], nextCursor: normalized.nextCursor, setupMessage: '', errorMessage: '' })
    } catch (err) {
      res.status(err.status || 200).render('pages/search', { title: 'Search', active: 'search', query: displayQuery, type, casts: [], users: [], nextCursor: null, setupMessage: '', errorMessage: err.message || 'Search is unavailable right now.' })
    }
  })
}

module.exports = { registerSearchRoutes }
