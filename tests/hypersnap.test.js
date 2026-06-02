const test = require('node:test')
const assert = require('node:assert/strict')

const { createHypersnapClient } = require('../src/providers/hypersnap-provider')

test('Hypersnap client sends no auth headers and maps configured endpoints', async () => {
  const calls = []
  const client = createHypersnapClient({
    baseUrl: 'https://haatz.example',
    timeoutMs: 1000,
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options })
      return { ok: true, status: 200, json: async () => ({ casts: [{ hash: '0xfeed' }], next: { cursor: 'next-1' } }) }
    }
  })

  const feed = await client.fetchFeed({ query: 'snapchain builders', limit: 7, cursor: 'abc' })
  assert.equal(feed.next.cursor, 'next-1')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://haatz.example/v2/farcaster/cast/search?q=snapchain+builders&limit=7&cursor=abc')
  assert.equal(calls[0].options.headers.accept, 'application/json')
  assert.equal(calls[0].options.headers['x-api-key'], undefined)
  assert.equal(calls[0].options.headers.authorization, undefined)
})

test('Hypersnap client rejects plaintext upstream URLs', () => {
  assert.throws(() => createHypersnapClient({
    baseUrl: 'http://haatz.example',
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({}) })
  }), /Hypersnap base URL must use https/)
})

test('Hypersnap cast search falls back to public Farcaster search when Hypersnap returns no casts', async () => {
  const calls = []
  const client = createHypersnapClient({
    baseUrl: 'https://haatz.example',
    publicFarcasterBaseUrl: 'https://api.example',
    timeoutMs: 1000,
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options })
      if (url.startsWith('https://haatz.example/')) return { ok: true, status: 200, json: async () => ({ casts: [] }) }
      return { ok: true, status: 200, json: async () => ({ result: { casts: [{ hash: '0xpublic' }] } }) }
    }
  })

  const result = await client.searchCasts('farcaster client', { limit: 9, cursor: 'c1' })
  assert.equal(result.result.casts[0].hash, '0xpublic')
  assert.deepEqual(calls.map((call) => call.url), [
    'https://haatz.example/v2/farcaster/cast/search?q=farcaster+client&limit=9&cursor=c1',
    'https://api.example/v2/search-casts?q=farcaster+client&limit=9&cursor=c1'
  ])
  assert.equal(calls[1].options.headers.authorization, undefined)
})

test('Hypersnap client supports user, cast, search, feed, and diagnostics methods', async () => {
  const seen = []
  const client = createHypersnapClient({
    baseUrl: 'https://haatz.example/',
    fetchImpl: async (url) => {
      seen.push(url)
      if (url.includes('/user/by_username')) return { ok: true, status: 200, json: async () => ({ user: { username: 'cassie' } }) }
      if (url.includes('/user/bulk')) return { ok: true, status: 200, json: async () => ({ users: [{ fid: 1325 }] }) }
      if (url.includes('/cast/conversation')) return { ok: true, status: 200, json: async () => ({ conversation: { cast: { hash: '0xabc' } } }) }
      if (url.includes('/user/search')) return { ok: true, status: 200, json: async () => ({ users: [] }) }
      return { ok: true, status: 200, json: async () => ({ casts: [] }) }
    }
  })

  assert.equal((await client.fetchUserByUsername('cassie')).username, 'cassie')
  assert.equal((await client.fetchUserByFid(1325)).fid, 1325)
  assert.equal((await client.fetchCastByHash('0xabc')).conversation.cast.hash, '0xabc')
  assert.deepEqual(await client.searchUsers('cassie', { limit: 3 }), { users: [] })
  assert.deepEqual(await client.fetchTrendingFeed({ limit: 2 }), { casts: [] })
  assert.equal(client.diagnostics().mode, 'live-provider')
  assert.ok(seen.some((url) => url === 'https://haatz.example/v2/farcaster/feed/trending?limit=2'))
})


