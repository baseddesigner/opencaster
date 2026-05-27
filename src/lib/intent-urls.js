const FARCASTER_BASE = 'https://farcaster.xyz'

function conversationUrl(hash) {
  return `${FARCASTER_BASE}/~/conversations/${encodeURIComponent(String(hash || ''))}`
}

function profileUrl(username) {
  const clean = String(username || '').replace(/^@+/, '')
  return `${FARCASTER_BASE}/${encodeURIComponent(clean || 'unknown')}`
}

function composeUrl(text = '') {
  const url = new URL(`${FARCASTER_BASE}/~/compose`)
  const clean = String(text || '').slice(0, 1024)
  if (clean) url.searchParams.set('text', clean)
  return url.toString()
}

module.exports = { conversationUrl, profileUrl, composeUrl }
