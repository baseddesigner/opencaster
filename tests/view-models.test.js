const test = require('node:test')
const assert = require('node:assert/strict')

const { toCastCard, toProfileCard, normalizeFeedResponse, normalizeEmbeds } = require('../src/lib/view-models')

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

test('toCastCard supports Nook-style mention/channel positions and metadata embeds', () => {
  const text = 'gm @alice /builders https://example.com/one.jpg \uFFFC'
  const card = toCastCard({
    hash: '0xnook1234',
    text,
    user: { username: 'bob', displayName: 'Bob', pfp: 'https://example.com/bob.jpg' },
    mentions: [{ position: Buffer.byteLength('gm ', 'utf8'), user: { username: 'alice', fid: 1 } }],
    channelMentions: [{ position: Buffer.byteLength('gm @alice ', 'utf8'), channel: { channelId: 'builders', name: 'Builders' } }],
    embeds: [{ uri: 'https://example.com/one.jpg', contentType: 'image/jpeg' }]
  })

  assert.equal(card.author.displayName, 'Bob')
  assert.equal(card.author.pfpUrl, 'https://example.com/bob.jpg')
  assert.deepEqual(card.richText.filter((segment) => segment.href).map((segment) => [segment.kind, segment.text, segment.href]), [
    ['mention', '@alice', '/u/alice'],
    ['channel', '/builders', '/channel/builders']
  ])
  assert.equal(card.richText.map((segment) => segment.text).join('').includes('one.jpg'), false)
  assert.equal(card.richText.map((segment) => segment.text).join('').includes('\uFFFC'), false)
})

test('normalizeEmbeds handles Nook-style media, missing embed URLs, and quote previews', () => {
  const embeds = normalizeEmbeds([
    { uri: 'https://example.com/a.jpg', contentType: 'image/jpeg' },
    { uri: 'https://example.com/video.m3u8', contentType: 'application/x-mpegURL', metadata: { title: 'Stream' } },
    { uri: 'https://frames.example/start', frame: { buttons: [{ title: 'Open' }] }, metadata: { title: 'Frame app', description: 'read-only frame' } },
    { cast: { hash: '0xquote1234', text: 'quoted cast text', user: { username: 'carol', displayName: 'Carol' }, timestamp: '2026-01-01T00:00:00.000Z' } }
  ], { embedUrls: ['https://example.com/a.jpg', 'https://example.com/missing'] })

  assert.deepEqual(embeds.map((embed) => embed.type), ['image', 'video', 'frame', 'quote', 'link'])
  assert.equal(embeds[1].title, 'Stream')
  assert.equal(embeds[2].label, 'Frame app')
  assert.deepEqual(embeds[3].quotePreview, { author: 'Carol', username: 'carol', text: 'quoted cast text' })
  assert.equal(embeds[4].url, 'https://example.com/missing')
})

test('toCastCard exposes image grids plus reply and recast metadata for feed controls', () => {
  const card = toCastCard({
    hash: '0xmedia1234',
    text: 'media reply',
    author: { username: 'alice' },
    parent_hash: '0xparent1234',
    recasted_cast: { hash: '0xoriginal' },
    embeds: [
      { uri: 'https://example.com/a.jpg', contentType: 'image/jpeg' },
      { uri: 'https://example.com/b.jpg', contentType: 'image/jpeg' },
      { uri: 'https://example.com/story', metadata: { title: 'Story' } }
    ]
  })

  assert.equal(card.isReply, true)
  assert.equal(card.isRecast, true)
  assert.equal(card.imageEmbeds.length, 2)
  assert.equal(card.detailEmbeds.length, 1)
  assert.equal(card.hasImageGrid, true)
})
