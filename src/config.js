const { z } = require('zod')

const FEEDS = {
  builders: {
    label: 'Builders',
    shortLabel: 'Build',
    description: 'Farcaster client design, feed quality, social graph, and useful product shipping.',
    mode: 'search',
    query: 'farcaster client',
    fallback: 'trending',
    accent: 'Product velocity'
  },
  agents: {
    label: 'Agents',
    shortLabel: 'Agents',
    description: 'AI agents, autonomous tools, x402, and agent commerce.',
    mode: 'search',
    query: 'agent agents x402 ai autonomous',
    fallback: 'trending',
    accent: 'Agent commerce'
  },
  traders: {
    label: 'Traders',
    shortLabel: 'Markets',
    description: 'Base, markets, token narratives, and high-signal Farcaster chatter.',
    mode: 'search',
    query: 'base token market trading degen',
    fallback: 'trending',
    accent: 'Market tape'
  },
  collectors: {
    label: 'Collectors',
    shortLabel: 'Collect',
    description: 'NFTs, art, mints, collectibles, and onchain culture.',
    mode: 'search',
    query: 'nft art mint collector collectible',
    fallback: 'trending',
    accent: 'Culture radar'
  },
  trending: {
    label: 'Trending',
    shortLabel: 'Trend',
    description: 'Current Farcaster-wide trending casts.',
    mode: 'trending',
    accent: 'Network pulse'
  }
}

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

function loadConfig(env = process.env) {
  const parsed = envSchema.parse(env)
  const defaultFeed = FEEDS[parsed.DEFAULT_FEED] ? parsed.DEFAULT_FEED : 'builders'
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
    defaultFeed,
    cacheTtlSeconds: parsed.CACHE_TTL_SECONDS,
    publicBaseUrl: parsed.PUBLIC_BASE_URL
  }
}

module.exports = { FEEDS, loadConfig }
