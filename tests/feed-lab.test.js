const test = require('node:test')
const assert = require('node:assert/strict')

const { normalizeLabMode, rankLabCasts } = require('../src/lib/feed-lab')

test('normalizeLabMode falls back to engagement', () => {
  assert.equal(normalizeLabMode('recent'), 'recent')
  assert.equal(normalizeLabMode('openrank'), 'engagement')
  assert.equal(normalizeLabMode(''), 'engagement')
})

test('rankLabCasts sorts by selected mode and adds score breakdowns', () => {
  const casts = [
    { hash: '0xa', timestamp: '2026-01-01T00:00:00.000Z', timestampLabel: 'old', replyCount: 1, recastCount: 1, likeCount: 10, engagementScore: 18, author: {} },
    { hash: '0xb', timestamp: '2026-01-02T00:00:00.000Z', timestampLabel: 'new', replyCount: 9, recastCount: 0, likeCount: 1, engagementScore: 37, author: {} },
    { hash: '0xc', timestamp: '2026-01-03T00:00:00.000Z', timestampLabel: 'newest', replyCount: 0, recastCount: 8, likeCount: 0, engagementScore: 24, author: {} }
  ]

  assert.deepEqual(rankLabCasts(casts, 'likes').map((cast) => cast.hash), ['0xa', '0xb', '0xc'])
  assert.deepEqual(rankLabCasts(casts, 'recasts').map((cast) => cast.hash), ['0xc', '0xa', '0xb'])
  assert.deepEqual(rankLabCasts(casts, 'recent').map((cast) => cast.hash), ['0xc', '0xb', '0xa'])

  const [top] = rankLabCasts(casts, 'replies')
  assert.equal(top.hash, '0xb')
  assert.equal(top.labRank, 1)
  assert.equal(top.labActiveMode, 'replies')
  assert.ok(top.labBreakdown.some((item) => item.mode === 'engagement' && /replies x4/.test(item.formula)))
})
