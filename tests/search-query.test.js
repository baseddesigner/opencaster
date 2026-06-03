const test = require('node:test')
const assert = require('node:assert/strict')

const { parseSearchInput } = require('../src/lib/params')

test('parseSearchInput extracts from:username filters without losing the visible query', () => {
  const parsed = parseSearchInput('from:clawlinker x402 paid APIs')
  assert.equal(parsed.query, 'x402 paid APIs')
  assert.equal(parsed.authorUsername, 'clawlinker')
  assert.equal(parsed.displayQuery, 'from:clawlinker x402 paid APIs')
})

test('parseSearchInput validates invalid from usernames', () => {
  assert.throws(() => parseSearchInput('from:not! base'), /Invalid Farcaster username/)
})
