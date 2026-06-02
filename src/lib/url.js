function normalizeHttpsBaseUrl(value, label, { allowedHosts = [] } = {}) {
  const parsed = new URL(String(value || ''))
  if (parsed.protocol !== 'https:') throw new Error(`${label} must use https.`)
  if (allowedHosts.length && !allowedHosts.includes(parsed.hostname.toLowerCase())) {
    throw new Error(`${label} host is not allowed. Add it to the allowed hosts list to use a custom upstream.`)
  }
  return parsed.toString().replace(/\/+$/, '')
}

module.exports = { normalizeHttpsBaseUrl }
