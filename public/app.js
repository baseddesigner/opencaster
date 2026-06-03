document.documentElement.classList.add('js')

const storedTheme = localStorage.getItem('farcaster-lite-theme')
if (storedTheme) document.documentElement.dataset.theme = storedTheme

document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
  const current = document.documentElement.dataset.theme
  const next = current === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = next
  localStorage.setItem('farcaster-lite-theme', next)
})

const overlay = document.querySelector('[data-shortcuts-overlay]')
const shortcutToggle = document.querySelector('[data-shortcuts-toggle]')
const shortcutClose = document.querySelector('[data-shortcuts-close]')
let selectedCastIndex = -1
let pendingGotoKey = false
let gotoTimer = null

function visibleCastCards() {
  return Array.from(document.querySelectorAll('[data-cast-card]')).filter((card) => card.offsetParent !== null)
}

function selectCast(index) {
  const cards = visibleCastCards()
  if (!cards.length) return
  const nextIndex = Math.max(0, Math.min(index, cards.length - 1))
  cards.forEach((card) => card.classList.remove('selected'))
  const selected = cards[nextIndex]
  selected.classList.add('selected')
  selected.focus({ preventScroll: true })
  selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  selectedCastIndex = nextIndex
}

function moveCast(delta) {
  const cards = visibleCastCards()
  if (!cards.length) return
  const current = selectedCastIndex < 0 ? (delta > 0 ? -1 : cards.length) : selectedCastIndex
  selectCast(current + delta)
}

function openSelectedCast() {
  const cards = visibleCastCards()
  const selected = cards[selectedCastIndex]
  const url = selected?.dataset.castUrl
  if (url) window.location.assign(url)
}

function setOverlay(open) {
  if (!overlay) return
  overlay.hidden = !open
}

function focusSearch() {
  const input = document.querySelector('.quick-search input[name="q"], .search-form input[name="q"]')
  if (input) input.focus()
}

function handleGoto(key) {
  const routes = { h: '/', s: '/search', l: '/lab' }
  if (routes[key]) window.location.assign(routes[key])
}

shortcutToggle?.addEventListener('click', () => setOverlay(true))
shortcutClose?.addEventListener('click', () => setOverlay(false))
overlay?.addEventListener('click', (event) => {
  if (event.target === overlay) setOverlay(false)
})

document.addEventListener('keydown', (event) => {
  const target = event.target
  const isTyping = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  if (event.key === 'Escape') {
    setOverlay(false)
    pendingGotoKey = false
    return
  }
  if (isTyping) return

  if (pendingGotoKey) {
    event.preventDefault()
    pendingGotoKey = false
    clearTimeout(gotoTimer)
    handleGoto(event.key.toLowerCase())
    return
  }

  if (event.key === 'j') {
    event.preventDefault()
    moveCast(1)
  } else if (event.key === 'k') {
    event.preventDefault()
    moveCast(-1)
  } else if (event.key === 'Enter') {
    openSelectedCast()
  } else if (event.key === '/') {
    event.preventDefault()
    focusSearch()
  } else if (event.key === '?') {
    event.preventDefault()
    setOverlay(true)
  } else if (event.key.toLowerCase() === 'g') {
    event.preventDefault()
    pendingGotoKey = true
    clearTimeout(gotoTimer)
    gotoTimer = setTimeout(() => { pendingGotoKey = false }, 900)
  }
})
