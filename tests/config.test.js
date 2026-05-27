const test = require('node:test')
const assert = require('node:assert/strict')

const { loadConfig, FEEDS } = require('../src/config')

test('loadConfig provides safe local defaults and configured feeds', () => {
  const config = loadConfig({ NODE_ENV: 'test' })
  assert.equal(config.port, 3039)
  assert.equal(config.host, '127.0.0.1')
  assert.equal(config.defaultFeed, 'builders')
  assert.equal(config.cacheTtlSeconds, 60)
  assert.ok(FEEDS.builders)
  assert.ok(FEEDS.agents)
  assert.ok(FEEDS.trending)
})

test('loadConfig requires NEYNAR_API_KEY in production', () => {
  assert.throws(
    () => loadConfig({ NODE_ENV: 'production', NEYNAR_API_KEY: '' }),
    /NEYNAR_API_KEY is required/
  )
})

test('loadConfig accepts explicit env values', () => {
  const config = loadConfig({
    NODE_ENV: 'development',
    NEYNAR_API_KEY: 'secret',
    PORT: '4444',
    HOST: '127.0.0.2',
    DEFAULT_FEED: 'agents',
    CACHE_TTL_SECONDS: '5',
    PUBLIC_BASE_URL: 'https://example.com'
  })
  assert.equal(config.apiKey, 'secret')
  assert.equal(config.port, 4444)
  assert.equal(config.host, '127.0.0.2')
  assert.equal(config.defaultFeed, 'agents')
  assert.equal(config.cacheTtlSeconds, 5)
  assert.equal(config.publicBaseUrl, 'https://example.com')
})
