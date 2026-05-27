const { toProfileCard, normalizeFeedResponse } = require('../lib/view-models')

function registerProfileRoutes(app, ctx) {
  app.get('/u/:username', (req, res) => renderProfile(req, res, ctx, { username: req.params.username }))
  app.get('/fid/:fid', (req, res) => renderProfile(req, res, ctx, { fid: req.params.fid }))
}

async function renderProfile(req, res, ctx, target) {
  if (!ctx.provider.ready) {
    return res.render('pages/profile', {
      title: 'Profile setup needed',
      active: 'profile',
      profile: null,
      casts: [],
      setupMessage: ctx.provider.setupMessage || ctx.config.providerSetupMessage || 'Provider setup required.',
      errorMessage: ''
    })
  }
  try {
    const raw = target.username
      ? await ctx.provider.fetchUserByUsername(target.username)
      : await ctx.provider.fetchUserByFid(target.fid)
    const profile = toProfileCard(raw)
    let casts = []
    try {
      const feed = await ctx.provider.fetchFeed({ fid: profile.fid, query: profile.username, limit: 10 })
      casts = normalizeFeedResponse(feed).casts
    } catch (_) {
      casts = []
    }
    res.render('pages/profile', { title: profile.displayName, active: 'profile', profile, casts, setupMessage: '', errorMessage: '' })
  } catch (err) {
    res.status(err.status || 404).render('pages/profile', {
      title: 'Profile not found',
      active: 'profile',
      profile: null,
      casts: [],
      setupMessage: '',
      errorMessage: err.message || 'Couldn’t find that profile.'
    })
  }
}

module.exports = { registerProfileRoutes }
