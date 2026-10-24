export const YOUTUBE_TITLE_MAX = 200
export const YOUTUBE_DESCRIPTION_MAX = 500

// High-risk terms are deliberately conservative. Matching content remains
// quarantined for editorial review; it is never auto-published.
const HIGH_RISK_RE = /হত্যা|নিহত|ধর্ষণ|গ্রেপ্তার|আটক|অভিযোগ|মামলা|নির্বাচন|ভোট|সহিংস|হামলা|বিস্ফোরণ|মৃত্যু|murder|killed|rape|arrest|accused|case|election|vote|violence|attack|explosion|death/i

export function isValidYouTubeVideoId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{11}$/.test(value)
}

export function stripAndCapYouTubeText(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trim()
}

export function buildYouTubeEmbedUrl(videoId: string): string | null {
  return isValidYouTubeVideoId(videoId)
    ? `https://www.youtube-nocookie.com/embed/${videoId}`
    : null
}

export function containsInstructionLikeText(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return /ignore\s+(all|any|previous|prior)\s+instructions|system\s+prompt|developer\s+message|jailbreak|reveal\s+(the|your)\s+instructions/i.test(value)
}

export function quarantineYouTubeText(value: unknown, max: number): { text: string; quarantined: boolean } {
  const text = stripAndCapYouTubeText(value, max)
  return { text, quarantined: containsInstructionLikeText(text) }
}

export type YouTubePublishGateResult =
  | { publishable: true; reason: 'quality_gate_passed' }
  | { publishable: false; reason: string }

/**
 * YouTube inventory is treated like newsroom content: metadata alone never
 * bypasses editorial safety. Rights are limited to the verified channel feed;
 * anything else remains quarantined for human review.
 */
export function evaluateYouTubePublishGate(input: {
  videoId: unknown
  title: unknown
  channelId: unknown
  expectedChannelId: string
  embeddable: boolean
  thumbnailReachable: boolean
}): YouTubePublishGateResult {
  const title = stripAndCapYouTubeText(input.title, YOUTUBE_TITLE_MAX)
  if (!isValidYouTubeVideoId(input.videoId)) return { publishable: false, reason: 'invalid_youtube_id' }
  if (input.channelId !== input.expectedChannelId) return { publishable: false, reason: 'channel_mismatch' }
  if (title.length < 8) return { publishable: false, reason: 'title_too_short' }
  if (containsInstructionLikeText(title)) return { publishable: false, reason: 'instruction_like_metadata' }
  if (HIGH_RISK_RE.test(title)) return { publishable: false, reason: 'high_risk_title_review_required' }
  if (!input.embeddable) return { publishable: false, reason: 'youtube_not_embeddable' }
  if (!input.thumbnailReachable) return { publishable: false, reason: 'thumbnail_unreachable' }
  return { publishable: true, reason: 'quality_gate_passed' }
}
