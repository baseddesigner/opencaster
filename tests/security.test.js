const test = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')
const { createApp } = require('../src/app')
const { createRateLimiter } = require('../src/lib/security')

test('rendered cast text is escaped and external links are noopener noreferrer', async () => {
  const app = createApp({
    config: { nodeEnv: 'test', provider: 'mock', defaultFeed: 'builders', apiKey: 'top-secret', cacheTtlSeconds: 60, providerReady: true, isLiveProvider: false },
    provider: {
      name: 'mock',
      ready: true,
      fetchFeed: async () => ({ casts: [{ hash: '0xxss', text: '<script>alert(1)</script>', author: { username: 'evil' }, embeds: [{ url: 'javascript:alert(1)', title: 'bad' }, { url: 'https://safe.example', title: '<b>safe</b>' }] }], nextCursor: null })
    }
  })
  const res = await request(app).get('/').expect(200)
  assert.doesNotMatch(res.text, /<script>alert/)
  assert.match(res.text, /&lt;script&gt;alert/)
  assert.doesNotMatch(res.text, /javascript:alert/)
  assert.match(res.text, /rel="noopener noreferrer"/)
  assert.doesNotMatch(res.text, /top-secret/)
})

test('security headers are set for production pages', async () => {
  const app = createApp({ config: { nodeEnv: 'production', provider: 'demo', defaultFeed: 'builders', apiKey: '', cacheTtlSeconds: 60, providerReady: true, isLiveProvider: false } })
  const res = await request(app).get('/').expect(200)
  assert.equal(res.headers['x-content-type-options'], 'nosniff')
  assert.equal(res.headers['referrer-policy'], 'strict-origin-when-cross-origin')
  assert.equal(res.headers['strict-transport-security'], 'max-age=15552000; includeSubDomains')
  assert.equal(res.headers['x-robots-tag'], 'noindex, nofollow')
  assert.match(res.headers['content-security-policy'], /default-src 'self'/)
  assert.match(res.headers['content-security-policy'], /style-src 'self'/)
  assert.doesNotMatch(res.headers['content-security-policy'], /unsafe-inline/)
  assert.doesNotMatch(res.headers['content-security-policy'], /data:/)
})

test('rate limiter bounds stored client buckets and evicts expired entries', () => {
  let now = 1_000
  const limiter = createRateLimiter({ windowMs: 1_000, max: 10, maxKeys: 2, now: () => now })
  const next = () => {}
  const res = { setHeader() {}, status() { return this }, type() { return this }, send() {} }

  limiter({ ip: '198.51.100.1' }, res, next)
  limiter({ ip: '198.51.100.2' }, res, next)
  assert.equal(limiter.storeSize(), 2)

  limiter({ ip: '198.51.100.3' }, res, next)
  assert.equal(limiter.storeSize(), 2)

  now += 1_001
  limiter({ ip: '198.51.100.4' }, res, next)
  assert.equal(limiter.storeSize(), 1)
})

test('app exposes explicit trust proxy configuration for proxied deployments', async () => {
  const app = createApp({
    config: { nodeEnv: 'production', provider: 'demo', defaultFeed: 'builders', apiKey: '', cacheTtlSeconds: 60, providerReady: true, isLiveProvider: false, trustProxy: 'loopback' }
  })
  assert.equal(app.get('trust proxy'), 'loopback')
  await request(app).get('/healthz').set('X-Forwarded-For', '203.0.113.10').expect(200)
})
