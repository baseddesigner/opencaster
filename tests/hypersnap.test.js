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
      return { ok: true, status: 200, json: async () => ({ casts: [], next: { cursor: 'next-1' } }) }
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
