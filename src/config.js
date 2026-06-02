const fs = require('node:fs')
const path = require('node:path')
const { z } = require('zod')

const DEFAULT_FEED_PRESETS_FILE = path.join(__dirname, '..', 'config', 'feed-presets.json')
const FEED_ALIASES = {
  traders: 'markets',
  collectors: 'art'
}

const feedPresetSchema = z.object({
  label: z.string().min(1),
  shortLabel: z.string().min(1).optional(),
  description: z.string().min(1).default('Custom Farcaster feed preset.'),
  mode: z.enum(['search', 'trending']).default('search'),
  query: z.string().default(''),
  fallback: z.string().optional(),
  accent: z.string().optional()
}).superRefine((preset, ctx) => {
  if (preset.mode === 'search' && !preset.query.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'search feed presets require a query' })
  }
})

const feedPresetsSchema = z.record(z.string().regex(/^[a-z0-9][a-z0-9-]{0,31}$/), feedPresetSchema)

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  FARCASTER_PROVIDER: z.enum(['demo', 'hypersnap', 'neynar']).default('demo'),
  NEYNAR_API_KEY: z.string().optional().default(''),
  HYPERSNAP_BASE_URL: z.string().url().default('https://haatz.quilibrium.com'),
  HYPERSNAP_ALLOWED_HOSTS: z.string().default('haatz.quilibrium.com'),
  HYPERSNAP_VIEWER_FID: z.coerce.number().int().positive().default(1325),
  PORT: z.coerce.number().int().positive().default(3039),
  HOST: z.string().default('127.0.0.1'),
  TRUST_PROXY: z.string().default('false'),
  DEFAULT_FEED: z.string().default('builders'),
  FEED_PRESETS_FILE: z.string().default(DEFAULT_FEED_PRESETS_FILE),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  PUBLIC_BASE_URL: z.string().default('http://127.0.0.1:3039')
})

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

function normalizeHypersnapBaseUrl(value, allowedHosts) {
  const parsed = new URL(value)
  if (parsed.protocol !== 'https:') throw new Error('HYPERSNAP_BASE_URL must use https.')
  if (!allowedHosts.includes(parsed.hostname.toLowerCase())) {
    throw new Error('HYPERSNAP_BASE_URL host is not allowed. Add it to HYPERSNAP_ALLOWED_HOSTS to use a custom upstream.')
  }
  return parsed.toString().replace(/\/+$/, '')
}

function parseTrustProxy(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized || ['false', '0', 'off', 'none'].includes(normalized)) return false
  if (['true', '1', 'on'].includes(normalized)) return true
  if (/^\d+$/.test(normalized)) return Number(normalized)
  return value
}

function loadFeedPresets(filePath = DEFAULT_FEED_PRESETS_FILE) {
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)
  const raw = fs.readFileSync(resolvedPath, 'utf8')
  const parsed = feedPresetsSchema.parse(JSON.parse(raw))
  if (Object.keys(parsed).length === 0) throw new Error('Feed presets file must define at least one preset.')
  return Object.fromEntries(Object.entries(parsed).map(([id, preset]) => [id, {
    ...preset,
    shortLabel: preset.shortLabel || preset.label,
    fallback: preset.fallback || ''
  }]))
}

const FEEDS = loadFeedPresets()

function resolveFeedId(feedId, feeds) {
  if (feeds[feedId]) return feedId
  const alias = FEED_ALIASES[feedId]
  if (alias && feeds[alias]) return alias
  return ''
}

function loadConfig(env = process.env) {
  const parsed = envSchema.parse(env)
  const feeds = loadFeedPresets(parsed.FEED_PRESETS_FILE)
  const defaultFeed = resolveFeedId(parsed.DEFAULT_FEED, feeds) || resolveFeedId('builders', feeds) || Object.keys(feeds)[0]
  const provider = parsed.FARCASTER_PROVIDER
  const hypersnapAllowedHosts = parseList(parsed.HYPERSNAP_ALLOWED_HOSTS)
  const hypersnapBaseUrl = normalizeHypersnapBaseUrl(parsed.HYPERSNAP_BASE_URL, hypersnapAllowedHosts)
  const isLiveProvider = provider !== 'demo'
  const providerReady = provider === 'demo' || provider === 'hypersnap' || Boolean(parsed.NEYNAR_API_KEY)
  const providerSetupMessage = providerReady
    ? ''
    : 'NEYNAR_API_KEY is missing. Demo and Hypersnap modes work without secrets; add the key later to enable live Neynar reads.'

  return {
    nodeEnv: parsed.NODE_ENV,
    provider,
    apiKey: parsed.NEYNAR_API_KEY,
    hypersnapBaseUrl,
    hypersnapAllowedHosts,
    hypersnapViewerFid: parsed.HYPERSNAP_VIEWER_FID,
    isLiveProvider,
    providerReady,
    providerSetupMessage,
    port: parsed.PORT,
    host: parsed.HOST,
    trustProxy: parseTrustProxy(parsed.TRUST_PROXY),
    feeds,
    feedAliases: FEED_ALIASES,
    defaultFeed,
    feedPresetsFile: parsed.FEED_PRESETS_FILE,
    cacheTtlSeconds: parsed.CACHE_TTL_SECONDS,
    publicBaseUrl: parsed.PUBLIC_BASE_URL
  }
}

module.exports = { FEEDS, FEED_ALIASES, loadConfig, loadFeedPresets, resolveFeedId }
