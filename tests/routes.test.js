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
  assert.match((await request(app).get('/cast/demo-001').expect(200)).text, /Reply context/)
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

test('feed route supports read-only Nook-style display modes and shortcut chrome', async () => {
  const app = createApp({
    provider: mockProvider({
      fetchFeed: async () => ({
        casts: [
          { hash: '0ximage111', text: 'image cast', author: { username: 'alice' }, embeds: [{ url: 'https://example.com/art.jpg' }] },
          { hash: '0xframe222', text: 'frame cast', author: { username: 'bob' }, embeds: [{ url: 'https://frames.example/app', metadata: { html: { frame: { version: 'vNext' }, ogTitle: 'Frame app' } } }] },
          { hash: '0xplain333', text: 'plain cast', author: { username: 'carol' } }
        ],
        nextCursor: null
      })
    }),
    config: baseConfig
  })

  const media = await request(app).get('/feed/builders?mode=media').expect(200)
  assert.match(media.text, /Display/)
  assert.match(media.text, /data-cast-card/)
  assert.match(media.text, /image cast/)
  assert.doesNotMatch(media.text, /plain cast/)

  const frames = await request(app).get('/feed/builders?mode=frames').expect(200)
  assert.match(frames.text, /frame cast/)
  assert.doesNotMatch(frames.text, /image cast/)
})

test('search supports from:username cast filtering and type tabs', async () => {
  const calls = []
  const app = createApp({
    provider: mockProvider({
      searchCasts: async (query, options) => {
        calls.push({ query, authorUsername: options.authorUsername })
        return { casts: [{ hash: '0xsearch', text: `${query} by ${options.authorUsername}`, author: { username: options.authorUsername } }], nextCursor: null }
      }
    }),
    config: baseConfig
  })

  const res = await request(app).get('/search?q=from:alice%20base&type=casts').expect(200)
  assert.deepEqual(calls, [{ query: 'base', authorUsername: 'alice' }])
  assert.match(res.text, /from:alice base/)
  assert.match(res.text, /Search type/)
  assert.match(res.text, /by alice/)
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

test('cast route renders discovery modules with author, related, parent, replies, embeds, and why metadata', async () => {
  const calls = []
  const app = createApp({
    provider: mockProvider({
      fetchCastByHash: async (hash) => ({
        cast: {
          hash,
          text: 'Hypersnap protocol clients need better context',
          author: { fid: 42, username: 'alice' },
          embeds: [{ url: 'https://example.com/context', title: 'Context link' }]
        },
        parent: { hash: '0xparent12', text: 'parent cast', author: { username: 'parent' } },
        replies: [{ hash: '0xreply123', text: 'reply cast', author: { username: 'bob' } }]
      }),
      fetchUserCasts: async ({ fid }) => {
        calls.push(['author', fid])
        return { casts: [{ hash: '0xauthor12', text: 'author recent cast', author: { username: 'alice' } }] }
      },
      searchCasts: async (query) => {
        calls.push(['related', query])
        return { casts: [{ hash: '0xrelated1', text: 'related cast', author: { username: 'carol' } }] }
      }
    }),
    config: baseConfig
  })

  const res = await request(app).get('/cast/0xabcdef12').expect(200)
  assert.match(res.text, /Parent context/)
  assert.match(res.text, /Reply context/)
  assert.match(res.text, /Links and embeds/)
  assert.match(res.text, /Author's recent casts/)
  assert.match(res.text, /Related casts/)
  assert.match(res.text, /Why shown/)
  assert.match(res.text, /Linked or embedded in this cast/)
  assert.match(res.text, /author recent cast/)
  assert.match(res.text, /related cast/)
  assert.deepEqual(calls[0], ['author', 42])
})

test('profile route renders explainable recent and related discovery modules', async () => {
  const app = createApp({
    provider: mockProvider({
      fetchUserByUsername: async () => ({ fid: 42, username: 'alice', display_name: 'Alice', bio: 'Hypersnap protocol client context' }),
      fetchUserCasts: async () => ({ casts: [{ hash: '0xauthored1', text: 'authored protocol cast', author: { username: 'alice' } }] }),
      searchCasts: async () => ({ casts: [{ hash: '0xrelated1', text: 'related protocol cast', author: { username: 'bob' } }] })
    }),
    config: baseConfig
  })

  const res = await request(app).get('/u/alice').expect(200)
  assert.match(res.text, /Author's recent casts/)
  assert.match(res.text, /Authored by @alice/)
  assert.match(res.text, /Related casts/)
  assert.match(res.text, /related protocol cast/)
  assert.match(res.text, /Why shown/)
})

test('profile route supports media display mode for authored casts', async () => {
  const app = createApp({
    provider: mockProvider({
      fetchUserByUsername: async () => ({ fid: 42, username: 'alice', display_name: 'Alice' }),
      fetchUserCasts: async () => ({ casts: [
        { hash: '0xmedia111', text: 'media profile cast', author: { username: 'alice' }, embeds: [{ url: 'https://example.com/a.png' }] },
        { hash: '0xplain111', text: 'plain profile cast', author: { username: 'alice' } }
      ] }),
      searchCasts: async () => ({ casts: [] })
    }),
    config: baseConfig
  })

  const res = await request(app).get('/u/alice?mode=media').expect(200)
  assert.match(res.text, /Display/)
  assert.match(res.text, /media profile cast/)
  assert.doesNotMatch(res.text, /plain profile cast/)
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

test('feed lab rejects unknown feed ids instead of silently defaulting', async () => {
  const app = createApp({ provider: mockProvider(), config: baseConfig })
  const res = await request(app).get('/lab?feed=nope').expect(404)
  assert.match(res.text, /Feed not found/)
})

test('feed and lab reuse cached provider payloads across presentation modes', async () => {
  let fetches = 0
  const app = createApp({
    provider: mockProvider({
      fetchFeed: async () => {
        fetches += 1
        return {
          casts: [{ hash: '0xaaaabbbb', text: 'shared feed cast', author: { username: 'alice' } }],
          nextCursor: null
        }
      }
    }),
    config: baseConfig
  })

  await request(app).get('/feed/builders').expect(200)
  await request(app).get('/lab?feed=builders').expect(200)
  assert.equal(fetches, 1)
})

test('feed lab renders setup state when provider is unavailable', async () => {
  const app = createApp({
    config: { nodeEnv: 'production', provider: 'neynar', defaultFeed: 'builders', apiKey: '', cacheTtlSeconds: 60, providerReady: false, isLiveProvider: true, providerSetupMessage: 'NEYNAR_API_KEY is missing.' }
  })
  const res = await request(app).get('/lab').expect(200)
  assert.match(res.text, /Feed Lab/)
  assert.match(res.text, /NEYNAR_API_KEY is missing/)
})
