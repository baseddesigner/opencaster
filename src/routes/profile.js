const { toProfileCard, normalizeFeedResponse } = require('../lib/view-models')
const { parseFid, parseUsername } = require('../lib/params')

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
    const targetUsername = target.username ? parseUsername(target.username) : ''
    const targetFid = target.fid ? parseFid(target.fid) : ''
    const raw = targetUsername
      ? await ctx.provider.fetchUserByUsername(targetUsername)
      : await ctx.provider.fetchUserByFid(targetFid)
    const profile = toProfileCard(raw)
    let casts = []
    try {
      const cacheKey = `profile-casts:${ctx.provider.name}:${profile.fid}`
      const feed = await ctx.cache.cached(cacheKey, ctx.config.cacheTtlSeconds * 1000, async () => {
        if (ctx.provider.fetchUserCasts) return ctx.provider.fetchUserCasts({ fid: profile.fid, limit: 10 })
        return ctx.provider.fetchFeed({ fid: profile.fid, limit: 10 })
      })
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
