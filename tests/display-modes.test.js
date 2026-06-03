const test = require('node:test')
const assert = require('node:assert/strict')

const { normalizeDisplayMode, filterCastsForDisplayMode, displayModeHref, normalizeFeedControls, filterCastsForFeedControls, feedControlHref } = require('../src/lib/display-modes')

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

test('feed controls hide replies and recasts while preserving query links', () => {
  const casts = [
    { hash: 'root', isReply: false, isRecast: false },
    { hash: 'reply', isReply: true, isRecast: false },
    { hash: 'recast', isReply: false, isRecast: true }
  ]
  const controls = normalizeFeedControls({ replies: 'hide', recasts: 'hide' })

  assert.deepEqual(filterCastsForFeedControls(casts, controls).map((cast) => cast.hash), ['root'])
  assert.equal(feedControlHref('/feed/builders', { rank: 'recent', mode: 'media', replies: 'hide' }, 'recasts', 'hide'), '/feed/builders?rank=recent&mode=media&replies=hide&recasts=hide')
  assert.equal(feedControlHref('/feed/builders', { recasts: 'hide' }, 'recasts', 'show'), '/feed/builders')
})
