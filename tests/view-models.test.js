const test = require('node:test')
const assert = require('node:assert/strict')

const { toCastCard, toProfileCard, normalizeFeedResponse } = require('../src/lib/view-models')

test('toCastCard normalizes missing fields safely', () => {
  const card = toCastCard({ hash: '0xabc', text: '<script>alert(1)</script>' })
  assert.equal(card.hash, '0xabc')
  assert.equal(card.author.username, 'unknown')
  assert.equal(card.text, '<script>alert(1)</script>')
  assert.equal(card.likeCount, 0)
  assert.equal(card.farcasterUrl, 'https://farcaster.xyz/~/conversations/0xabc')
})

test('toProfileCard normalizes user payloads', () => {
  const profile = toProfileCard({ fid: 1, username: 'clawlinker', display_name: 'Clawlinker', follower_count: 1234 })
  assert.equal(profile.fid, 1)
  assert.equal(profile.displayName, 'Clawlinker')
  assert.equal(profile.followerCountLabel, '1.2k')
  assert.equal(profile.farcasterUrl, 'https://farcaster.xyz/clawlinker')
})

test('normalizeFeedResponse accepts common Neynar response shapes', () => {
  assert.equal(normalizeFeedResponse({ casts: [{ hash: 'a' }], next: { cursor: 'n' } }).casts.length, 1)
  assert.equal(normalizeFeedResponse({ feed: [{ cast: { hash: 'b' } }], next: { cursor: 'm' } }).casts[0].hash, 'b')
  assert.equal(normalizeFeedResponse({ result: { casts: [{ hash: 'c' }] } }).casts[0].hash, 'c')
})

test('toCastCard classifies rich embeds and hides displayed embed URLs from text segments', () => {
  const card = toCastCard({
    hash: '0xabc',
    text: 'watch https://example.com/demo.png quote',
    author: { username: 'alice' },
    embeds: [
      { url: 'https://example.com/demo.png', metadata: { content_type: 'image/png', html: { ogTitle: 'Demo image' } } },
      { cast_id: { hash: '0xquote1234', fid: 2 } },
      { url: 'https://frames.example/start', metadata: { html: { frame: { version: 'vNext' }, ogTitle: 'Frame app' } } }
    ]
  })

  assert.deepEqual(card.embeds.map((embed) => embed.type), ['image', 'quote', 'frame'])
  assert.equal(card.embeds[0].imageUrl, 'https://example.com/demo.png')
  assert.equal(card.embeds[1].localCastUrl, '/cast/0xquote1234')
  assert.doesNotMatch(card.richText.map((segment) => segment.text).join(''), /demo\.png/)
})


test('view models filter unsafe avatar URLs and expose parent context', () => {
  const card = toCastCard({ hash: '0xunsafe', author: { username: 'bad', pfp_url: 'javascript:alert(1)' } })
  assert.equal(card.author.pfpUrl, '/favicon.svg')
})
