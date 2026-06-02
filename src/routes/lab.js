const { resolveFeedId } = require('../config')
const { loadFeedPayload } = require('./home')
const { LAB_MODES, UPCOMING_MODES, normalizeLabMode, rankLabCasts } = require('../lib/feed-lab')

function registerLabRoutes(app, ctx) {
  app.get('/lab', async (req, res) => {
    const requestedFeed = req.query.feed || ''
    const feedId = requestedFeed ? resolveFeedId(requestedFeed, ctx.config.feeds) : ctx.config.defaultFeed
    const feed = ctx.config.feeds[feedId]
    const mode = normalizeLabMode(req.query.mode || 'engagement')

    if (!feed) {
      return res.status(404).render('pages/error', {
        title: 'Feed not found',
        active: 'lab',
        message: 'Couldn’t find that feed.',
        detail: 'Pick one of the configured feed presets or update your feed preset file.'
      })
    }

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
      const normalized = await loadFeedPayload({ ctx, feed, feedId, cursor: '' })
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
