const { isSafeExternalUrl } = require('./security')

const encoder = new TextEncoder()
const URL_RE = /https?:\/\/[^\s<>'"]+/gi

function buildRichTextSegments({ text = '', annotations = [], hiddenUrls = [] } = {}) {
  const value = String(text || '')
  const hidden = new Set(hiddenUrls.map(normalizeUrlForCompare).filter(Boolean))
  const ranges = normalizeAnnotations(annotations, value)
  const segments = []
  let cursor = 0

  for (const range of ranges) {
    if (range.startIndex < cursor) continue
    appendLinkifiedText(segments, value.slice(cursor, range.startIndex), hidden)
    appendSegment(segments, {
      kind: range.kind || 'link',
      text: value.slice(range.startIndex, range.endIndex),
      href: range.href
    })
    cursor = range.endIndex
  }

  appendLinkifiedText(segments, value.slice(cursor), hidden)
  return segments
}

function normalizeAnnotations(annotations, text) {
  return annotations
    .map((annotation) => {
      const start = Number(annotation.start ?? annotation.startByte ?? annotation.start_pos ?? annotation.position)
      const end = Number(annotation.end ?? annotation.endByte ?? annotation.end_pos ?? (Number.isFinite(start) ? start + Number(annotation.length || 0) : NaN))
      const href = String(annotation.href || '')
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !isSafeHref(href)) return null
      return {
        startIndex: byteOffsetToStringIndex(text, start),
        endIndex: byteOffsetToStringIndex(text, end),
        href,
        kind: annotation.kind || 'link'
      }
    })
    .filter((range) => range && range.endIndex > range.startIndex)
    .sort((a, b) => a.startIndex - b.startIndex || a.endIndex - b.endIndex)
}

function appendLinkifiedText(segments, text, hidden) {
  let cursor = 0
  for (const match of text.matchAll(URL_RE)) {
    const raw = match[0]
    const { url, suffix } = trimTrailingPunctuation(raw)
    const start = match.index || 0
    appendSegment(segments, { kind: 'text', text: text.slice(cursor, start) })
    if (!hidden.has(normalizeUrlForCompare(url))) appendSegment(segments, { kind: 'url', text: url, href: url })
    appendSegment(segments, { kind: 'text', text: suffix })
    cursor = start + raw.length
  }
  appendSegment(segments, { kind: 'text', text: text.slice(cursor) })
}

function appendSegment(segments, segment) {
  if (!segment.text) return
  const last = segments.at(-1)
  if (segment.kind === 'text' && last?.kind === 'text') {
    last.text += segment.text
    return
  }
  segments.push(segment)
}

function byteOffsetToStringIndex(text, offset) {
  const target = Math.max(0, Number(offset) || 0)
  let bytes = 0
  let index = 0
  for (const char of String(text || '')) {
    if (bytes >= target) return index
    bytes += encoder.encode(char).length
    index += char.length
    if (bytes >= target) return index
  }
  return String(text || '').length
}

function trimTrailingPunctuation(url) {
  const match = String(url || '').match(/^(.+?)([).,!?:;]*)$/)
  return { url: match?.[1] || String(url || ''), suffix: match?.[2] || '' }
}

function normalizeUrlForCompare(url) {
  try {
    const parsed = new URL(String(url || ''))
    parsed.hash = ''
    return parsed.toString().replace(/\/$/, '')
  } catch (_) {
    return ''
  }
}

function isSafeHref(href) {
  return href.startsWith('/') || isSafeExternalUrl(href)
}

module.exports = { buildRichTextSegments, byteOffsetToStringIndex }
