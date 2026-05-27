const { z } = require('zod')

const FEEDS = {
  builders: {
    label: 'Builders',
    description: 'Farcaster apps, protocol work, devtools, and useful product shipping.',
    mode: 'search',
    query: 'farcaster miniapp protocol builders neynar base x402',
    fallback: 'trending'
  },
  agents: {
    label: 'Agents',
    description: 'AI agents, autonomous tools, x402, and agent commerce.',
    mode: 'search',
    query: 'agent agents x402 ai autonomous',
    fallback: 'trending'
  },
  traders: {
    label: 'Traders',
    description: 'Base, markets, token narratives, and high-signal Farcaster chatter.',
    mode: 'search',
    query: 'base token market trading degen',
    fallback: 'trending'
  },
  collectors: {
    label: 'Collectors',
    description: 'NFTs, art, mints, collectibles, and onchain culture.',
    mode: 'search',
    query: 'nft art mint collector collectible',
    fallback: 'trending'
  },
  trending: {
    label: 'Trending',
    description: 'Current Farcaster-wide trending casts.',
    mode: 'trending'
  }
}

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
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
  if (parsed.NODE_ENV === 'production' && !parsed.NEYNAR_API_KEY) {
    throw new Error('NEYNAR_API_KEY is required in production')
  }
  return {
    nodeEnv: parsed.NODE_ENV,
    apiKey: parsed.NEYNAR_API_KEY,
    port: parsed.PORT,
    host: parsed.HOST,
    defaultFeed,
    cacheTtlSeconds: parsed.CACHE_TTL_SECONDS,
    publicBaseUrl: parsed.PUBLIC_BASE_URL
  }
}

module.exports = { FEEDS, loadConfig }
