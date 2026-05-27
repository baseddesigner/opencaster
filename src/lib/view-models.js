const { compactCount, formatRelativeTime } = require('./format')
const { conversationUrl, profileUrl } = require('./intent-urls')

function toCastCard(cast = {}) {
  const author = cast.author || cast.user || {}
  const hash = cast.hash || cast.cast_hash || ''
  const reactions = cast.reactions || {}
  const replies = cast.replies || {}
  return {
    hash,
    author: {
      fid: author.fid || null,
      username: author.username || 'unknown',
      displayName: author.display_name || author.displayName || author.username || 'Unknown',
      pfpUrl: author.pfp_url || author.pfpUrl || '/favicon.svg',
      farcasterUrl: profileUrl(author.username || 'unknown')
    },
    text: cast.text || '',
    timestamp: cast.timestamp || cast.created_at || '',
    timestampLabel: formatRelativeTime(cast.timestamp || cast.created_at),
    replyCount: Number(replies.count ?? cast.replies_count ?? cast.reply_count ?? 0),
    replyCountLabel: compactCount(replies.count ?? cast.replies_count ?? cast.reply_count ?? 0),
    recastCount: Number(reactions.recasts_count ?? cast.recasts_count ?? 0),
    recastCountLabel: compactCount(reactions.recasts_count ?? cast.recasts_count ?? 0),
    likeCount: Number(reactions.likes_count ?? cast.likes_count ?? 0),
    likeCountLabel: compactCount(reactions.likes_count ?? cast.likes_count ?? 0),
    embeds: normalizeEmbeds(cast.embeds || []),
    farcasterUrl: hash ? conversationUrl(hash) : 'https://farcaster.xyz'
  }
}

function toProfileCard(user = {}) {
  const username = user.username || 'unknown'
  return {
    fid: user.fid || null,
    username,
    displayName: user.display_name || user.displayName || username,
    bio: user.profile?.bio?.text || user.bio || '',
    pfpUrl: user.pfp_url || user.pfpUrl || '/favicon.svg',
    followerCount: Number(user.follower_count ?? user.followers_count ?? 0),
    followingCount: Number(user.following_count ?? 0),
    followerCountLabel: compactCount(user.follower_count ?? user.followers_count ?? 0),
    followingCountLabel: compactCount(user.following_count ?? 0),
    farcasterUrl: profileUrl(username)
  }
}

function normalizeEmbeds(embeds = []) {
  return embeds.map((embed) => {
    if (typeof embed === 'string') return { url: embed, label: embed }
    const url = embed.url || embed.cast_id?.hash || ''
    return { url, label: embed.metadata?.html?.ogTitle || embed.title || url }
  }).filter((embed) => embed.url)
}

function normalizeFeedResponse(payload = {}) {
  const rawCasts = payload.casts || payload.result?.casts || payload.feed?.map((item) => item.cast || item) || []
  return {
    casts: rawCasts.map(toCastCard),
    nextCursor: payload.next?.cursor || payload.result?.next?.cursor || payload.cursor || null
  }
}

function normalizeSearchUsers(payload = {}) {
  const users = payload.users || payload.result?.users || []
  return users.map(toProfileCard)
}

function normalizeCastThread(payload = {}) {
  const root = payload.cast || payload.result?.cast || payload
  const replies = payload.replies || payload.result?.replies || payload.conversation?.cast?.direct_replies || []
  return { cast: toCastCard(root), replies: replies.map(toCastCard) }
}

module.exports = { toCastCard, toProfileCard, normalizeEmbeds, normalizeFeedResponse, normalizeSearchUsers, normalizeCastThread }
