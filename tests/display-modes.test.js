const test = require('node:test')
const assert = require('node:assert/strict')

const { normalizeDisplayMode, filterCastsForDisplayMode, displayModeHref } = require('../src/lib/display-modes')

test('display modes normalize unknown values to casts', () => {
  assert.equal(normalizeDisplayMode('media'), 'media')
  assert.equal(normalizeDisplayMode('frames'), 'frames')
  assert.equal(normalizeDisplayMode('grid'), 'grid')
  assert.equal(normalizeDisplayMode('nope'), 'casts')
})

test('display modes filter media and frame casts by classified embeds', () => {
  const casts = [
    { hash: 'a', embeds: [{ type: 'image' }] },
    { hash: 'b', embeds: [{ type: 'video' }] },
    { hash: 'c', embeds: [{ type: 'frame' }] },
    { hash: 'd', embeds: [{ type: 'link' }] }
  ]

  assert.deepEqual(filterCastsForDisplayMode(casts, 'media').map((cast) => cast.hash), ['a', 'b'])
  assert.deepEqual(filterCastsForDisplayMode(casts, 'frames').map((cast) => cast.hash), ['c'])
  assert.deepEqual(filterCastsForDisplayMode(casts, 'grid').map((cast) => cast.hash), ['a', 'b', 'c', 'd'])
})

test('display mode href preserves existing query state and replaces mode', () => {
  assert.equal(displayModeHref('/feed/builders', { rank: 'recent', cursor: 'abc', mode: 'media' }, 'frames'), '/feed/builders?rank=recent&cursor=abc&mode=frames')
})
