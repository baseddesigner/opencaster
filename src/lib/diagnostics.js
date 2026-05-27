function buildDiagnostics({ config, provider }) {
  const providerInfo = provider?.diagnostics ? provider.diagnostics() : {
    name: provider?.name || config.provider || 'unknown',
    ready: Boolean(provider?.ready ?? config.providerReady),
    mode: config.isLiveProvider ? 'live-provider' : 'deterministic-fixtures',
    liveData: Boolean(config.isLiveProvider)
  }
  return {
    ok: Boolean(providerInfo.ready || !providerInfo.liveData),
    app: {
      name: 'farcaster-lite-client',
      nodeEnv: config.nodeEnv || 'development',
      noBuild: true,
      readOnly: true
    },
    provider: providerInfo,
    security: {
      serverSideProviderKeys: true,
      noGenericProxy: true,
      readOnlyOutboundActions: true,
      htmlEscaping: true,
      csp: true,
      rateLimit: true
    },
    maxGated: [
      'live provider credentials',
      'SIWF/auth',
      'managed signers',
      'app-side writes',
      'deployment credentials'
    ]
  }
}

module.exports = { buildDiagnostics }
