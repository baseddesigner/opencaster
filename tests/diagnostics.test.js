const test = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')

const { createApp } = require('../src/app')

test('diagnostics exposes production readiness without leaking secrets', async () => {
  const app = createApp({ config: { nodeEnv: 'production', provider: 'demo', defaultFeed: 'builders', apiKey: 'super-secret', cacheTtlSeconds: 60, providerReady: true, isLiveProvider: false } })
  const res = await request(app).get('/diagnostics').expect(200)
  assert.match(res.text, /Production diagnostics/)
  assert.match(res.text, /Provider<\/span>/)
  assert.match(res.text, /demo/)
  assert.doesNotMatch(res.text, /super-secret/)
})

test('readiness endpoint reports provider mode and checklist gates', async () => {
  const app = createApp({ config: { nodeEnv: 'production', provider: 'demo', defaultFeed: 'builders', apiKey: 'super-secret', cacheTtlSeconds: 60, providerReady: true, isLiveProvider: false } })
  const res = await request(app).get('/readyz').expect(200)
  assert.equal(res.body.ok, true)
  assert.equal(res.body.provider.name, 'demo')
  assert.equal(res.body.provider.ready, true)
  assert.equal(res.body.security.noGenericProxy, true)
  assert.doesNotMatch(JSON.stringify(res.body), /super-secret/)
})
