const { buildDiagnostics } = require('../lib/diagnostics')

async function withHealthProbe(diagnostics, provider) {
  if (!provider?.healthCheck) return diagnostics
  const health = await provider.healthCheck()
  return {
    ...diagnostics,
    ok: Boolean(health.ready),
    provider: {
      ...diagnostics.provider,
      ...health,
      ready: Boolean(health.ready),
      healthStatus: health.status || (health.ready ? 200 : 502),
      healthMessage: health.ready ? '' : (health.message || 'Provider health check failed.')
    }
  }
}

function registerDiagnosticsRoutes(app, ctx) {
  app.get('/readyz', async (req, res) => {
    const diagnostics = await withHealthProbe(buildDiagnostics({ config: ctx.config, provider: ctx.provider }), ctx.provider)
    res.status(diagnostics.ok ? 200 : 503).json(diagnostics)
  })

  app.get('/diagnostics', async (req, res) => {
    const diagnostics = await withHealthProbe(buildDiagnostics({ config: ctx.config, provider: ctx.provider }), ctx.provider)
    res.status(diagnostics.ok ? 200 : 503).render('pages/diagnostics', {
      title: 'Production diagnostics',
      active: 'diagnostics',
      diagnostics
    })
  })
}

module.exports = { registerDiagnosticsRoutes }