test('Hypersnap trending probes real trending endpoint before falling back to viewer feed', async () => {
  const seen = []
  const client = createHypersnapClient({
    baseUrl: 'https://haatz.example',
    fetchImpl: async (url) => {
      seen.push(url)
      if (url.includes('/feed/trending')) return { ok: false, status: 504, json: async () => ({}) }
      return { ok: true, status: 200, json: async () => ({ casts: [{ hash: 'fallback' }] }) }
    }
  })

  const payload = await client.fetchTrendingFeed({ limit: 2, cursor: 'c1' })
  assert.equal(payload.casts[0].hash, 'fallback')
  assert.deepEqual(seen, [
    'https://haatz.example/v2/farcaster/feed/trending?limit=2&cursor=c1',
    'https://haatz.example/v2/farcaster/feed?fid=1325&limit=2&cursor=c1'
  ])
})

test('Hypersnap has exact authored-casts and conversation methods', async () => {
  const seen = []
  const client = createHypersnapClient({
    baseUrl: 'https://haatz.example',
    fetchImpl: async (url) => {
      seen.push(url)
      if (url.includes('/cast/conversation')) {
        return { ok: true, status: 200, json: async () => ({ conversation: { cast: { hash: '0xabc', direct_replies: [{ hash: '0xreply' }] } } }) }
      }
      return { ok: true, status: 200, json: async () => ({ casts: [{ hash: '0xauthor' }] }) }
    }
  })

  assert.equal((await client.fetchUserCasts({ fid: 1325, limit: 5 })).casts[0].hash, '0xauthor')
  assert.equal((await client.fetchCastByHash('0xabc')).conversation.cast.direct_replies[0].hash, '0xreply')
  assert.deepEqual(seen, [
    'https://haatz.example/v2/farcaster/feed?fid=1325&limit=5',
    'https://haatz.example/v2/farcaster/cast/conversation?identifier=0xabc&type=hash&reply_depth=2'
  ])
})

test('Hypersnap healthCheck reports degraded upstream instead of unconditional ready', async () => {
  const client = createHypersnapClient({
    baseUrl: 'https://haatz.example',
    fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) })
  })
  const health = await client.healthCheck()
  assert.equal(health.ready, false)
  assert.equal(health.status, 503)
})

test('Hypersnap diagnostics track latency, success time, base URL, and shape health', async () => {
  let clock = Date.parse('2026-06-02T12:00:00.000Z')
  const client = createHypersnapClient({
    baseUrl: 'https://haatz.example/',
    fetchImpl: async () => {
      clock += 42
      return { ok: true, status: 200, json: async () => ({ version: 'test-node' }) }
    },
    now: () => clock
  })

  const health = await client.healthCheck()
  const diagnostics = client.diagnostics()
  assert.equal(health.ready, true)
  assert.equal(health.upstreamLatencyMs, 42)
  assert.equal(diagnostics.baseUrl, 'https://haatz.example')
  assert.equal(diagnostics.upstreamLatencyMs, 42)
  assert.equal(diagnostics.lastSuccessAt, '2026-06-02T12:00:00.042Z')
  assert.equal(diagnostics.lastErrorAt, '')
  assert.deepEqual(diagnostics.responseShapeHealth, {
    status: 'ok',
    endpoint: '/v1/info',
    checkedAt: '2026-06-02T12:00:00.042Z',
    message: 'Hypersnap response shape matched expected /v1/info object.'
  })
})

test('Hypersnap diagnostics keep last error and response-shape failures', async () => {
  let clock = Date.parse('2026-06-02T12:00:00.000Z')
  const client = createHypersnapClient({
    baseUrl: 'https://haatz.example',
    fetchImpl: async () => {
      clock += 9
      return { ok: true, status: 200, json: async () => [] }
    },
    now: () => clock
  })

  const health = await client.healthCheck()
  const diagnostics = client.diagnostics()
  assert.equal(health.ready, false)
  assert.equal(health.status, 502)
  assert.equal(diagnostics.lastErrorAt, '2026-06-02T12:00:00.009Z')
  assert.equal(diagnostics.lastError, 'Hypersnap response shape did not match expected /v1/info object.')
  assert.equal(diagnostics.responseShapeHealth.status, 'error')
  assert.equal(diagnostics.responseShapeHealth.endpoint, '/v1/info')
})
