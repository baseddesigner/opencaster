const { compactCount, formatRelativeTime } = require('./format')
const { conversationUrl, profileUrl, composeUrl } = require('./intent-urls')
const { isSafeExternalUrl, isSafeImageUrl } = require('./security')
const { buildRichTextSegments } = require('./cast-text')

function toCastCard(cast = {}) {
  const author = cast.author || cast.user || {}
  const hash = cast.hash || cast.cast_hash || ''
  const reactions = cast.reactions || {}
  const replies = cast.replies || {}
  const replyCount = Number(replies.count ?? cast.replies_count ?? cast.reply_count ?? 0)
  const recastCount = Number(reactions.recasts_count ?? cast.recasts_count ?? 0)
  const likeCount = Number(reactions.likes_count ?? cast.likes_count ?? 0)
  const engagementScore = likeCount + recastCount * 3 + replyCount * 4
  const embeds = normalizeEmbeds(cast.embeds || [])
  const farcasterUrl = hash ? conversationUrl(hash) : 'https://farcaster.xyz'
  const username = author.username || 'unknown'
  return {
    hash,
    author: {
      fid: author.fid || null,
      username,
      displayName: author.display_name || author.displayName || username || 'Unknown',
      pfpUrl: isSafeImageUrl(author.pfp_url || author.pfpUrl) ? (author.pfp_url || author.pfpUrl) : '/favicon.svg',
      farcasterUrl: profileUrl(username)
    },
    text: cast.text || '',
    richText: buildRichTextSegments({
      text: cast.text || '',
      annotations: extractTextAnnotations(cast),
      hiddenUrls: embeds.map((embed) => embed.sourceUrl || embed.url).filter(Boolean)
    }),
    timestamp: cast.timestamp || cast.created_at || '',
    timestampLabel: formatRelativeTime(cast.timestamp || cast.created_at),
    replyCount,
    replyCountLabel: compactCount(replyCount),
    recastCount,
    recastCountLabel: compactCount(recastCount),
    likeCount,
    likeCountLabel: compactCount(likeCount),
    engagementScore,
    engagementScoreLabel: compactCount(engagementScore),
    embeds,
    farcasterUrl,
    replyUrl: composeUrl(`Replying to ${farcasterUrl}`),
    authorSearchUrl: `/search?q=${encodeURIComponent(`from:${username}`)}&type=casts`
  }
}

function toProfileCard(user = {}) {
  const username = user.username || 'unknown'
  return {
    fid: user.fid || null,
    username,
    displayName: user.display_name || user.displayName || username,
    bio: user.profile?.bio?.text || user.bio || '',
    pfpUrl: isSafeImageUrl(user.pfp_url || user.pfpUrl) ? (user.pfp_url || user.pfpUrl) : '/favicon.svg',
    followerCount: Number(user.follower_count ?? user.followers_count ?? 0),
    followingCount: Number(user.following_count ?? 0),
    followerCountLabel: compactCount(user.follower_count ?? user.followers_count ?? 0),
    followingCountLabel: compactCount(user.following_count ?? 0),
    farcasterUrl: profileUrl(username)
  }
}

function normalizeEmbeds(embeds = []) {
  return embeds.map(normalizeEmbed).filter(Boolean)
}

function normalizeEmbed(embed) {
  if (typeof embed === 'string') return normalizeUrlEmbed({ url: embed })
  if (!embed || typeof embed !== 'object') return null
  const quoteHash = embed.cast_id?.hash || embed.castId?.hash || embed.cast?.hash
  if (quoteHash) {
    return {
      type: 'quote',
      url: conversationUrl(quoteHash),
      sourceUrl: '',
      label: embed.cast?.author?.username ? `Quote from @${embed.cast.author.username}` : `Quoted cast ${shortHash(quoteHash)}`,
      localCastUrl: `/cast/${encodeURIComponent(quoteHash)}`,
      castHash: quoteHash
    }
  }
  return normalizeUrlEmbed(embed)
}

function normalizeUrlEmbed(embed) {
  const rawUrl = embed.url || embed.target_url || embed.href || ''
  if (!isSafeExternalUrl(rawUrl)) return null
  const metadata = embed.metadata || {}
  const html = metadata.html || metadata.openGraph || {}
  const contentType = String(metadata.content_type || metadata.contentType || html.contentType || '').toLowerCase()
  const imageUrl = firstSafeImageUrl(embed.image_url || embed.imageUrl || html.ogImage || html.image || metadata.image)
  const title = html.ogTitle || html.title || metadata.title || embed.title || embed.label || hostLabel(rawUrl)
  const description = html.ogDescription || html.description || metadata.description || ''
  const frame = metadata.frame || html.frame || html.fc_frame || html.fcFrame || embed.frame || null
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
  if (frame) return 'frame'
  if (contentType.startsWith('image/')) return 'image'
  if (contentType.startsWith('video/')) return 'video'
  const pathname = safePathname(url)
  if (/\.(png|jpe?g|gif|webp|avif)$/i.test(pathname)) return 'image'
  if (/\.(mp4|webm|mov|m4v)$/i.test(pathname)) return 'video'
  return 'link'
}

function extractTextAnnotations(cast = {}) {
  return [
    ...extractMentionAnnotations(cast),
    ...extractChannelAnnotations(cast)
  ]
}

function extractMentionAnnotations(cast = {}) {
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
  const ranges = cast.channel_mentions_ranges || cast.channelMentionsRanges || []
  const channels = cast.channel_mentions || cast.channelMentions || []
  return ranges.map((range, index) => {
    const channel = channels[index] || range.channel || range.id || ''
    const id = typeof channel === 'string' ? channel.replace(/^\//, '') : (channel.id || channel.channel_id || '')
    return id ? { ...range, href: `/search?q=${encodeURIComponent(`/${id}`)}&type=casts`, kind: 'channel' } : null
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
