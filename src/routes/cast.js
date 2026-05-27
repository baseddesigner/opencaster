const { normalizeCastThread } = require('../lib/view-models')
const { composeUrl } = require('../lib/intent-urls')

function registerCastRoutes(app, ctx) {
  app.get('/cast/:hash', async (req, res) => {
    if (!ctx.provider.ready) {
      return res.render('pages/cast', {
        title: 'Cast setup needed',
        active: 'cast',
        cast: null,
        parent: null,
        replies: [],
        replyUrl: composeUrl(''),
        setupMessage: ctx.provider.setupMessage || ctx.config.providerSetupMessage || 'Provider setup required.',
        errorMessage: ''
      })
    }
    try {
      const payload = await ctx.provider.fetchCastByHash(req.params.hash)
      const { cast, parent, replies } = normalizeCastThread(payload)
      res.render('pages/cast', {
        title: 'Cast',
        active: 'cast',
        cast,
        parent,
        replies,
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
        replyUrl: composeUrl(''),
        setupMessage: '',
        errorMessage: err.message || 'Couldn’t find that cast.'
      })
    }
  })
}

module.exports = { registerCastRoutes }
