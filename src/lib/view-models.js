const { compactCount, formatRelativeTime } = require('./format')
const { conversationUrl, profileUrl, composeUrl } = require('./intent-urls')
const { isSafeExternalUrl, isSafeImageUrl } = require('./security')
const { buildRichTextSegments } = require('./cast-text')

function toCastCard(cast = {}) {
  const author = normalizeAuthor(cast.author || cast.user || {})
  const hash = cast.hash || cast.cast_hash || cast.castHash || ''
  const reactions = cast.reactions || {}
  const replies = cast.replies || {}
  const replyCount = Number(replies.count ?? cast.replies_count ?? cast.reply_count ?? 0)
  const recastCount = Number(reactions.recasts_count ?? cast.recasts_count ?? cast.recast_count ?? 0)
  const likeCount = Number(reactions.likes_count ?? cast.likes_count ?? cast.like_count ?? 0)
  const engagementScore = likeCount + recastCount * 3 + replyCount * 4
  const embeds = normalizeEmbeds(cast.embeds || [], cast)
  const imageEmbeds = embeds.filter((embed) => embed.type === 'image')
  const detailEmbeds = imageEmbeds.length > 1 ? embeds.filter((embed) => embed.type !== 'image') : embeds
  const farcasterUrl = hash ? conversationUrl(hash) : 'https://farcaster.xyz'
  const username = author.username || 'unknown'
  const text = cleanDisplayText(cast.text || '')
  return {
    hash,
    author: {
      fid: author.fid || null,
      username,
      displayName: author.displayName || username || 'Unknown',
      pfpUrl: isSafeImageUrl(author.pfpUrl) ? author.pfpUrl : '/favicon.svg',
      farcasterUrl: profileUrl(username)
    },
    text,
    richText: buildRichTextSegments({
      text,
      annotations: extractTextAnnotations(cast),
      hiddenUrls: embeds.map((embed) => embed.sourceUrl || embed.url).filter(Boolean)
    }),
    timestamp: cast.timestamp || cast.created_at || cast.createdAt || '',
    timestampLabel: formatRelativeTime(cast.timestamp || cast.created_at || cast.createdAt),
    replyCount,
    replyCountLabel: compactCount(replyCount),
    recastCount,
    recastCountLabel: compactCount(recastCount),
    likeCount,
    likeCountLabel: compactCount(likeCount),
    engagementScore,
    engagementScoreLabel: compactCount(engagementScore),
    embeds,
    imageEmbeds,
    detailEmbeds,
    hasImageGrid: imageEmbeds.length > 0,
    isReply: Boolean(cast.parent_hash || cast.parentHash || cast.parent_url || cast.parentUrl || cast.parent_author || cast.root_parent_url),
    isRecast: Boolean(cast.recasted_cast || cast.recastedCast || cast.recast || cast.type === 'recast'),
    farcasterUrl,
    replyUrl: composeUrl(`Replying to ${farcasterUrl}`),
    authorSearchUrl: `/search?q=${encodeURIComponent(`from:${username}`)}&type=casts`
  }
}

function normalizeAuthor(author = {}) {
  const username = author.username || author.handle || 'unknown'
  return {
    fid: author.fid || null,
    username,
    displayName: author.display_name || author.displayName || author.name || username || 'Unknown',
    pfpUrl: author.pfp_url || author.pfpUrl || author.pfp || author.avatar_url || author.avatar || '/favicon.svg'
  }
}

function toProfileCard(user = {}) {
  const normalized = normalizeAuthor(user)
  const username = normalized.username || 'unknown'
  return {
    fid: normalized.fid || null,
    username,
    displayName: normalized.displayName || username,
    bio: user.profile?.bio?.text || user.bio || user.description || '',
    pfpUrl: isSafeImageUrl(normalized.pfpUrl) ? normalized.pfpUrl : '/favicon.svg',
    followerCount: Number(user.follower_count ?? user.followers_count ?? user.followerCount ?? 0),
    followingCount: Number(user.following_count ?? user.followingCount ?? 0),
    followerCountLabel: compactCount(user.follower_count ?? user.followers_count ?? user.followerCount ?? 0),
    followingCountLabel: compactCount(user.following_count ?? user.followingCount ?? 0),
    farcasterUrl: profileUrl(username)
  }
}

