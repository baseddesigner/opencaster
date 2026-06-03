const DISPLAY_MODES = {
  casts: { label: 'Casts', description: 'All casts in the current feed.' },
  media: { label: 'Media', description: 'Only casts with images or video embeds.' },
  frames: { label: 'Frames', description: 'Only casts with frame previews.' },
  grid: { label: 'Grid', description: 'Dense card grid for scanning.' }
}

function normalizeDisplayMode(mode) {
  return DISPLAY_MODES[mode] ? mode : 'casts'
}

function filterCastsForDisplayMode(casts = [], mode = 'casts') {
  const active = normalizeDisplayMode(mode)
  if (active === 'media') return casts.filter((cast) => cast.embeds?.some((embed) => ['image', 'video'].includes(embed.type)))
  if (active === 'frames') return casts.filter((cast) => cast.embeds?.some((embed) => embed.type === 'frame'))
  return casts
}

function displayModeHref(pathname, query = {}, targetMode = 'casts') {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    if (key === 'mode') continue
    params.set(key, String(value))
  }
  const mode = normalizeDisplayMode(targetMode)
  if (mode !== 'casts') params.set('mode', mode)
  const suffix = params.toString()
  return suffix ? `${pathname}?${suffix}` : pathname
}

module.exports = { DISPLAY_MODES, normalizeDisplayMode, filterCastsForDisplayMode, displayModeHref }
