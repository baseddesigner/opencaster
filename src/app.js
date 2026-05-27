const path = require('node:path')
const express = require('express')

const { FEEDS, loadConfig } = require('./config')
const { createCache } = require('./cache')
const { createNeynarClient } = require('./neynar')
const { registerHomeRoutes } = require('./routes/home')
const { registerProfileRoutes } = require('./routes/profile')
const { registerCastRoutes } = require('./routes/cast')
const { registerSearchRoutes } = require('./routes/search')
const { AppError } = require('./lib/errors')

function createApp({ neynarClient, config, cache } = {}) {
  const app = express()
  const resolvedConfig = config || loadConfig()
  const resolvedCache = cache || createCache()
  const resolvedNeynar = neynarClient || createNeynarClient({ apiKey: resolvedConfig.apiKey })

  app.set('view engine', 'ejs')
  app.set('views', path.join(__dirname, '..', 'views'))
  app.disable('x-powered-by')

  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }))
  app.use((req, res, next) => {
    res.locals.feeds = FEEDS
    res.locals.defaultFeed = resolvedConfig.defaultFeed || 'builders'
    res.locals.active = ''
    next()
  })

  const ctx = { config: resolvedConfig, neynarClient: resolvedNeynar, cache: resolvedCache }

  app.get('/healthz', (req, res) => res.type('text/plain').send('ok'))
  app.get('/about', (req, res) => res.render('pages/about', { title: 'About', active: 'about' }))

  registerHomeRoutes(app, ctx)
  registerProfileRoutes(app, ctx)
  registerCastRoutes(app, ctx)
  registerSearchRoutes(app, ctx)

  app.use((req, res) => {
    res.status(404).render('pages/error', {
      title: 'Not found',
      active: '',
      message: 'Couldn’t find that page.',
      detail: 'No generic Neynar proxy exists here. Routes are explicit on purpose.'
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

module.exports = { createApp }
