const { buildDiagnostics } = require('../lib/diagnostics')

function registerDiagnosticsRoutes(app, ctx) {
  app.get('/readyz', (req, res) => {
    const diagnostics = buildDiagnostics({ config: ctx.config, provider: ctx.provider })
    res.status(diagnostics.ok ? 200 : 503).json(diagnostics)
  })

  app.get('/diagnostics', (req, res) => {
    const diagnostics = buildDiagnostics({ config: ctx.config, provider: ctx.provider })
    res.status(diagnostics.ok ? 200 : 503).render('pages/diagnostics', {
      title: 'Production diagnostics',
      active: 'diagnostics',
      diagnostics
    })
  })
}

module.exports = { registerDiagnosticsRoutes }
