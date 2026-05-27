const test = require('node:test')
const assert = require('node:assert/strict')

const { smokePaths } = require('../scripts/smoke')

test('smokePaths uses deterministic demo fixtures by default', () => {
  const paths = smokePaths('demo')
  assert.ok(paths.includes('/u/clawlinker'))
  assert.ok(paths.includes('/cast/demo-001'))
})

test('smokePaths uses real Cassie fixtures for Hypersnap live mode', () => {
  const paths = smokePaths('hypersnap')
  assert.ok(paths.includes('/u/cassie'))
  assert.ok(paths.some((path) => path.includes('0x0bc38a09aadbc32e322e95530c5f39e21e4bb681')))
  assert.ok(paths.includes('/search?q=snapchain&type=casts'))
})
