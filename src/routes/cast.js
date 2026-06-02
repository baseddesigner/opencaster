const { normalizeCastThread } = require('../lib/view-models')
const { composeUrl } = require('../lib/intent-urls')
const { parseCastHash } = require('../lib/params')
const { buildCastDiscovery } = require('../lib/discovery')

function registerCastRoutes(app, ctx) {
  app.get('/cast/:hash', async (req, res) => {
    if (!ctx.provider.ready) {
      return res.render('pages/cast', {
        title: 'Cast setup needed',
        active: 'cast',
        cast: null,
        parent: null,
        replies: [],
        discovery: emptyDiscovery(),
        replyUrl: composeUrl(''),
        setupMessage: ctx.provider.setupMessage || ctx.config.providerSetupMessage || 'Provider setup required.',
        errorMessage: ''
      })
    }
    try {
      const hash = parseCastHash(req.params.hash)
      const payload = await ctx.cache.cached(`cast:${ctx.provider.name}:${hash}`, ctx.config.cacheTtlSeconds * 1000, async () => ctx.provider.fetchCastByHash(hash))
      const { cast, parent, replies } = normalizeCastThread(payload)
      const discovery = await buildCastDiscovery(ctx, { cast, parent, replies })
      res.render('pages/cast', {
        title: 'Cast',
        active: 'cast',
        cast,
        parent,
        replies,
        discovery,
        replyUrl: composeUrl(`Replying to ${cast.farcasterUrl}`),
        setupMessage: '',
        errorMessage: ''
      })
    } catch (err) {
      res.status(err.status || 404).render('pages/cast', {
        title: 'Cast not found',
        active: 'cast',
        cast: null,
        parent: null,
        replies: [],
        discovery: emptyDiscovery(),
        replyUrl: composeUrl(''),
        setupMessage: '',
        errorMessage: err.message || 'Couldn’t find that cast.'
      })
    }
  })
}

function emptyDiscovery() {
  return { authorRecent: [], relatedCasts: [], relatedQuery: '', embeds: [], context: { parentWhy: '', repliesWhy: '' } }
}

module.exports = { registerCastRoutes }
