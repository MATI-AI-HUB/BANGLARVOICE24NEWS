export const YOUTUBE_TITLE_MAX = 200
export const YOUTUBE_DESCRIPTION_MAX = 500

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
