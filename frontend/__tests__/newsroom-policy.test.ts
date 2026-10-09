import { describe, expect, it } from 'vitest'
import {
  MAX_CANDIDATES_PER_RUN,
  MAX_PUBLISH_PER_RUN,
  MIN_PUBLISH_PER_RUN,
  isWorldClassFeed,
  rankSourcesForRun,
} from '../lib/newsroom-policy'

describe('newsroom policy', () => {
  it('publishes between one and three articles per run', () => {
    expect(MIN_PUBLISH_PER_RUN).toBe(1)
    expect(MAX_PUBLISH_PER_RUN).toBe(3)
    expect(MAX_CANDIDATES_PER_RUN).toBeGreaterThanOrEqual(MAX_PUBLISH_PER_RUN)
  })

  it('accepts world-class hosts and names', () => {
    expect(isWorldClassFeed('https://feeds.bbci.co.uk/news/world/rss.xml', 'BBC World')).toBe(true)
    expect(isWorldClassFeed('https://rss.nytimes.com/services/xml/rss/nyt/World.xml')).toBe(true)
    expect(isWorldClassFeed('https://example.com/rss.xml', 'local blog')).toBe(false)
  })

  it('ranks world-class sources first and keeps the batch small', () => {
    const ranked = rankSourcesForRun(
      [
        { name: 'Local', feed_url: 'https://example.com/rss.xml', last_probe_at: '2026-10-09T00:00:00.000Z' },
        { name: 'BBC World', feed_url: 'https://feeds.bbci.co.uk/news/world/rss.xml', last_probe_at: '2026-10-08T00:00:00.000Z' },
        { name: 'Al Jazeera', feed_url: 'https://www.aljazeera.com/xml/rss/all.xml', last_probe_at: '2026-10-07T00:00:00.000Z' },
      ],
      2,
    )
    expect(ranked).toHaveLength(2)
    expect(ranked.every((source) => isWorldClassFeed(source.feed_url, source.name))).toBe(true)
    expect(ranked[0].name).toBe('Al Jazeera')
  })

  it('fills remaining slots from other enabled sources', () => {
    const ranked = rankSourcesForRun(
      [
        { name: 'Local', feed_url: 'https://example.com/rss.xml', last_probe_at: '2026-10-09T00:00:00.000Z' },
        { name: 'BBC World', feed_url: 'https://feeds.bbci.co.uk/news/world/rss.xml', last_probe_at: '2026-10-08T00:00:00.000Z' },
      ],
      2,
    )
    expect(ranked.map((source) => source.name)).toEqual(['BBC World', 'Local'])
  })
})
