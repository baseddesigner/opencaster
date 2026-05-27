const test = require('node:test')
const assert = require('node:assert/strict')

const { createNeynarClient } = require('../src/neynar')

test('Neynar client adds api key header and query params', async () => {
  let seen
  const client = createNeynarClient({
    apiKey: 'secret-key',
    baseUrl: 'https://api.example.test',
    fetchImpl: async (url, options) => {
      seen = { url, options }
      return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ ok: true }) }
    }
  })
  const json = await client.request('/v2/test', { q: 'hello world', limit: 5 })
  assert.equal(json.ok, true)
  assert.equal(seen.options.headers['x-api-key'], 'secret-key')
  assert.match(seen.url, /q=hello\+world/)
  assert.match(seen.url, /limit=5/)
})

test('Neynar client hides api key in provider errors', async () => {
  const client = createNeynarClient({
    apiKey: 'secret-key',
    baseUrl: 'https://api.example.test',
    fetchImpl: async () => ({ ok: false, status: 401, text: async () => 'secret-key unauthorized' })
  })
  await assert.rejects(() => client.fetchTrendingFeed({ limit: 5 }), (err) => {
    assert.equal(err.status, 401)
    assert.doesNotMatch(err.message, /secret-key/)
    return true
  })
})
