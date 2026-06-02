const { compactCount } = require('./format')

const LAB_MODES = {
  engagement: {
    label: 'Engagement',
    shortLabel: 'Signal',
    description: 'Replies count 4x, recasts 3x, likes 1x.'
  },
  recent: {
    label: 'Recent',
    shortLabel: 'Recent',
    description: 'Newest casts first, with engagement used only as a tie-breaker.'
  },
  replies: {
    label: 'Replies',
    shortLabel: 'Replies',
    description: 'Conversation-heavy casts first.'
  },
  likes: {
    label: 'Likes',
    shortLabel: 'Likes',
    description: 'Raw like count first.'
  },
  recasts: {
    label: 'Recasts',
    shortLabel: 'Recasts',
    description: 'Distribution-heavy casts first.'
  }
}

const UPCOMING_MODES = {
  openrank: {
    label: 'OpenRank',
    shortLabel: 'OpenRank',
    description: 'Coming later as a graph-aware ranking signal.'
  }
}

function normalizeLabMode(mode) {
  return LAB_MODES[mode] ? mode : 'engagement'
}

function rankLabCasts(casts = [], mode = 'engagement') {
  const activeMode = normalizeLabMode(mode)
  return casts
    .map((cast) => decorateLabCast(cast, activeMode))
    .sort((a, b) => compareLabCasts(a, b, activeMode))
    .map((cast, index) => ({ ...cast, labRank: index + 1 }))
}

function decorateLabCast(cast, activeMode) {
  const timestampMs = Date.parse(cast.timestamp || '')
  const recentScore = Number.isFinite(timestampMs) ? timestampMs : 0
  const engagementScore = Number(cast.engagementScore || 0)
  const replyScore = Number(cast.replyCount || 0)
  const likeScore = Number(cast.likeCount || 0)
  const recastScore = Number(cast.recastCount || 0)
  const scores = {
    engagement: engagementScore,
    recent: recentScore,
    replies: replyScore,
    likes: likeScore,
    recasts: recastScore
  }

  return {
    ...cast,
    labActiveMode: activeMode,
    labActiveScore: scores[activeMode],
    labScoreLabel: formatLabScore(activeMode, scores[activeMode], cast),
    labBreakdown: [
      { mode: 'engagement', label: 'Engagement', value: engagementScore, display: compactCount(engagementScore), formula: `${compactCount(replyScore)} replies x4 + ${compactCount(recastScore)} recasts x3 + ${compactCount(likeScore)} likes` },
      { mode: 'replies', label: 'Replies', value: replyScore, display: compactCount(replyScore), formula: 'Conversation weight' },
      { mode: 'likes', label: 'Likes', value: likeScore, display: compactCount(likeScore), formula: 'Raw likes' },
      { mode: 'recasts', label: 'Recasts', value: recastScore, display: compactCount(recastScore), formula: 'Raw recasts' },
      { mode: 'recent', label: 'Recent', value: recentScore, display: cast.timestampLabel || 'Unknown', formula: 'Newest first' }
    ]
  }
}

function compareLabCasts(a, b, mode) {
  const primary = Number(b.labActiveScore || 0) - Number(a.labActiveScore || 0)
  if (primary !== 0) return primary
  const engagement = Number(b.engagementScore || 0) - Number(a.engagementScore || 0)
  if (engagement !== 0) return engagement
  return String(a.hash || '').localeCompare(String(b.hash || ''))
}

function formatLabScore(mode, score, cast) {
  if (mode === 'recent') return cast.timestampLabel || 'Unknown'
  return compactCount(score)
}

module.exports = { LAB_MODES, UPCOMING_MODES, normalizeLabMode, rankLabCasts }
