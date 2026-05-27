const test = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')
const { createApp } = require('../src/app')

test('rendered cast text is escaped and external links are noopener noreferrer', async () => {
  const app = createApp({
    config: { defaultFeed: 'builders', apiKey: 'top-secret' },
    neynarClient: {
      fetchFeed: async () => ({ casts: [{ hash: '0xxss', text: '<script>alert(1)</script>', author: { username: 'evil' } }], nextCursor: null })
    }
  })
  const res = await request(app).get('/').expect(200)
  assert.doesNotMatch(res.text, /<script>alert/)
  assert.match(res.text, /&lt;script&gt;alert/)
  assert.match(res.text, /rel="noopener noreferrer"/)
  assert.doesNotMatch(res.text, /top-secret/)
})
