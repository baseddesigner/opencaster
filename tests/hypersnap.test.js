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
      if (url.includes('/cast?')) return { ok: true, status: 200, json: async () => ({ cast: { hash: '0xabc' } }) }
      if (url.includes('/user/search')) return { ok: true, status: 200, json: async () => ({ users: [] }) }
      return { ok: true, status: 200, json: async () => ({ casts: [] }) }
    }
  })

  assert.equal((await client.fetchUserByUsername('cassie')).username, 'cassie')
  assert.equal((await client.fetchUserByFid(1325)).fid, 1325)
  assert.equal((await client.fetchCastByHash('0xabc')).cast.hash, '0xabc')
  assert.deepEqual(await client.searchUsers('cassie', { limit: 3 }), { users: [] })
  assert.deepEqual(await client.fetchTrendingFeed({ limit: 2 }), { casts: [] })
  assert.equal(client.diagnostics().mode, 'live-provider')
  assert.ok(seen.some((url) => url === 'https://haatz.example/v2/farcaster/feed?fid=1325&limit=2'))
})
