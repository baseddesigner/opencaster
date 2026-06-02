const { ProviderError } = require('../lib/errors')
const { normalizeHttpsBaseUrl } = require('../lib/url')

function createHypersnapClient({
  baseUrl = 'https://haatz.quilibrium.com',
  publicFarcasterBaseUrl = 'https://api.farcaster.xyz',
  viewerFid = 1325,
  fetchImpl = global.fetch,
  timeoutMs = 8000,
  now = Date.now
} = {}) {
  if (!fetchImpl) throw new Error('fetch implementation is required')
  const cleanBaseUrl = normalizeHttpsBaseUrl(baseUrl || 'https://haatz.quilibrium.com', 'Hypersnap base URL')
  const cleanPublicFarcasterBaseUrl = normalizeHttpsBaseUrl(publicFarcasterBaseUrl || 'https://api.farcaster.xyz', 'Public Farcaster base URL')
  const health = {
    baseUrl: cleanBaseUrl,
    upstreamLatencyMs: null,
    lastSuccessAt: '',
    lastErrorAt: '',
    lastError: '',
    responseShapeHealth: {
      status: 'unknown',
      endpoint: '',
      checkedAt: '',
      message: 'No Hypersnap response checked yet.'
    }
  }

  async function requestUrl(url, { validateShape = true } = {}) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const startedAt = now()
    try {
      const res = await fetchImpl(url.toString(), {
        headers: {
          accept: 'application/json',
          'user-agent': 'farcaster-lite-client/0.1'
        },
        signal: controller.signal
      })
      if (!res.ok) {
        const message = `Hypersnap request failed with status ${res.status}`
        recordError(message, res.status)
        throw new ProviderError(message, { status: res.status })
      }
      try {
        const payload = await res.json()
        const finishedAt = now()
        const shape = assessResponseShape(url, payload, iso(finishedAt))
        health.responseShapeHealth = shape
        health.upstreamLatencyMs = Math.max(0, finishedAt - startedAt)
        if (validateShape && shape.status === 'error') {
          recordError(shape.message, 502, finishedAt)
          throw new ProviderError(shape.message, { status: 502 })
        }
        recordSuccess(finishedAt)
        return payload
      } catch (err) {
        if (err instanceof ProviderError) throw err
        health.responseShapeHealth = {
          status: 'error',
          endpoint: new URL(url.toString()).pathname,
          checkedAt: iso(now()),
          message: 'Hypersnap returned malformed JSON.'
        }
        recordError('Hypersnap returned malformed JSON.', 502)
        throw new ProviderError('Hypersnap returned malformed JSON.', { cause: err })
      }
    } catch (err) {
      if (err instanceof ProviderError) throw err
      const message = err?.name === 'AbortError'
        ? 'Hypersnap is slow right now. Try again in a minute.'
        : 'Hypersnap data is unavailable right now. Try again in a minute.'
      recordError(message, err?.name === 'AbortError' ? 504 : 502)
      throw new ProviderError(message, { cause: err })
    } finally {
      clearTimeout(timer)
    }
  }

  async function requestFrom(base, path, params = {}, options = {}) {
    const url = new URL(path, base)
    for (const [key, value] of Object.entries(params || {})) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
    }
    return requestUrl(url, options)
  }

  async function request(path, params = {}, options = {}) {
    return requestFrom(cleanBaseUrl, path, params, options)
  }

  async function requestPublicFarcaster(path, params = {}, options = {}) {
    return requestFrom(cleanPublicFarcasterBaseUrl, path, params, options)
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
      const payload = await request('/v2/farcaster/cast/search', { q: query, limit, cursor }, { validateShape: false })
      if (hasCasts(payload)) return payload
      return requestPublicFarcaster('/v2/search-casts', { q: query, limit, cursor })
    },
    async searchUsers(query, { limit = 20, cursor } = {}) {
      return request('/v2/farcaster/user/search', { q: query, limit, cursor })
    },
    async healthCheck() {
      try {
        await request('/v1/info')
        return { ready: true, status: 200, ...diagnosticSnapshot() }
      } catch (err) {
        return { ready: false, status: err.status || 502, message: err.message, ...diagnosticSnapshot() }
      }
    },
    diagnostics() {
      return {
        name: 'hypersnap',
        ready: true,
        mode: 'live-provider',
        liveData: true,
        noKeyRequired: true,
        viewerFid,
        ...diagnosticSnapshot()
      }
    }
  }

  function recordSuccess(timestamp = now()) {
    health.lastSuccessAt = iso(timestamp)
    health.lastErrorAt = ''
    health.lastError = ''
  }

  function recordError(message, status, timestamp = now()) {
    health.lastErrorAt = iso(timestamp)
    health.lastError = message || `Hypersnap request failed with status ${status || 502}`
  }

  function diagnosticSnapshot() {
    return {
      baseUrl: health.baseUrl,
      upstreamLatencyMs: health.upstreamLatencyMs,
      lastSuccessAt: health.lastSuccessAt,
      lastErrorAt: health.lastErrorAt,
      lastError: health.lastError,
      responseShapeHealth: { ...health.responseShapeHealth }
    }
  }
}

function assessResponseShape(url, payload, checkedAt) {
  const endpoint = new URL(url.toString()).pathname
  const ok = (message) => ({ status: 'ok', endpoint, checkedAt, message })
  const error = (message) => ({ status: 'error', endpoint, checkedAt, message })
  const isObject = payload && typeof payload === 'object' && !Array.isArray(payload)
  const hasArray = (...values) => values.some((value) => Array.isArray(value))

  if (endpoint === '/v1/info') {
    return isObject
      ? ok('Hypersnap response shape matched expected /v1/info object.')
      : error('Hypersnap response shape did not match expected /v1/info object.')
  }
  if (endpoint.includes('/feed') || endpoint.includes('/cast/search') || endpoint.includes('/search-casts')) {
    return isObject && hasArray(payload.casts, payload.result?.casts, payload.feed)
      ? ok('Hypersnap response shape matched expected cast collection.')
      : error('Hypersnap response shape did not include a cast collection.')
  }
  if (endpoint.includes('/user/search')) {
    return isObject && hasArray(payload.users, payload.result?.users)
      ? ok('Hypersnap response shape matched expected user collection.')
      : error('Hypersnap response shape did not include a user collection.')
  }
  if (endpoint.includes('/user/by_username') || endpoint.includes('/user/bulk')) {
    return isObject && (payload.user || payload.result?.user || hasArray(payload.users, payload.result?.users))
      ? ok('Hypersnap response shape matched expected user payload.')
      : error('Hypersnap response shape did not include a user payload.')
  }
  if (endpoint.includes('/cast/conversation') || endpoint.includes('/cast')) {
    return isObject && (payload.cast || payload.result?.cast || payload.conversation?.cast)
      ? ok('Hypersnap response shape matched expected cast payload.')
      : error('Hypersnap response shape did not include a cast payload.')
  }
  return isObject ? ok('Hypersnap response shape was JSON object.') : error('Hypersnap response shape was not a JSON object.')
}

function iso(value) {
  return new Date(value).toISOString()
}

module.exports = { createHypersnapClient }
