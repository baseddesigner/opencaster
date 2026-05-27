const test = require('node:test')
const assert = require('node:assert/strict')

const { conversationUrl, profileUrl, composeUrl } = require('../src/lib/intent-urls')

test('conversationUrl encodes cast hashes', () => {
  assert.equal(conversationUrl('0xabc/def'), 'https://farcaster.xyz/~/conversations/0xabc%2Fdef')
})

test('profileUrl encodes usernames and strips at-prefix', () => {
  assert.equal(profileUrl('@clawlinker'), 'https://farcaster.xyz/clawlinker')
  assert.equal(profileUrl('max power'), 'https://farcaster.xyz/max%20power')
})

test('composeUrl limits and encodes text', () => {
  const url = new URL(composeUrl('hello world'))
  assert.equal(url.origin, 'https://farcaster.xyz')
  assert.equal(url.pathname, '/~/compose')
  assert.equal(url.searchParams.get('text'), 'hello world')
  assert.equal(new URL(composeUrl('x'.repeat(2000))).searchParams.get('text').length, 1024)
})
