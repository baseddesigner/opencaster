const { normalizeCastThread } = require('../lib/view-models')
const { composeUrl } = require('../lib/intent-urls')

function registerCastRoutes(app, ctx) {
  app.get('/cast/:hash', async (req, res) => {
    if (!ctx.config.apiKey) {
      return res.render('pages/cast', {
        title: 'Cast setup needed',
        active: 'cast',
        cast: null,
        replies: [],
        replyUrl: composeUrl(''),
        setupMessage: 'Add NEYNAR_API_KEY to .env to load casts.',
        errorMessage: ''
      })
    }
    try {
      const payload = await ctx.neynarClient.fetchCastByHash(req.params.hash)
      const { cast, replies } = normalizeCastThread(payload)
      res.render('pages/cast', {
        title: 'Cast',
        active: 'cast',
        cast,
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
        replies: [],
        replyUrl: composeUrl(''),
        setupMessage: '',
        errorMessage: err.message || 'Couldn’t find that cast.'
      })
    }
  })
}

module.exports = { registerCastRoutes }
