document.documentElement.classList.add('js')

const storedTheme = localStorage.getItem('farcaster-lite-theme')
if (storedTheme) document.documentElement.dataset.theme = storedTheme

document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
  const current = document.documentElement.dataset.theme
  const next = current === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = next
  localStorage.setItem('farcaster-lite-theme', next)
})
