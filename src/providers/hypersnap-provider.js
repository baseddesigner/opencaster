const { ProviderError } = require('../lib/errors')

function createHypersnapClient({
  baseUrl = 'https://haatz.quilibrium.com',
  publicFarcasterBaseUrl = 'https://api.farcaster.xyz',
  viewerFid = 1325,
  fetchImpl = global.fetch,
  timeoutMs = 8000
} = {}) {
  if (!fetchImpl) throw new Error('fetch implementation is required')
  const cleanBaseUrl = normalizeHttpsBaseUrl(baseUrl || 'https://haatz.quilibrium.com', 'Hypersnap base URL')
  const cleanPublicFarcasterBaseUrl = normalizeHttpsBaseUrl(publicFarcasterBaseUrl || 'https://api.farcaster.xyz', 'Public Farcaster base URL')

  async function requestUrl(url) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetchImpl(url.toString(), {
        headers: {
          accept: 'application/json',
          'user-agent': 'farcaster-lite-client/0.1'
        },
        signal: controller.signal
      })
      if (!res.ok) {
        throw new ProviderError(`Hypersnap request failed with status ${res.status}`, { status: res.status })
      }
      try {
        return await res.json()
      } catch (err) {
        throw new ProviderError('Hypersnap returned malformed JSON.', { cause: err })
      }
    } catch (err) {
      if (err instanceof ProviderError) throw err
      const message = err?.name === 'AbortError'
        ? 'Hypersnap is slow right now. Try again in a minute.'
        : 'Hypersnap data is unavailable right now. Try again in a minute.'
      throw new ProviderError(message, { cause: err })
    } finally {
      clearTimeout(timer)
    }
  }

  async function requestFrom(base, path, params = {}) {
    const url = new URL(path, base)
    for (const [key, value] of Object.entries(params || {})) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
    }
    return requestUrl(url)
  }

  async function request(path, params = {}) {
    return requestFrom(cleanBaseUrl, path, params)
  }

  async function requestPublicFarcaster(path, params = {}) {
    return requestFrom(cleanPublicFarcasterBaseUrl, path, params)
  }

  function hasCasts(payload = {}) {
    const casts = payload.casts || payload.result?.casts || payload.feed
    return Array.isArray(casts) && casts.length > 0
  }

  async function fallbackToViewerFeed({ limit = 20, cursor } = {}) {
    return request('/v2/farcaster/feed', { fid: viewerFid, limit, cursor })
  }

  return {
    name: 'hypersnap',
    ready: true,
    setupMessage: '',
    request,
    async fetchFeed({ limit = 20, cursor, query, fid } = {}) {
      if (query) return this.searchCasts(query, { limit, cursor })
      return this.fetchUserCasts({ fid: fid || viewerFid, limit, cursor })
    },
    async fetchUserCasts({ fid, limit = 20, cursor } = {}) {
      return request('/v2/farcaster/feed', { fid: fid || viewerFid, limit, cursor })
    },
    async fetchTrendingFeed({ limit = 20, cursor } = {}) {
      try {
        return await request('/v2/farcaster/feed/trending', { limit, cursor })
      } catch (_) {
        return fallbackToViewerFeed({ limit, cursor })
      }
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
      return request('/v2/farcaster/cast/conversation', { identifier: hash, type: 'hash', reply_depth: 2 })
    },
    async searchCasts(query, { limit = 20, cursor } = {}) {
      const payload = await request('/v2/farcaster/cast/search', { q: query, limit, cursor })
      if (hasCasts(payload)) return payload
      return requestPublicFarcaster('/v2/search-casts', { q: query, limit, cursor })
    },
    async searchUsers(query, { limit = 20, cursor } = {}) {
      return request('/v2/farcaster/user/search', { q: query, limit, cursor })
    },
    async healthCheck() {
      try {
        await request('/v1/info')
        return { ready: true, status: 200 }
      } catch (err) {
        return { ready: false, status: err.status || 502, message: err.message }
      }
    },
    diagnostics() {
      return {
        name: 'hypersnap',
        ready: true,
        mode: 'live-provider',
        liveData: true,
        noKeyRequired: true,
        baseUrl: cleanBaseUrl,
        viewerFid
      }
    }
  }
}

function normalizeHttpsBaseUrl(value, label) {
  const parsed = new URL(String(value || ''))
  if (parsed.protocol !== 'https:') throw new Error(`${label} must use https.`)
  return parsed.toString().replace(/\/+$/, '')
}

module.exports = { createHypersnapClient }
