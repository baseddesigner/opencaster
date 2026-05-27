const test = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')

const { createApp } = require('../src/app')

function mockProvider(overrides = {}) {
  return {
    name: 'mock',
    ready: true,
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

const baseConfig = { nodeEnv: 'test', defaultFeed: 'builders', provider: 'mock', apiKey: 'test', cacheTtlSeconds: 60, providerReady: true, isLiveProvider: false }

test('health route returns ok', async () => {
  const app = createApp({ provider: mockProvider(), config: baseConfig })
  const res = await request(app).get('/healthz').expect(200)
  assert.equal(res.text, 'ok')
})

test('about route renders production positioning and setup status', async () => {
  const app = createApp({ provider: mockProvider(), config: baseConfig })
  const res = await request(app).get('/about').expect(200)
  assert.match(res.text, /Production-ready Farcaster client/)
  assert.match(res.text, /No app-side writes/)
})

test('home route renders escaped feed cards, filters, and no api key', async () => {
  const app = createApp({ provider: mockProvider(), config: { ...baseConfig, apiKey: 'super-secret-key' } })
  const res = await request(app).get('/').expect(200)
  assert.match(res.text, /Alice/)
  assert.match(res.text, /hello &lt;b&gt;world&lt;\/b&gt;/)
  assert.match(res.text, /Ranking/)
  assert.match(res.text, /Open in Farcaster/)
  assert.doesNotMatch(res.text, /super-secret-key/)
})

test('demo mode renders usable pages with no env vars or injected provider', async () => {
  const app = createApp({ config: { nodeEnv: 'production', provider: 'demo', defaultFeed: 'builders', apiKey: '', cacheTtlSeconds: 60, providerReady: true, isLiveProvider: false } })
  assert.match((await request(app).get('/').expect(200)).text, /Clawlinker/)
  assert.match((await request(app).get('/feed/agents').expect(200)).text, /Agents/)
  assert.match((await request(app).get('/u/clawlinker').expect(200)).text, /Agent building/)
  assert.match((await request(app).get('/fid/22945').expect(200)).text, /clawlinker/)
  assert.match((await request(app).get('/cast/demo-001').expect(200)).text, /Replies/)
  assert.match((await request(app).get('/search?q=x402&type=casts').expect(200)).text, /x402/)
  assert.match((await request(app).get('/search?q=max&type=users').expect(200)).text, /baseddesigner/)
})

test('live provider missing credentials renders setup state instead of crashing', async () => {
  const app = createApp({ config: { nodeEnv: 'production', provider: 'neynar', defaultFeed: 'builders', apiKey: '', cacheTtlSeconds: 60, providerReady: false, isLiveProvider: true, providerSetupMessage: 'NEYNAR_API_KEY is missing.' } })
  const res = await request(app).get('/').expect(200)
  assert.match(res.text, /NEYNAR_API_KEY is missing/)
})

test('feed route rejects unknown feed ids', async () => {
  const app = createApp({ provider: mockProvider(), config: baseConfig })
  await request(app).get('/feed/nope').expect(404)
})

test('profile, cast, and search routes render server-side pages', async () => {
  const app = createApp({ provider: mockProvider(), config: baseConfig })
  assert.match((await request(app).get('/u/alice').expect(200)).text, /builder/)
  assert.match((await request(app).get('/fid/1').expect(200)).text, /FID User/)
  assert.match((await request(app).get('/cast/0xabc').expect(200)).text, /thread root/)
  assert.match((await request(app).get('/search?q=base&type=casts').expect(200)).text, /search result/)
  assert.match((await request(app).get('/search?q=carol&type=users').expect(200)).text, /Carol/)
})

test('no generic provider proxy exists', async () => {
  const app = createApp({ provider: mockProvider(), config: baseConfig })
  await request(app).get('/api/neynar/v2/farcaster/feed').expect(404)
  await request(app).get('/api/hypersnap/v2/farcaster/feed').expect(404)
})


test('thread page renders parent context and search supports continuation plus local profiles', async () => {
  const app = createApp({ config: { nodeEnv: 'production', provider: 'demo', defaultFeed: 'builders', apiKey: '', cacheTtlSeconds: 60, providerReady: true, isLiveProvider: false } })
  const thread = await request(app).get('/cast/demo-001-r1').expect(200)
  assert.match(thread.text, /Parent context/)
  assert.match(thread.text, /demo-001/)

  const search = await request(app).get('/search?q=base&type=casts').expect(200)
  assert.match(search.text, /More results/)

  const users = await request(app).get('/search?q=max&type=users').expect(200)
  assert.match(users.text, /href="\/u\/baseddesigner"/)
})
