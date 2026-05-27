const test = require('node:test')
const assert = require('node:assert/strict')

const { createDemoProvider } = require('../src/providers/demo-provider')
const { createProvider } = require('../src/providers')

test('demo provider returns deterministic feed, search, profiles, and thread data without secrets', async () => {
  const provider = createDemoProvider()
  const feed = await provider.fetchFeed({ feedId: 'builders', query: 'base', limit: 3 })
  assert.equal(feed.casts.length, 3)
  assert.equal(feed.casts[0].author.username, 'clawlinker')
  assert.equal(feed.nextCursor, 'demo-next-builders-2')

  const users = await provider.searchUsers('max', { limit: 5 })
  assert.ok(users.users.some((u) => u.username === 'baseddesigner'))

  const casts = await provider.searchCasts('x402', { limit: 10 })
  assert.ok(casts.casts.every((cast) => /x402|agent|base|farcaster|client/i.test(cast.text + ' ' + cast.author.username)))

  const profile = await provider.fetchUserByUsername('clawlinker')
  assert.equal(profile.fid, 22945)

  const thread = await provider.fetchCastByHash(feed.casts[0].hash)
  assert.equal(thread.cast.hash, feed.casts[0].hash)
  assert.ok(thread.replies.length >= 2)
})

test('provider factory defaults to demo and marks missing Neynar as setup-only', async () => {
  const demo = createProvider({ provider: 'demo' })
  assert.equal(demo.name, 'demo')
  assert.equal(demo.ready, true)

  const neynar = createProvider({ provider: 'neynar', apiKey: '' })
  assert.equal(neynar.name, 'neynar')
  assert.equal(neynar.ready, false)
  await assert.rejects(() => neynar.fetchTrendingFeed({ limit: 1 }), /NEYNAR_API_KEY/)
})


test('demo feed cursor advances instead of repeating first page', async () => {
  const provider = createDemoProvider()
  const first = await provider.fetchFeed({ feedId: 'builders', query: 'base', limit: 3 })
  const second = await provider.fetchFeed({ feedId: 'builders', query: 'base', limit: 3, cursor: first.nextCursor })
  assert.notDeepEqual(second.casts.map((cast) => cast.hash), first.casts.map((cast) => cast.hash))
})


test('demo feed does not emit phantom cursor when first page includes all casts', async () => {
  const provider = createDemoProvider()
  const feed = await provider.fetchFeed({ feedId: 'builders', query: 'base', limit: 20 })
  assert.equal(feed.nextCursor, null)
})
