const test = require('node:test')
const assert = require('node:assert/strict')

const { compactCount, formatRelativeTime, truncateText } = require('../src/lib/format')

test('compactCount formats social counts', () => {
  assert.equal(compactCount(0), '0')
  assert.equal(compactCount(999), '999')
  assert.equal(compactCount(1200), '1.2k')
  assert.equal(compactCount(1200000), '1.2m')
})

test('formatRelativeTime returns compact relative labels', () => {
  const now = new Date('2026-05-27T12:00:00Z')
  assert.equal(formatRelativeTime('2026-05-27T11:59:30Z', now), '30s')
  assert.equal(formatRelativeTime('2026-05-27T11:55:00Z', now), '5m')
  assert.equal(formatRelativeTime('2026-05-27T09:00:00Z', now), '3h')
  assert.equal(formatRelativeTime('2026-05-25T12:00:00Z', now), '2d')
})

test('truncateText caps long strings without crashing on non-strings', () => {
  assert.equal(truncateText(null, 10), '')
  assert.equal(truncateText('hello world', 20), 'hello world')
  assert.equal(truncateText('hello world', 5), 'hello…')
})
