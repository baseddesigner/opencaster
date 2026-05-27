function compactCount(value) {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return '0'
  if (Math.abs(n) >= 1_000_000) return `${trimDecimal(n / 1_000_000)}m`
  if (Math.abs(n) >= 1_000) return `${trimDecimal(n / 1_000)}k`
  return String(Math.trunc(n))
}

function trimDecimal(value) {
  return value.toFixed(1).replace(/\.0$/, '')
}

function formatRelativeTime(timestamp, now = new Date()) {
  if (!timestamp) return 'now'
  const then = new Date(timestamp)
  if (Number.isNaN(then.getTime())) return 'now'
  const diff = Math.max(0, now.getTime() - then.getTime())
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo`
  return `${Math.floor(months / 12)}y`
}

function truncateText(value, max = 160) {
  if (typeof value !== 'string') return ''
  if (value.length <= max) return value
  return `${value.slice(0, max)}…`
}

module.exports = { compactCount, formatRelativeTime, truncateText }
