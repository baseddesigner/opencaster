const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

test('mobile nav is not fixed inside sticky header and reserves feed-first viewport space', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.css'), 'utf8')
  assert.doesNotMatch(css, /\.nav \{ position: fixed;/)
  assert.match(css, /body \{ padding-bottom: 76px; \}/)
  assert.match(css, /\.mobile-nav \{ position: fixed;/)
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*\.hero \{ padding: \.75rem;/)
})
