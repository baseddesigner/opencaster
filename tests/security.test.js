const test = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')
const { createApp } = require('../src/app')

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
  assert.match(res.headers['content-security-policy'], /default-src 'self'/)
  assert.match(res.headers['content-security-policy'], /style-src 'self'/)
  assert.doesNotMatch(res.headers['content-security-policy'], /unsafe-inline/)
  assert.doesNotMatch(res.headers['content-security-policy'], /data:/)
})
