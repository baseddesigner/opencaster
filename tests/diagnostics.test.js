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

test('diagnostics surfaces Hypersnap upstream reliability metadata', async () => {
  let healthChecks = 0
  const provider = {
    name: 'hypersnap',
    ready: true,
    diagnostics: () => ({
      name: 'hypersnap',
      ready: true,
      mode: 'live-provider',
      liveData: true,
      noKeyRequired: true,
      baseUrl: 'https://haatz.example',
      upstreamLatencyMs: 37,
      lastSuccessAt: '2026-06-02T12:00:00.037Z',
      lastErrorAt: '',
      lastError: '',
      responseShapeHealth: {
        status: 'ok',
        endpoint: '/v1/info',
        checkedAt: '2026-06-02T12:00:00.037Z',
        message: 'Hypersnap response shape matched expected /v1/info object.'
      }
    }),
    healthCheck: async () => {
      healthChecks += 1
      return {
        ready: true,
        status: 200,
        upstreamLatencyMs: 37,
        lastSuccessAt: '2026-06-02T12:00:00.037Z',
        responseShapeHealth: {
          status: 'ok',
          endpoint: '/v1/info',
          checkedAt: '2026-06-02T12:00:00.037Z',
          message: 'Hypersnap response shape matched expected /v1/info object.'
        }
      }
    }
  }
  const config = { nodeEnv: 'production', provider: 'hypersnap', defaultFeed: 'builders', apiKey: '', cacheTtlSeconds: 60, providerReady: true, isLiveProvider: true }
  const app = createApp({ config, provider })

  const ready = await request(app).get('/readyz').expect(200)
  assert.equal(healthChecks, 1)
  assert.equal(ready.body.provider.baseUrl, 'https://haatz.example')
  assert.equal(ready.body.provider.upstreamLatencyMs, 37)
  assert.equal(ready.body.provider.responseShapeHealth.status, 'ok')

  const page = await request(app).get('/diagnostics').expect(200)
  assert.equal(healthChecks, 1)
  assert.match(page.text, /https:\/\/haatz\.example/)
  assert.match(page.text, /37ms/)
  assert.match(page.text, /2026-06-02T12:00:00.037Z/)
  assert.match(page.text, /shape.*ok/i)
})
