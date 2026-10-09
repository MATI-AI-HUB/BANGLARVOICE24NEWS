export const MAX_PUBLISH_PER_RUN = 3
export const MIN_PUBLISH_PER_RUN = 1
export const MAX_CANDIDATES_PER_RUN = 6
export const MAX_SOURCES_PER_RUN = 8
export const PRIORITY_CANDIDATE_TARGET_PERCENT = 70

export const WORLD_CLASS_FEED_HOSTS = [
  'feeds.bbci.co.uk',
  'bbc.co.uk',
  'bbc.com',
  'reuters.com',
  'apnews.com',
  'nytimes.com',
  'theguardian.com',
  'aljazeera.com',
  'npr.org',
  'dw.com',
  'france24.com',
  'thehindu.com',
  'japantimes.co.jp',
  'afp.com',
]

const WORLD_CLASS_NAME_HINTS = [
  'bbc',
  'reuters',
  'associated press',
  'ap news',
  'new york times',
  'nytimes',
  'guardian',
  'al jazeera',
  'npr',
  'deutsche welle',
  'dw ',
  'france 24',
  'the hindu',
  'japan times',
  'afp',
]

export function isWorldClassFeed(feedUrl: string, sourceName = ''): boolean {
  const host = feedUrl.toLowerCase()
  if (WORLD_CLASS_FEED_HOSTS.some((item) => host.includes(item))) return true
  const name = sourceName.toLowerCase()
  return WORLD_CLASS_NAME_HINTS.some((hint) => name.includes(hint.trim()))
}

export function rankSourcesForRun<T extends { feed_url: string; name?: string; last_probe_at?: string | null }>(
  sources: T[],
  limit = MAX_SOURCES_PER_RUN,
): T[] {
  const worldClass = sources.filter((source) => isWorldClassFeed(source.feed_url, source.name || ''))
  const pool = worldClass.length > 0 ? worldClass : sources
  return [...pool]
    .sort((a, b) => Date.parse(a.last_probe_at || '1970-01-01') - Date.parse(b.last_probe_at || '1970-01-01'))
    .slice(0, Math.max(1, limit))
}
