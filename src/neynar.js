const { ProviderError } = require('./lib/errors')

function createNeynarClient({ apiKey, baseUrl = 'https://api.neynar.com', fetchImpl = global.fetch, timeoutMs = 8000 } = {}) {
  if (!fetchImpl) throw new Error('fetch implementation is required')

  async function request(path, params = {}) {
    if (!apiKey) throw new ProviderError('NEYNAR_API_KEY is missing. Add it to .env to load Farcaster data.', { status: 500 })
    const url = new URL(path, baseUrl)
    for (const [key, value] of Object.entries(params || {})) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetchImpl(url.toString(), {
        headers: { 'x-api-key': apiKey, accept: 'application/json' },
        signal: controller.signal
      })
      if (!res.ok) {
        throw new ProviderError(`Neynar request failed with status ${res.status}`, { status: res.status })
      }
      return await res.json()
    } catch (err) {
      if (err instanceof ProviderError) throw err
      throw new ProviderError('Farcaster data is slow right now. Try again in a minute.', { cause: err })
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    request,
    async fetchFeed({ limit = 20, cursor, query } = {}) {
      if (query) return this.searchCasts(query, { limit, cursor })
      return this.fetchTrendingFeed({ limit, cursor })
    },
    async fetchTrendingFeed({ limit = 20, cursor } = {}) {
      return request('/v2/farcaster/feed/trending', { limit, cursor })
    },
    async fetchUserByUsername(username) {
      const payload = await request('/v2/farcaster/user/by_username', { username })
      return payload.user || payload.result?.user || payload
    },
    async fetchUserByFid(fid) {
      const payload = await request('/v2/farcaster/user/bulk', { fids: fid })
      return payload.users?.[0] || payload.result?.users?.[0] || payload.user || payload
    },
    async fetchCastByHash(hash) {
      return request('/v2/farcaster/cast', { identifier: hash, type: 'hash' })
    },
    async searchCasts(query, { limit = 20, cursor } = {}) {
      return request('/v2/farcaster/cast/search', { q: query, limit, cursor })
    },
    async searchUsers(query, { limit = 20 } = {}) {
      return request('/v2/farcaster/user/search', { q: query, limit })
    }
  }
}

module.exports = { createNeynarClient }
