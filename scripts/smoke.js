const assert = require('node:assert/strict')

function smokePaths(provider = process.env.FARCASTER_PROVIDER || 'demo') {
  const liveProfile = process.env.SMOKE_PROFILE || 'cassie'
  const liveCast = process.env.SMOKE_CAST || '0x0bc38a09aadbc32e322e95530c5f39e21e4bb681'
  if (provider === 'hypersnap') {
    return ['/', '/feed/agents', `/u/${liveProfile}`, `/cast/${liveCast}`, '/search?q=snapchain&type=casts', '/diagnostics', '/readyz']
  }
  return ['/', '/feed/agents', '/u/clawlinker', '/cast/demo-001', '/search?q=x402&type=casts', '/diagnostics', '/readyz']
}

async function detectProvider(base) {
  if (process.env.FARCASTER_PROVIDER) return process.env.FARCASTER_PROVIDER
  try {
    const res = await fetch(`${base}/readyz`)
    if (!res.ok) return 'demo'
    const diagnostics = await res.json()
    return diagnostics.provider?.name || 'demo'
  } catch (_) {
    return 'demo'
  }
}

async function main() {
  const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3039'
  const paths = smokePaths(await detectProvider(base))
  for (const path of paths) {
    const res = await fetch(`${base}${path}`)
    assert.equal(res.ok, true, `${path} returned ${res.status}`)
    const text = await res.text()
    assert.doesNotMatch(text, /NEYNAR_API_KEY=|super-secret|replace_me/i, `${path} leaked secret-ish text`)
  }
  const proxy = await fetch(`${base}/api/neynar/v2/farcaster/feed`)
  assert.equal(proxy.status, 404, 'generic provider proxy must stay absent')
  const hypersnapProxy = await fetch(`${base}/api/hypersnap/v2/farcaster/feed`)
  assert.equal(hypersnapProxy.status, 404, 'generic Hypersnap proxy must stay absent')
  console.log(`smoke ok: ${paths.length} routes + no generic proxy`)
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

module.exports = { smokePaths }
