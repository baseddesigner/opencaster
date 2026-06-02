const test = require('node:test')
const assert = require('node:assert/strict')

const { extractDiscoveryTerms, buildCastDiscovery } = require('../src/lib/discovery')
const { createCache } = require('../src/cache')

test('extractDiscoveryTerms removes URLs and generic timeline words', () => {
  assert.deepEqual(
    extractDiscoveryTerms('Farcaster client protocol protocol https://example.com Hypersnap providers', 3),
    ['protocol', 'hypersnap', 'providers']
  )
})

test('buildCastDiscovery composes author, related, embed, and why metadata', async () => {
  const calls = []
  const ctx = {
    config: { cacheTtlSeconds: 60 },
    cache: createCache(),
    provider: {
      name: 'mock',
      fetchUserCasts: async ({ fid }) => {
        calls.push(['author', fid])
        return { casts: [{ hash: '0xauthor', text: 'author context', author: { username: 'alice' } }] }
      },
      searchCasts: async (query) => {
        calls.push(['related', query])
        return { casts: [{ hash: '0xrelated', text: 'related context', author: { username: 'bob' } }] }
      }
    }
  }

  const discovery = await buildCastDiscovery(ctx, {
    cast: {
      hash: '0xroot',
      text: 'Hypersnap protocol clients need better context modules',
      author: { fid: 1, username: 'alice' },
      embeds: [{ url: 'https://example.com', label: 'Example' }]
    },
    parent: null,
    replies: []
  })

  assert.deepEqual(calls[0], ['author', 1])
  assert.equal(discovery.authorRecent[0].whyShown, 'Recent cast from @alice')
  assert.match(discovery.relatedQuery, /hypersnap/)
  assert.equal(discovery.relatedCasts[0].whyShown, `Matches: ${discovery.relatedQuery}`)
  assert.equal(discovery.embeds[0].whyShown, 'Linked or embedded in this cast')
})
