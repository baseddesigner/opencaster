const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const { loadConfig, FEEDS, loadFeedPresets, resolveFeedId } = require('../src/config')

test('loadConfig defaults to no-secret demo provider and configured feeds', () => {
  const config = loadConfig({ NODE_ENV: 'test' })
  assert.equal(config.port, 3039)
  assert.equal(config.host, '127.0.0.1')
  assert.equal(config.defaultFeed, 'builders')
  assert.ok(config.feeds.builders)
  assert.ok(config.feeds.markets)
  assert.ok(config.feeds.art)
  assert.ok(config.feeds.protocol)
  assert.equal(config.cacheTtlSeconds, 60)
  assert.equal(config.provider, 'demo')
  assert.equal(config.apiKey, '')
  assert.equal(config.isLiveProvider, false)
  assert.ok(FEEDS.builders)
  assert.ok(FEEDS.agents)
  assert.ok(FEEDS.markets)
  assert.ok(FEEDS.art)
  assert.ok(FEEDS.protocol)
  assert.ok(FEEDS.trending)
})

test('loadConfig never requires env vars for production demo mode', () => {
  const config = loadConfig({ NODE_ENV: 'production', FARCASTER_PROVIDER: 'demo', NEYNAR_API_KEY: '' })
  assert.equal(config.nodeEnv, 'production')
  assert.equal(config.provider, 'demo')
  assert.equal(config.isLiveProvider, false)
})

test('loadConfig keeps Neynar optional and reports setup state when missing key', () => {
  const config = loadConfig({ NODE_ENV: 'production', FARCASTER_PROVIDER: 'neynar', NEYNAR_API_KEY: '' })
  assert.equal(config.provider, 'neynar')
  assert.equal(config.isLiveProvider, true)
  assert.equal(config.providerReady, false)
  assert.match(config.providerSetupMessage, /NEYNAR_API_KEY/)
})

test('loadConfig accepts explicit live provider values', () => {
  const config = loadConfig({
    NODE_ENV: 'development',
    FARCASTER_PROVIDER: 'neynar',
    NEYNAR_API_KEY: 'secret',
    PORT: '4444',
    HOST: '127.0.0.2',
    DEFAULT_FEED: 'agents',
    CACHE_TTL_SECONDS: '5',
    PUBLIC_BASE_URL: 'https://example.com',
    TRUST_PROXY: 'loopback'
  })
  assert.equal(config.apiKey, 'secret')
  assert.equal(config.provider, 'neynar')
  assert.equal(config.providerReady, true)
  assert.equal(config.port, 4444)
  assert.equal(config.host, '127.0.0.2')
  assert.equal(config.defaultFeed, 'agents')
  assert.equal(config.cacheTtlSeconds, 5)
  assert.equal(config.publicBaseUrl, 'https://example.com')
  assert.equal(config.trustProxy, 'loopback')
})


test('loadConfig accepts no-key Hypersnap live provider with safe default base URL', () => {
  const config = loadConfig({ NODE_ENV: 'production', FARCASTER_PROVIDER: 'hypersnap' })
  assert.equal(config.provider, 'hypersnap')
  assert.equal(config.providerReady, true)
  assert.equal(config.isLiveProvider, true)
  assert.equal(config.hypersnapBaseUrl, 'https://haatz.quilibrium.com')
  assert.equal(config.providerSetupMessage, '')
})

test('loadConfig rejects non-HTTPS Hypersnap base URLs', () => {
  assert.throws(() => loadConfig({
    NODE_ENV: 'production',
    FARCASTER_PROVIDER: 'hypersnap',
    HYPERSNAP_BASE_URL: 'http://haatz.quilibrium.com'
  }), /HYPERSNAP_BASE_URL must use https/)
})

test('loadConfig rejects Hypersnap hosts outside the configured allowlist', () => {
  assert.throws(() => loadConfig({
    NODE_ENV: 'production',
    FARCASTER_PROVIDER: 'hypersnap',
    HYPERSNAP_BASE_URL: 'https://metadata.google.internal'
  }), /HYPERSNAP_BASE_URL host is not allowed/)

  const config = loadConfig({
    NODE_ENV: 'production',
    FARCASTER_PROVIDER: 'hypersnap',
    HYPERSNAP_BASE_URL: 'https://custom-hypersnap.example/',
    HYPERSNAP_ALLOWED_HOSTS: 'haatz.quilibrium.com, custom-hypersnap.example'
  })
  assert.equal(config.hypersnapBaseUrl, 'https://custom-hypersnap.example')
  assert.deepEqual(config.hypersnapAllowedHosts, ['haatz.quilibrium.com', 'custom-hypersnap.example'])
})

test('loadConfig accepts contributor-defined feed preset files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencaster-feeds-'))
  const presetFile = path.join(tmpDir, 'feed-presets.json')
  fs.writeFileSync(presetFile, JSON.stringify({
    local: {
      label: 'Local',
      shortLabel: 'Local',
      description: 'Local custom search terms.',
      mode: 'search',
      query: 'local custom farcaster terms',
      fallback: 'trending',
      accent: 'Local watch'
    },
    trending: {
      label: 'Trending',
      mode: 'trending',
      description: 'Network pulse.'
    }
  }))

  const config = loadConfig({ NODE_ENV: 'test', FEED_PRESETS_FILE: presetFile, DEFAULT_FEED: 'local' })
  assert.equal(config.defaultFeed, 'local')
  assert.equal(config.feedPresetsFile, presetFile)
  assert.equal(config.feeds.local.query, 'local custom farcaster terms')
  assert.equal(config.feeds.local.shortLabel, 'Local')
  assert.equal(config.feeds.trending.mode, 'trending')
})

test('feed presets validate search queries and legacy aliases', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencaster-bad-feeds-'))
  const presetFile = path.join(tmpDir, 'feed-presets.json')
  fs.writeFileSync(presetFile, JSON.stringify({
    broken: {
      label: 'Broken',
      mode: 'search',
      description: 'Missing query.'
    }
  }))

  assert.throws(() => loadFeedPresets(presetFile), /search feed presets require a query/)
  assert.equal(resolveFeedId('traders', FEEDS), 'markets')
  assert.equal(resolveFeedId('collectors', FEEDS), 'art')
})