function normalizeEmbeds(embeds = [], cast = {}) {
  const sourceEmbeds = Array.isArray(embeds) ? embeds : []
  const normalized = sourceEmbeds.map(normalizeEmbed).filter(Boolean)
  const seen = new Set(normalized.map((embed) => normalizeUrlForCompare(embed.sourceUrl || embed.url)).filter(Boolean))

  for (const embedCast of cast.embedCasts || cast.embed_casts || []) {
    const quote = normalizeQuoteEmbed(embedCast)
    if (quote) normalized.push(quote)
  }

  for (const url of cast.embedUrls || cast.embed_urls || []) {
    const key = normalizeUrlForCompare(url)
    if (!key || seen.has(key)) continue
    const missing = normalizeUrlEmbed({ url })
    if (missing) {
      normalized.push(missing)
      seen.add(key)
    }
  }
  return normalized
}

function normalizeEmbed(embed) {
  if (typeof embed === 'string') return normalizeUrlEmbed({ url: embed })
  if (!embed || typeof embed !== 'object') return null

  const quoteCast = embed.cast || embed.embedCast || embed.castEmbed || (embed.hash && (embed.text || embed.user || embed.author) ? embed : null)
  const quoteHash = embed.cast_id?.hash || embed.castId?.hash || quoteCast?.hash
  if (quoteHash) return normalizeQuoteEmbed(quoteCast || { hash: quoteHash })

  return normalizeUrlEmbed(embed)
}

function normalizeQuoteEmbed(quoteCast = {}) {
  const quoteHash = quoteCast.hash || quoteCast.cast_hash || quoteCast.castHash
  if (!quoteHash) return null
  const author = normalizeAuthor(quoteCast.author || quoteCast.user || {})
  const text = cleanDisplayText(quoteCast.text || '')
  const label = author.username && author.username !== 'unknown' ? `Quote from @${author.username}` : `Quoted cast ${shortHash(quoteHash)}`
  return {
    type: 'quote',
    url: conversationUrl(quoteHash),
    sourceUrl: '',
    label,
    title: label,
    description: text,
    localCastUrl: `/cast/${encodeURIComponent(quoteHash)}`,
    castHash: quoteHash,
    quotePreview: text || author.username !== 'unknown' ? {
      author: author.displayName || author.username,
      username: author.username,
      text
    } : null
  }
}

function normalizeUrlEmbed(embed) {
  const rawUrl = embed.url || embed.uri || embed.target_url || embed.targetUrl || embed.href || ''
  if (!isSafeExternalUrl(rawUrl)) return null
  const metadata = embed.metadata || {}
  const html = metadata.html || metadata.openGraph || metadata.open_graph || {}
  const contentType = String(embed.contentType || embed.content_type || metadata.content_type || metadata.contentType || html.contentType || '').toLowerCase()
  const frame = embed.frame || metadata.frame || html.frame || html.fc_frame || html.fcFrame || null
  const imageUrl = firstSafeImageUrl(embed.image_url || embed.imageUrl || embed.image || html.ogImage || html.image || metadata.image || frame?.image)
  const title = html.ogTitle || html.title || metadata.title || metadata.ogTitle || embed.title || embed.label || hostLabel(rawUrl)
  const description = html.ogDescription || html.description || metadata.description || embed.description || ''
  const type = classifyUrlEmbed(rawUrl, contentType, frame)
  return {
    type,
    url: rawUrl,
    sourceUrl: rawUrl,
    label: title || rawUrl,
    title: title || rawUrl,
    description,
    imageUrl: ['image', 'frame', 'link'].includes(type) ? (imageUrl || (type === 'image' && isSafeImageUrl(rawUrl) ? rawUrl : '')) : '',
    videoUrl: type === 'video' ? rawUrl : '',
    frame
  }
}

function classifyUrlEmbed(url, contentType, frame) {
  if (frame?.buttons?.length || frame) return 'frame'
  if (contentType.startsWith('image/')) return 'image'
  if (contentType.startsWith('video/') || contentType.startsWith('application/x-mpegurl')) return 'video'
  const pathname = safePathname(url)
  const host = hostLabel(url)
  if (/\.(png|jpe?g|gif|webp|avif)$/i.test(pathname) || /imgur\.com$/i.test(host)) return 'image'
  if (/\.(mp4|webm|mov|m4v|m3u8)$/i.test(pathname) || /(^|\.)youtu\.?be|youtube\.com$/i.test(host)) return 'video'
  return 'link'
}

function extractTextAnnotations(cast = {}) {
  return [
    ...extractMentionAnnotations(cast),
    ...extractChannelAnnotations(cast)
  ]
}

