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

test('feed routes use configured presets and legacy aliases', async () => {
  const calls = []
  const app = createApp({
    provider: mockProvider({
      fetchFeed: async ({ feedId, query }) => {
        calls.push({ feedId, query })
        return { casts: [{ hash: '0xfeed1234', text: `${feedId} ${query}`, author: { username: 'alice' } }], nextCursor: null }
      }
    }),
    config: {
      ...baseConfig,
      defaultFeed: 'local',
      feeds: {
        local: {
          label: 'Local',
          shortLabel: 'Local',
          description: 'Local custom terms.',
          mode: 'search',
          query: 'local custom farcaster terms',
          fallback: 'trending',
          accent: 'Local watch'
        },
        markets: {
          label: 'Markets',
          shortLabel: 'Markets',
          description: 'Market lane.',
          mode: 'search',
          query: 'base token markets',
          fallback: 'trending',
          accent: 'Market tape'
        },
        trending: {
          label: 'Trending',
          description: 'Network pulse.',
          mode: 'trending'
        }
      }
    }
  })

  const home = await request(app).get('/').expect(200)
  assert.match(home.text, /Local/)
  assert.match(home.text, /local custom farcaster terms/)

  const alias = await request(app).get('/feed/traders').expect(200)
  assert.match(alias.text, /Markets/)
  assert.deepEqual(calls.map((call) => call.feedId), ['local', 'markets'])
})

test('profile, cast, and search routes render server-side pages', async () => {
  const app = createApp({ provider: mockProvider(), config: baseConfig })
  assert.match((await request(app).get('/u/alice').expect(200)).text, /builder/)
  assert.match((await request(app).get('/fid/1').expect(200)).text, /FID User/)
  assert.match((await request(app).get('/cast/0xabcdef12').expect(200)).text, /thread root/)
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


test('profile route uses authored casts provider method instead of username search', async () => {
  const calls = []
  const app = createApp({
    provider: mockProvider({
      fetchUserByUsername: async () => ({ fid: 42, username: 'alice', display_name: 'Alice' }),
      fetchUserCasts: async ({ fid, limit }) => {
        calls.push({ fid, limit })
        return { casts: [{ hash: '0xauthored', text: 'authored cast', author: { username: 'alice' } }], nextCursor: null }
      },
      fetchFeed: async () => { throw new Error('profile must not use query search fallback when fetchUserCasts exists') }
    }),
    config: baseConfig
  })
  const res = await request(app).get('/u/alice').expect(200)
  assert.deepEqual(calls, [{ fid: 42, limit: 10 }])
  assert.match(res.text, /authored cast/)
})

test('routes reject invalid path/query params before provider calls', async () => {
  const app = createApp({ provider: mockProvider(), config: baseConfig })
  await request(app).get('/fid/not-a-number').expect(400)
  await request(app).get('/u/not valid').expect(400)
  await request(app).get('/cast/not-a-hash').expect(400)
  await request(app).get(`/search?q=base&type=casts&cursor=${'x'.repeat(241)}`).expect(400)
})


test('configured feed falls back when live search returns no casts', async () => {
  const calls = []
  const app = createApp({
    provider: mockProvider({
      fetchFeed: async () => { calls.push('search'); return { casts: [], nextCursor: null } },
      fetchTrendingFeed: async () => { calls.push('fallback'); return { casts: [{ hash: '0xfallback123', text: 'fallback trend', author: { username: 'bob' } }], nextCursor: null } }
    }),
    config: baseConfig
  })
  const res = await request(app).get('/feed/builders').expect(200)
  assert.deepEqual(calls, ['search', 'fallback'])
  assert.match(res.text, /fallback trend/)
})

test('feed lab renders explainable ranking modes', async () => {
  const app = createApp({
    provider: mockProvider({
      fetchFeed: async () => ({
        casts: [
          { hash: '0xaaaabbbb', text: 'like-heavy cast', author: { username: 'alice' }, replies: { count: 1 }, reactions: { likes_count: 20, recasts_count: 0 }, timestamp: '2026-01-01T00:00:00.000Z' },
          { hash: '0xbbbbcccc', text: 'reply-heavy cast', author: { username: 'bob' }, replies: { count: 9 }, reactions: { likes_count: 1, recasts_count: 0 }, timestamp: '2026-01-02T00:00:00.000Z' },
          { hash: '0xccccdddd', text: 'recast-heavy cast', author: { username: 'carol' }, replies: { count: 0 }, reactions: { likes_count: 0, recasts_count: 8 }, timestamp: '2026-01-03T00:00:00.000Z' }
        ],
        nextCursor: null
      })
    }),
    config: baseConfig
  })

  const likes = await request(app).get('/lab?feed=builders&mode=likes').expect(200)
  assert.match(likes.text, /Feed Lab/)
  assert.match(likes.text, /Score breakdown/)
  assert.match(likes.text, /OpenRank/)
  assert.ok(likes.text.indexOf('like-heavy cast') < likes.text.indexOf('reply-heavy cast'))

  const replies = await request(app).get('/lab?feed=builders&mode=replies').expect(200)
  assert.ok(replies.text.indexOf('reply-heavy cast') < replies.text.indexOf('like-heavy cast'))
})

test('feed lab renders setup state when provider is unavailable', async () => {
  const app = createApp({
    config: { nodeEnv: 'production', provider: 'neynar', defaultFeed: 'builders', apiKey: '', cacheTtlSeconds: 60, providerReady: false, isLiveProvider: true, providerSetupMessage: 'NEYNAR_API_KEY is missing.' }
  })
  const res = await request(app).get('/lab').expect(200)
  assert.match(res.text, /Feed Lab/)
  assert.match(res.text, /NEYNAR_API_KEY is missing/)
})
