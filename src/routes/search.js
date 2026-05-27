const { normalizeFeedResponse, normalizeSearchUsers } = require('../lib/view-models')
const { BadRequestError } = require('../lib/errors')

function registerSearchRoutes(app, ctx) {
  app.get('/search', async (req, res) => {
    const query = String(req.query.q || '').trim().slice(0, 120)
    const type = req.query.type === 'users' ? 'users' : 'casts'

    if (!query) {
      return res.render('pages/search', { title: 'Search', active: 'search', query: '', type, casts: [], users: [], nextCursor: null, setupMessage: '', errorMessage: '' })
    }
    if (!ctx.provider.ready) {
      return res.render('pages/search', { title: 'Search', active: 'search', query, type, casts: [], users: [], nextCursor: null, setupMessage: ctx.provider.setupMessage || ctx.config.providerSetupMessage || 'Provider setup required.', errorMessage: '' })
    }
    try {
      if (query.length < 2) throw new BadRequestError('Search query is too short.')
      if (type === 'users') {
        const payload = await ctx.provider.searchUsers(query, { limit: 20 })
        return res.render('pages/search', { title: 'Search users', active: 'search', query, type, casts: [], users: normalizeSearchUsers(payload), nextCursor: null, setupMessage: '', errorMessage: '' })
      }
      const payload = await ctx.provider.searchCasts(query, { limit: 3, cursor: req.query.cursor || '' })
      const normalized = normalizeFeedResponse(payload)
      res.render('pages/search', { title: 'Search casts', active: 'search', query, type, casts: normalized.casts, users: [], nextCursor: normalized.nextCursor, setupMessage: '', errorMessage: '' })
    } catch (err) {
      res.status(err.status || 200).render('pages/search', { title: 'Search', active: 'search', query, type, casts: [], users: [], nextCursor: null, setupMessage: '', errorMessage: err.message || 'Search is unavailable right now.' })
    }
  })
}

module.exports = { registerSearchRoutes }
