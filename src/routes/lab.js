const { FEEDS } = require('../config')
const { loadFeedPayload } = require('./home')
const { LAB_MODES, UPCOMING_MODES, normalizeLabMode, rankLabCasts } = require('../lib/feed-lab')

function registerLabRoutes(app, ctx) {
  app.get('/lab', async (req, res) => {
    const feedId = FEEDS[req.query.feed] ? req.query.feed : (ctx.config.defaultFeed || 'builders')
    const feed = FEEDS[feedId] || FEEDS.builders
    const mode = normalizeLabMode(req.query.mode || 'engagement')

    if (!ctx.provider.ready) {
      return res.render('pages/lab', {
        title: 'Feed Lab',
        active: 'lab',
        feedId,
        feed,
        mode,
        modes: LAB_MODES,
        upcomingModes: UPCOMING_MODES,
        casts: [],
        setupMessage: ctx.provider.setupMessage || ctx.config.providerSetupMessage || 'Provider setup required.',
        errorMessage: ''
      })
    }

    try {
      const normalized = await loadFeedPayload({ ctx, feed, feedId, rank: 'lab', cursor: '' })
      const casts = rankLabCasts(normalized.casts, mode)
      res.render('pages/lab', {
        title: 'Feed Lab',
        active: 'lab',
        feedId,
        feed,
        mode,
        modes: LAB_MODES,
        upcomingModes: UPCOMING_MODES,
        casts,
        setupMessage: '',
        errorMessage: ''
      })
    } catch (err) {
      res.render('pages/lab', {
        title: 'Feed Lab',
        active: 'lab',
        feedId,
        feed,
        mode,
        modes: LAB_MODES,
        upcomingModes: UPCOMING_MODES,
        casts: [],
        setupMessage: '',
        errorMessage: err.message || 'Feed lab data is unavailable right now.'
      })
    }
  })
}

module.exports = { registerLabRoutes }
