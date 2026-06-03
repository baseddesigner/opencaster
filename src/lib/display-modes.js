const DISPLAY_MODES = {
  casts: { label: 'Casts', description: 'All casts in the current feed.' },
  media: { label: 'Media', description: 'Only casts with images or video embeds.' },
  frames: { label: 'Frames', description: 'Only casts with frame previews.' },
  grid: { label: 'Grid', description: 'Dense card grid for scanning.' }
}

const FEED_CONTROL_DEFAULTS = { replies: 'show', recasts: 'show' }

function normalizeDisplayMode(mode) {
  return DISPLAY_MODES[mode] ? mode : 'casts'
}

function filterCastsForDisplayMode(casts = [], mode = 'casts') {
  const active = normalizeDisplayMode(mode)
  if (active === 'media') return casts.filter((cast) => cast.embeds?.some((embed) => ['image', 'video'].includes(embed.type)))
  if (active === 'frames') return casts.filter((cast) => cast.embeds?.some((embed) => embed.type === 'frame'))
  return casts
}

function normalizeFeedControls(query = {}) {
  return {
    replies: query.replies === 'hide' ? 'hide' : 'show',
    recasts: query.recasts === 'hide' ? 'hide' : 'show'
  }
}

function filterCastsForFeedControls(casts = [], controls = FEED_CONTROL_DEFAULTS) {
  return casts.filter((cast) => {
    if (controls.replies === 'hide' && cast.isReply) return false
    if (controls.recasts === 'hide' && cast.isRecast) return false
    return true
  })
}

function displayModeHref(pathname, query = {}, targetMode = 'casts') {
  return buildHref(pathname, { ...query, mode: normalizeDisplayMode(targetMode) })
}

function feedControlHref(pathname, query = {}, controlName, targetValue) {
  return buildHref(pathname, { ...query, [controlName]: targetValue })
}

function buildHref(pathname, query = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    if (key === 'mode' && normalizeDisplayMode(value) === 'casts') continue
    if ((key === 'replies' || key === 'recasts') && value !== 'hide') continue
    params.set(key, String(value))
  }
  const suffix = params.toString()
  return suffix ? `${pathname}?${suffix}` : pathname
}

module.exports = {
  DISPLAY_MODES,
  normalizeDisplayMode,
  filterCastsForDisplayMode,
  displayModeHref,
  normalizeFeedControls,
  filterCastsForFeedControls,
  feedControlHref
}
