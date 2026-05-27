const assert = require('node:assert/strict')

async function main() {
  const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3039'
  const paths = ['/', '/feed/agents', '/u/clawlinker', '/cast/demo-001', '/search?q=x402&type=casts', '/diagnostics', '/readyz']
  for (const path of paths) {
    const res = await fetch(`${base}${path}`)
    assert.equal(res.ok, true, `${path} returned ${res.status}`)
    const text = await res.text()
    assert.doesNotMatch(text, /NEYNAR_API_KEY=|super-secret|replace_me/i, `${path} leaked secret-ish text`)
  }
  const proxy = await fetch(`${base}/api/neynar/v2/farcaster/feed`)
  assert.equal(proxy.status, 404, 'generic provider proxy must stay absent')
  console.log(`smoke ok: ${paths.length} routes + no generic proxy`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
