function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' https: data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'",
    "connect-src 'self'"
  ].join('; '))
  next()
}

function createRateLimiter({ windowMs = 60_000, max = 120 } = {}) {
  const hits = new Map()
  return function rateLimiter(req, res, next) {
    const now = Date.now()
    const key = req.ip || req.socket?.remoteAddress || 'local'
    const bucket = hits.get(key) || { count: 0, resetAt: now + windowMs }
    if (now > bucket.resetAt) {
      bucket.count = 0
      bucket.resetAt = now + windowMs
    }
    bucket.count += 1
    hits.set(key, bucket)
    res.setHeader('RateLimit-Limit', String(max))
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)))
    if (bucket.count > max) return res.status(429).type('text/plain').send('Too many requests')
    next()
  }
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
  if (/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);/i.test(value)) return true
  return isSafeExternalUrl(value)
}

module.exports = { securityHeaders, createRateLimiter, isSafeExternalUrl, isSafeImageUrl }
