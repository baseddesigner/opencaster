const { ProviderError } = require('../lib/errors')
const { createDemoProvider } = require('./demo-provider')
const { createNeynarClient } = require('../neynar')

function createSetupOnlyProvider({ name = 'neynar', setupMessage = 'Provider credentials are missing.' } = {}) {
  async function missing() {
    throw new ProviderError(setupMessage, { status: 503 })
  }
  return {
    name,
    ready: false,
    setupMessage,
    fetchFeed: missing,
    fetchTrendingFeed: missing,
    fetchUserByUsername: missing,
    fetchUserByFid: missing,
    fetchCastByHash: missing,
    searchCasts: missing,
    searchUsers: missing,
    diagnostics: () => ({ name, ready: false, mode: 'setup-required', liveData: true })
  }
}

function createProvider(config = {}) {
  if (config.provider === 'neynar') {
    if (!config.apiKey) return createSetupOnlyProvider({ name: 'neynar', setupMessage: config.providerSetupMessage || 'NEYNAR_API_KEY is missing. Add it later to enable live Neynar reads.' })
    const client = createNeynarClient({ apiKey: config.apiKey })
    return { name: 'neynar', ready: true, setupMessage: '', diagnostics: () => ({ name: 'neynar', ready: true, mode: 'live-provider', liveData: true }), ...client }
  }
  return createDemoProvider()
}

module.exports = { createProvider, createSetupOnlyProvider }