function extractMentionAnnotations(cast = {}) {
  const nookMentions = Array.isArray(cast.mentions)
    ? cast.mentions.filter((mention) => mention && typeof mention === 'object' && Number.isFinite(Number(mention.position)) && mention.user)
    : []
  if (nookMentions.length) {
    return nookMentions.map((mention) => {
      const username = (mention.user.username || mention.username || '').replace(/^@/, '')
      const fid = mention.user.fid || mention.fid || ''
      const label = `@${username || 'unknown'}`
      const start = Number(mention.position)
      return {
        start,
        end: start + Buffer.byteLength(label, 'utf8'),
        href: username ? `/u/${encodeURIComponent(username)}` : fid ? `/fid/${encodeURIComponent(fid)}` : '',
        kind: 'mention'
      }
    }).filter((annotation) => annotation.href)
  }

  const ranges = cast.mentioned_profiles_ranges || cast.mention_ranges || cast.mentions_positions || cast.mentionsPositions || []
  const profiles = cast.mentioned_profiles || cast.mentions_profiles || cast.mentions || []
  return ranges.map((range, index) => {
    const profile = profiles[index] || range.profile || range.user || {}
    const username = typeof profile === 'string' && !/^\d+$/.test(profile) ? profile.replace(/^@/, '') : (profile.username || range.username || '')
    const fid = typeof profile === 'number' || /^\d+$/.test(String(profile)) ? String(profile) : (profile.fid || range.fid || '')
    const href = username ? `/u/${encodeURIComponent(username)}` : fid ? `/fid/${encodeURIComponent(fid)}` : ''
    return { ...range, href, kind: 'mention' }
  }).filter((annotation) => annotation.href)
}

function extractChannelAnnotations(cast = {}) {
  const nookChannels = Array.isArray(cast.channelMentions)
    ? cast.channelMentions.filter((mention) => mention && Number.isFinite(Number(mention.position)))
    : []
  if (nookChannels.length) {
    return nookChannels.map((mention) => {
      const channel = mention.channel || {}
      const id = String(channel.channelId || channel.id || mention.channelId || mention.id || '').replace(/^\//, '')
      const label = `/${id}`
      const start = Number(mention.position)
      return id ? { start, end: start + Buffer.byteLength(label, 'utf8'), href: `/channel/${encodeURIComponent(id)}`, kind: 'channel' } : null
    }).filter(Boolean)
  }

  const ranges = cast.channel_mentions_ranges || cast.channelMentionsRanges || []
  const channels = cast.channel_mentions || cast.channelMentions || []
  return ranges.map((range, index) => {
    const channel = channels[index] || range.channel || range.id || ''
    const id = typeof channel === 'string' ? channel.replace(/^\//, '') : (channel.id || channel.channel_id || channel.channelId || '')
    return id ? { ...range, href: `/channel/${encodeURIComponent(id)}`, kind: 'channel' } : null
  }).filter(Boolean)
}

function firstSafeImageUrl(value) {
  const candidates = Array.isArray(value) ? value : [value]
  for (const candidate of candidates) {
    const url = typeof candidate === 'string' ? candidate : (candidate?.url || candidate?.src)
    if (isSafeImageUrl(url)) return url
  }
  return ''
}

function hostLabel(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch (_) { return String(url || '') }
}

function safePathname(url) {
  try { return new URL(url).pathname } catch (_) { return '' }
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

function cleanDisplayText(text) {
  return String(text || '').replace(/\uFFFC/g, '').replace(/ {2,}/g, ' ').trimEnd()
}

function shortHash(hash) {
  const value = String(hash || '')
  return value.length > 12 ? `${value.slice(0, 8)}…` : value
}

function normalizeFeedResponse(payload = {}) {
  const rawCasts = payload.casts || payload.result?.casts || payload.feed?.map((item) => item.cast || item) || []
  return {
    casts: rawCasts.map(toCastCard),
    nextCursor: payload.next?.cursor || payload.result?.next?.cursor || payload.nextCursor || payload.cursor || null
  }
}

function normalizeSearchUsers(payload = {}) {
  const users = payload.users || payload.result?.users || []
  return users.map(toProfileCard)
}

function normalizeCastThread(payload = {}) {
  const root = payload.cast || payload.result?.cast || payload.conversation?.cast || payload
  const parent = payload.parent || payload.parentCast || payload.result?.parent || payload.conversation?.cast?.parent || null
  const replies = payload.replies || payload.result?.replies || payload.conversation?.cast?.direct_replies || []
  return { cast: toCastCard(root), parent: parent ? toCastCard(parent) : null, replies: replies.map(toCastCard) }
}

module.exports = { toCastCard, toProfileCard, normalizeEmbeds, normalizeFeedResponse, normalizeSearchUsers, normalizeCastThread }
