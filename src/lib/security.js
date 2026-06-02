function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' https:",
    "style-src 'self'",
    "script-src 'self'",
    "connect-src 'self'"
  ].join('; '))
  next()
}

function createRateLimiter({ windowMs = 60_000, max = 120, maxKeys = 5_000, now = Date.now } = {}) {
  const hits = new Map()
  const keyLimit = Math.max(1, Number(maxKeys) || 5_000)
  const sweepExpired = (currentTime) => {
    for (const [key, bucket] of hits) {
      if (currentTime > bucket.resetAt) hits.delete(key)
    }
  }
  const trimOldest = () => {
    while (hits.size >= keyLimit) {
      const oldestKey = hits.keys().next().value
      if (oldestKey === undefined) break
      hits.delete(oldestKey)
    }
  }

  function rateLimiter(req, res, next) {
    const currentTime = now()
    const key = req.ip || req.socket?.remoteAddress || 'local'
    let bucket = hits.get(key)
    if (!bucket && hits.size >= keyLimit) sweepExpired(currentTime)
    if (!bucket && hits.size >= keyLimit) trimOldest()
    bucket = bucket || { count: 0, resetAt: currentTime + windowMs }
    if (currentTime > bucket.resetAt) {
      bucket.count = 0
      bucket.resetAt = currentTime + windowMs
    }
    bucket.count += 1
    hits.set(key, bucket)
    res.setHeader('RateLimit-Limit', String(max))
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)))
    if (bucket.count > max) return res.status(429).type('text/plain').send('Too many requests')
    next()
  }
  rateLimiter.storeSize = () => hits.size
  return rateLimiter
}

function isSafeExternalUrl(url) {
  try {
    const parsed = new URL(String(url || ''))
    return ['https:', 'http:'].includes(parsed.protocol)
  } catch (_) {
    return false
  }
}

function isSafeImageUrl(url) {
  const value = String(url || '')
  if (value.startsWith('/')) return true
  if (/^data:image\/(png|jpeg|jpg|gif|webp);/i.test(value)) return true
  return isSafeExternalUrl(value)
}

module.exports = { securityHeaders, createRateLimiter, isSafeExternalUrl, isSafeImageUrl }
