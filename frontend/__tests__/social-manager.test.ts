import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BEST_HOURS_BST,
  DEFAULT_SITE_URL,
  MAX_HOUR_DRIFT,
  aggregateMetrics,
  articleUrl,
  bstDateString,
  bstSlotToUtcIso,
  buildDailyCalendar,
  clampHourDrift,
  generateCaption,
  hoursFor,
  mondayOf,
  rankArticles,
  scoreArticle,
  templateCaption,
  type SocialArticle,
} from '../lib/social-manager'

const NOW = new Date('2026-10-13T12:00:00Z')

function article(overrides: Partial<SocialArticle> & { id: string }): SocialArticle {
  return {
    title_bn: 'শিরোনাম',
    excerpt_bn: 'সারসংক্ষেপ লেখা',
    category_key: 'national',
    ...overrides,
  }
}

const freshTech = article({
  id: 'a1',
  slug: 'tech-news',
  title_bn: 'প্রযুক্তির নতুন খবর',
  excerpt_bn: 'প্রযুক্তি সংক্রান্ত সারসংক্ষেপ',
  category_key: 'tech',
  published_at: '2026-10-13T09:00:00Z',
  ai_confidence: 0.9,
  featured_image: 'https://example.com/a1.jpg',
  video_id: 'v1',
})

const staleEntertainment = article({
  id: 'a2',
  slug: 'old-news',
  title_bn: 'পুরোনো বিনোদন খবর',
  category_key: 'entertainment',
  published_at: '2026-10-05T09:00:00Z',
  ai_confidence: 0.3,
})

describe('social manager scoring', () => {
  it('weights recency, confidence, category and media', () => {
    expect(scoreArticle(freshTech, NOW)).toBe(99.5)
    expect(scoreArticle(staleEntertainment, NOW)).toBe(24)
    expect(scoreArticle(freshTech, NOW)).toBeGreaterThan(scoreArticle(staleEntertainment, NOW))
  })

  it('orders articles by score and keeps stable ties', () => {
    const ranked = rankArticles([staleEntertainment, freshTech], NOW)
    expect(ranked.map((entry) => entry.id)).toEqual(['a1', 'a2'])

    const tieA = article({ id: 't1', category_key: 'national' })
    const tieB = article({ id: 't2', category_key: 'national' })
    expect(rankArticles([tieA, tieB], NOW).map((entry) => entry.id)).toEqual(['t1', 't2'])
  })
})

describe('social manager BST hour planning', () => {
  it('snaps insights that drift past the limit', () => {
    expect(clampHourDrift([8, 13, 17, 21], [3])).toEqual([8])
    expect(MAX_HOUR_DRIFT).toBe(2)
  })

  it('keeps insights within the limit', () => {
    expect(clampHourDrift([8, 13, 17, 21], [23])).toEqual([23])
  })

  it('returns defaults when no insights exist', () => {
    expect(hoursFor('facebook')).toEqual(DEFAULT_BEST_HOURS_BST.facebook)
    expect(hoursFor('facebook', {})).toEqual(DEFAULT_BEST_HOURS_BST.facebook)
  })

  it('clamps stored insights to defaults', () => {
    expect(hoursFor('facebook', { facebook: [3] })).toEqual([8])
    expect(hoursFor('instagram', { instagram: [13] })).toEqual([13])
  })

  it('derives the Bangla date from UTC', () => {
    expect(bstDateString(new Date('2026-10-13T20:00:00Z'))).toBe('2026-10-14')
    expect(bstDateString(new Date('2026-10-13T05:00:00Z'))).toBe('2026-10-13')
  })

  it('converts a BST hour to a UTC instant', () => {
    expect(bstSlotToUtcIso('2026-10-13', 8)).toBe('2026-10-13T02:00:00.000Z')
    expect(bstSlotToUtcIso('2026-10-13', 3)).toBe('2026-10-12T21:00:00.000Z')
  })

  it('returns the Monday of the BST week', () => {
    expect(mondayOf('2026-10-13')).toBe('2026-10-12')
    expect(mondayOf('2026-10-18')).toBe('2026-10-12')
  })

  it('builds one slot per platform hour with ranked articles', () => {
    const calendar = buildDailyCalendar({
      date: '2026-10-13',
      articles: [staleEntertainment, freshTech],
      bestHours: {
        facebook: [8],
        instagram: [13],
        x: [17],
        linkedin: [9],
        telegram: [21],
      },
      now: NOW,
    })
    expect(calendar.date).toBe('2026-10-13')
    expect(calendar.slots).toHaveLength(5)
    const facebook = calendar.slots.find((slot) => slot.platform === 'facebook')
    expect(facebook?.hour_bst).toBe(8)
    expect(facebook?.article_id).toBe('a1')
    expect(facebook?.scheduled_at).toBe('2026-10-13T02:00:00.000Z')
  })
})

describe('social manager captions and metrics', () => {
  it('aggregates metrics by platform', () => {
    const summary = aggregateMetrics([
      { platform: 'facebook', reactions: 10, comments: 2, shares: 1, impressions: 100, clicks: 5 },
      { platform: 'facebook', reactions: 1, impressions: 50 },
      { platform: 'instagram', reactions: 3, comments: 1, shares: 1, impressions: 20, clicks: 2 },
    ])
    expect(summary.totals).toMatchObject({
      reactions: 14,
      comments: 3,
      shares: 2,
      impressions: 170,
      clicks: 7,
      engagement: 19,
    })
    expect(summary.byPlatform).toHaveLength(2)
    expect(summary.byPlatform[0].platform).toBe('facebook')
    expect(summary.byPlatform[0].engagement).toBe(14)
  })

  it('builds a template caption with title, excerpt and link', () => {
    const url = articleUrl(freshTech)
    const caption = templateCaption(freshTech, url)
    expect(caption).toContain(freshTech.title_bn)
    expect(caption).toContain('সারসংক্ষেপ')
    expect(caption).toContain(`বিস্তারিত: ${url}`)
  })

  it('falls back to template captions when AI is disabled', async () => {
    const url = articleUrl(freshTech)
    const result = await generateCaption(freshTech, url, 'facebook', { useAi: false })
    expect(result.source).toBe('template')
    expect(result.caption).toContain(url)
  })

  it('builds article URLs from slug with id fallback', () => {
    expect(articleUrl({ id: 'abc', slug: 'my-news' })).toBe(`${DEFAULT_SITE_URL}/article/my-news`)
    expect(articleUrl({ id: 'abc', slug: null })).toBe(`${DEFAULT_SITE_URL}/article/abc`)
    expect(articleUrl({ id: 'abc', slug: 'my-news' }, `${DEFAULT_SITE_URL}/`)).toBe(
      `${DEFAULT_SITE_URL}/article/my-news`,
    )
  })
})
