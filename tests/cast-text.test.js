const test = require('node:test')
const assert = require('node:assert/strict')

const { buildRichTextSegments } = require('../src/lib/cast-text')

test('rich text uses UTF-8 byte offsets so emoji before mentions does not shift links', () => {
  const text = 'gm 🐾 @alice shipped https://example.com/docs'
  const start = Buffer.byteLength('gm 🐾 ', 'utf8')
  const end = start + Buffer.byteLength('@alice', 'utf8')
  const segments = buildRichTextSegments({
    text,
    annotations: [{ start, end, href: '/u/alice', kind: 'mention' }],
    hiddenUrls: ['https://example.com/docs']
  })

  assert.deepEqual(segments.map((segment) => [segment.kind, segment.text, segment.href || '']), [
    ['text', 'gm 🐾 ', ''],
    ['mention', '@alice', '/u/alice'],
    ['text', ' shipped ', '']
  ])
})

test('rich text linkifies safe URLs and ignores unsafe annotation hrefs', () => {
  const segments = buildRichTextSegments({
    text: 'read https://example.com and @bad',
    annotations: [{ start: Buffer.byteLength('read https://example.com and ', 'utf8'), end: Buffer.byteLength('read https://example.com and @bad', 'utf8'), href: 'javascript:alert(1)', kind: 'mention' }]
  })

  assert.equal(segments.find((segment) => segment.kind === 'url').href, 'https://example.com')
  assert.equal(segments.at(-1).kind, 'text')
  assert.match(segments.at(-1).text, /@bad/)
  assert.equal(segments.some((segment) => segment.href === 'javascript:alert(1)'), false)
})

test('rich text strips object replacement placeholders and trims hidden embed URLs', () => {
  const segments = buildRichTextSegments({
    text: 'photos \uFFFC https://example.com/one.jpg ',
    hiddenUrls: ['https://example.com/one.jpg']
  })

  assert.deepEqual(segments, [{ kind: 'text', text: 'photos' }])
})
