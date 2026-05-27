const test = require('node:test')
const assert = require('node:assert/strict')

const { createCache } = require('../src/cache')

test('cache calls producer once inside TTL', async () => {
  const cache = createCache()
  let calls = 0
  const first = await cache.cached('key', 1000, async () => ++calls)
  const second = await cache.cached('key', 1000, async () => ++calls)
  assert.equal(first, 1)
  assert.equal(second, 1)
  assert.equal(calls, 1)
})

test('cache can be cleared for tests', async () => {
  const cache = createCache()
  let calls = 0
  await cache.cached('key', 1000, async () => ++calls)
  cache.clear()
  const second = await cache.cached('key', 1000, async () => ++calls)
  assert.equal(second, 2)
})

test('cache does not cache thrown errors', async () => {
  const cache = createCache()
  let calls = 0
  await assert.rejects(() => cache.cached('bad', 1000, async () => { calls++; throw new Error('boom') }))
  await assert.rejects(() => cache.cached('bad', 1000, async () => { calls++; throw new Error('boom') }))
  assert.equal(calls, 2)
})
