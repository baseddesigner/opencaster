const { z } = require('zod')

const FEEDS = {
  builders: {
    label: 'Builders',
    shortLabel: 'Build',
    description: 'Farcaster apps, protocol work, devtools, and useful product shipping.',
    mode: 'search',
    query: 'farcaster miniapp protocol builders neynar base x402',
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
  FARCASTER_PROVIDER: z.enum(['demo', 'neynar']).default('demo'),
  NEYNAR_API_KEY: z.string().optional().default(''),
  PORT: z.coerce.number().int().positive().default(3039),
  HOST: z.string().default('127.0.0.1'),
  DEFAULT_FEED: z.string().default('builders'),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  PUBLIC_BASE_URL: z.string().default('http://127.0.0.1:3039')
})

function loadConfig(env = process.env) {
  const parsed = envSchema.parse(env)
  const defaultFeed = FEEDS[parsed.DEFAULT_FEED] ? parsed.DEFAULT_FEED : 'builders'
  const provider = parsed.FARCASTER_PROVIDER
  const isLiveProvider = provider !== 'demo'
  const providerReady = provider === 'demo' || Boolean(parsed.NEYNAR_API_KEY)
  const providerSetupMessage = providerReady
    ? ''
    : 'NEYNAR_API_KEY is missing. Demo mode works without secrets; add the key later to enable live Neynar reads.'

  return {
    nodeEnv: parsed.NODE_ENV,
    provider,
    apiKey: parsed.NEYNAR_API_KEY,
    isLiveProvider,
    providerReady,
    providerSetupMessage,
    port: parsed.PORT,
    host: parsed.HOST,
    defaultFeed,
    cacheTtlSeconds: parsed.CACHE_TTL_SECONDS,
    publicBaseUrl: parsed.PUBLIC_BASE_URL
  }
}

module.exports = { FEEDS, loadConfig }
