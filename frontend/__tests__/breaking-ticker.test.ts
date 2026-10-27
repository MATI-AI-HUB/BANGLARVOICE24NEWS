import { describe, expect, it, vi } from 'vitest';
import { FALLBACK_TICKER_TEXT, resolveBreakingTicker } from '../lib/breaking-ticker';

const unused = () => vi.fn(async () => ({ data: [], error: null }));

describe('resolveBreakingTicker', () => {
  it('uses active editorial ticker text first and omits the seeded demo line', async () => {
    const breakingArticles = unused();
    const recentArticles = unused();
    const result = await resolveBreakingTicker({
      activeTicker: async () => ({
        data: [
          { text_bn: FALLBACK_TICKER_TEXT.bn },
          { text_bn: 'ঢাকায় নতুন সংবাদ সম্মেলন শুরু হয়েছে' },
        ],
        error: null,
      }),
      breakingArticles,
      recentArticles,
    }, 'bn');

    expect(result).toEqual(['ঢাকায় নতুন সংবাদ সম্মেলন শুরু হয়েছে']);
    expect(breakingArticles).not.toHaveBeenCalled();
    expect(recentArticles).not.toHaveBeenCalled();
  });

  it('falls back to marked breaking articles and chooses English headlines', async () => {
    const activeTicker = vi.fn(async () => ({ data: [{ text_bn: 'শুধু বাংলা টিকার' }], error: null }));
    const result = await resolveBreakingTicker({
      activeTicker,
      breakingArticles: async () => ({
        data: [
          { title_bn: 'শিরোনাম এক', title_en: 'Headline One' },
          { title_bn: 'শিরোনাম দুই', title_en: null },
        ],
        error: null,
      }),
      recentArticles: unused(),
    }, 'en');

    expect(result).toEqual(['Headline One', 'শিরোনাম দুই']);
    expect(activeTicker).not.toHaveBeenCalled();
  });

  it('continues to recent published stories if ticker and breaking queries fail', async () => {
    const recentArticles = vi.fn(async () => ({
      data: [{ title_bn: 'সর্বশেষ সংবাদ', title_en: 'Latest Story' }],
      error: null,
    }));
    const result = await resolveBreakingTicker({
      activeTicker: async () => { throw new Error('ticker relation unavailable'); },
      breakingArticles: async () => ({ data: null, error: new Error('column unavailable') }),
      recentArticles,
    }, 'en');

    expect(result).toEqual(['Latest Story']);
    expect(recentArticles).toHaveBeenCalledOnce();
  });

  it('uses localized static copy when all data sources fail', async () => {
    const fail = async () => { throw new Error('offline'); };
    const result = await resolveBreakingTicker({
      activeTicker: fail,
      breakingArticles: fail,
      recentArticles: fail,
    }, 'en');
    expect(result).toEqual([FALLBACK_TICKER_TEXT.en]);
  });
});
