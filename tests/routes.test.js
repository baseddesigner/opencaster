const test = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')

const { createApp } = require('../src/app')

function mockNeynar(overrides = {}) {
  return {
    fetchFeed: async () => ({ casts: [{ hash: '0xfeed', text: 'hello <b>world</b>', author: { username: 'alice', display_name: 'Alice' }, reactions: { likes_count: 2 } }], nextCursor: null }),
    fetchTrendingFeed: async () => ({ casts: [{ hash: '0xtrend', text: 'trend', author: { username: 'bob' } }], nextCursor: 'next' }),
    fetchUserByUsername: async (username) => ({ fid: 1, username, display_name: 'Alice', bio: 'builder' }),
    fetchUserByFid: async (fid) => ({ fid: Number(fid), username: 'fiduser', display_name: 'FID User' }),
    fetchCastByHash: async (hash) => ({ cast: { hash, text: 'thread root', author: { username: 'alice' } }, replies: [{ hash: '0xreply', text: 'reply', author: { username: 'bob' } }] }),
    searchCasts: async () => ({ casts: [{ hash: '0xsearch', text: 'search result', author: { username: 'carol' } }], nextCursor: null }),
    searchUsers: async () => ({ users: [{ fid: 2, username: 'carol', display_name: 'Carol' }] }),
    ...overrides
  }
}

test('health route returns ok', async () => {
  const app = createApp({ neynarClient: mockNeynar(), config: { defaultFeed: 'builders', apiKey: 'test' } })
  const res = await request(app).get('/healthz').expect(200)
  assert.equal(res.text, 'ok')
})

test('about route renders no-build positioning', async () => {
  const app = createApp({ neynarClient: mockNeynar(), config: { defaultFeed: 'builders', apiKey: 'test' } })
  const res = await request(app).get('/about').expect(200)
  assert.match(res.text, /No-build Farcaster client/)
})

test('home route renders escaped feed cards and no api key', async () => {
  const app = createApp({ neynarClient: mockNeynar(), config: { defaultFeed: 'builders', apiKey: 'super-secret-key' } })
  const res = await request(app).get('/').expect(200)
  assert.match(res.text, /Alice/)
  assert.match(res.text, /hello &lt;b&gt;world&lt;\/b&gt;/)
  assert.doesNotMatch(res.text, /super-secret-key/)
  assert.match(res.text, /Open in Farcaster/)
})

test('feed route rejects unknown feed ids', async () => {
  const app = createApp({ neynarClient: mockNeynar(), config: { defaultFeed: 'builders', apiKey: 'test' } })
  await request(app).get('/feed/nope').expect(404)
})

test('profile, cast, and search routes render server-side pages', async () => {
  const app = createApp({ neynarClient: mockNeynar(), config: { defaultFeed: 'builders', apiKey: 'test' } })
  assert.match((await request(app).get('/u/alice').expect(200)).text, /builder/)
  assert.match((await request(app).get('/fid/1').expect(200)).text, /FID User/)
  assert.match((await request(app).get('/cast/0xabc').expect(200)).text, /thread root/)
  assert.match((await request(app).get('/search?q=base&type=casts').expect(200)).text, /search result/)
  assert.match((await request(app).get('/search?q=carol&type=users').expect(200)).text, /Carol/)
})

test('missing api key renders setup state instead of provider call', async () => {
  const app = createApp({ neynarClient: mockNeynar({ fetchFeed: async () => { throw new Error('should not call') } }), config: { defaultFeed: 'builders', apiKey: '' } })
  const res = await request(app).get('/').expect(200)
  assert.match(res.text, /NEYNAR_API_KEY/)
})

test('no generic provider proxy exists', async () => {
  const app = createApp({ neynarClient: mockNeynar(), config: { defaultFeed: 'builders', apiKey: 'test' } })
  await request(app).get('/api/neynar/v2/farcaster/feed').expect(404)
})
