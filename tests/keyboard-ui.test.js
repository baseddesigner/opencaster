const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

test('keyboard navigation script exposes Supercast-style read-only shortcuts', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8')
  assert.match(js, /data-cast-card/)
  assert.match(js, /event\.key === 'j'/)
  assert.match(js, /event\.key === 'k'/)
  assert.match(js, /event\.key === '\/'/)
  assert.match(js, /event\.key === '\?'/)
  assert.match(js, /pendingGotoKey/)
})
