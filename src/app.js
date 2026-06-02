const path = require('node:path')
const express = require('express')

const { FEEDS, loadConfig } = require('./config')
const { createCache } = require('./cache')
const { createProvider } = require('./providers')
const { registerHomeRoutes } = require('./routes/home')
const { registerProfileRoutes } = require('./routes/profile')
const { registerCastRoutes } = require('./routes/cast')
const { registerSearchRoutes } = require('./routes/search')
const { registerDiagnosticsRoutes } = require('./routes/diagnostics')
const { registerLabRoutes } = require('./routes/lab')
const { AppError } = require('./lib/errors')
const { securityHeaders, createRateLimiter } = require('./lib/security')

function createApp({ provider, neynarClient, config, cache } = {}) {
  const app = express()
  const resolvedConfig = normalizeRuntimeConfig(config || loadConfig())
  const resolvedCache = cache || createCache()
  const resolvedProvider = provider || neynarClient || createProvider(resolvedConfig)

  app.set('view engine', 'ejs')
  app.set('views', path.join(__dirname, '..', 'views'))
  app.set('trust proxy', resolvedConfig.trustProxy || false)
  app.disable('x-powered-by')

  app.use(securityHeaders)
  app.use(createRateLimiter({ windowMs: 60_000, max: 180 }))
  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h', etag: true }))
  app.use((req, res, next) => {
    res.locals.feeds = FEEDS
    res.locals.defaultFeed = resolvedConfig.defaultFeed || 'builders'
    res.locals.active = ''
    res.locals.provider = {
      name: resolvedProvider.name || resolvedConfig.provider || 'unknown',
      ready: Boolean(resolvedProvider.ready ?? resolvedConfig.providerReady),
      setupMessage: resolvedProvider.setupMessage || resolvedConfig.providerSetupMessage || ''
    }
    next()
  })

  const ctx = { config: resolvedConfig, provider: resolvedProvider, neynarClient: resolvedProvider, cache: resolvedCache }

  app.get('/healthz', (req, res) => res.type('text/plain').send('ok'))
  app.get('/about', (req, res) => res.render('pages/about', { title: 'About', active: 'about', diagnosticsPath: '/diagnostics' }))

  registerDiagnosticsRoutes(app, ctx)
  registerHomeRoutes(app, ctx)
  registerLabRoutes(app, ctx)
  registerProfileRoutes(app, ctx)
  registerCastRoutes(app, ctx)
  registerSearchRoutes(app, ctx)

  app.use((req, res) => {
    res.status(404).render('pages/error', {
      title: 'Not found',
      active: '',
      message: 'Couldn’t find that page.',
      detail: 'No generic provider proxy exists here. Routes are explicit on purpose.'
    })
  })

  app.use((err, req, res, next) => {
    const status = err.status || (err instanceof AppError ? err.status : 500)
    const message = status >= 500 ? 'Farcaster data is slow right now. Try again in a minute.' : err.message
    res.status(status).render('pages/error', {
      title: 'Something went sideways',
      active: '',
      message,
      detail: resolvedConfig.nodeEnv === 'development' && status < 500 ? err.message : ''
    })
  })

  return app
}

function normalizeRuntimeConfig(config) {
  return {
    nodeEnv: config.nodeEnv || 'development',
    provider: config.provider || (config.apiKey ? 'neynar' : 'demo'),
    apiKey: config.apiKey || '',
    isLiveProvider: Boolean(config.isLiveProvider ?? (config.provider && config.provider !== 'demo')),
    providerReady: Boolean(config.providerReady ?? (config.provider !== 'neynar' || config.apiKey)),
    providerSetupMessage: config.providerSetupMessage || '',
    defaultFeed: config.defaultFeed || 'builders',
    cacheTtlSeconds: config.cacheTtlSeconds || 60,
    publicBaseUrl: config.publicBaseUrl || 'http://127.0.0.1:3039',
    port: config.port || 3039,
    host: config.host || '127.0.0.1',
    trustProxy: config.trustProxy || false
  }
}

module.exports = { createApp }
