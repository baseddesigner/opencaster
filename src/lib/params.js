const { BadRequestError } = require('./errors')

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{0,31}$/i
const HEX_CAST_RE = /^(0x)?[a-f0-9]{8,64}$/i
const DEMO_CAST_RE = /^demo-[a-z0-9-]{3,40}$/i
const CURSOR_RE = /^[a-z0-9._~:-]{0,240}$/i

function parseUsername(value) {
  const username = String(value || '').trim().replace(/^@/, '')
  if (!USERNAME_RE.test(username)) throw new BadRequestError('Invalid Farcaster username.')
  return username
}

function parseFid(value) {
  const fid = String(value || '').trim()
  if (!/^\d{1,12}$/.test(fid) || Number(fid) <= 0) throw new BadRequestError('Invalid Farcaster FID.')
  return fid
}

function parseCastHash(value) {
  const hash = String(value || '').trim()
  if (!HEX_CAST_RE.test(hash) && !DEMO_CAST_RE.test(hash)) throw new BadRequestError('Invalid Farcaster cast hash.')
  return hash
}

function parseCursor(value) {
  const cursor = String(value || '').trim()
  if (!CURSOR_RE.test(cursor)) throw new BadRequestError('Invalid pagination cursor.')
  return cursor
}

function parseSearchQuery(value) {
  const query = String(value || '').trim()
  if (!query) return ''
  if (query.length < 2) throw new BadRequestError('Search query is too short.')
  if (query.length > 120) throw new BadRequestError('Search query is too long.')
  return query
}

module.exports = { parseUsername, parseFid, parseCastHash, parseCursor, parseSearchQuery }
