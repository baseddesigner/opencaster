const { LRUCache } = require('lru-cache')

function createCache(options = {}) {
  const store = new LRUCache({ max: options.max || 500 })

  async function cached(key, ttlMs, producer) {
    if (store.has(key)) return store.get(key)
    const value = await producer()
    store.set(key, value, { ttl: ttlMs })
    return value
  }

  return {
    cached,
    clear: () => store.clear(),
    delete: (key) => store.delete(key)
  }
}

module.exports = { createCache }
