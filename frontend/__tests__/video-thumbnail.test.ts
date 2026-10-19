import { describe, expect, it } from 'vitest';
import { resolveVideoThumbnail, youtubeHqThumbnail } from '../lib/video-thumbnail';

describe('video thumbnails', () => {
  it('builds the YouTube HQ default for a valid id', () => {
    expect(youtubeHqThumbnail('dQw4w9WgXcQ')).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  it('rejects ids that could break out of the URL', () => {
    expect(youtubeHqThumbnail('abc/../x')).toBeUndefined();
    expect(youtubeHqThumbnail('')).toBeUndefined();
    expect(youtubeHqThumbnail(null)).toBeUndefined();
  });

  it('prefers the stored thumbnail', () => {
    expect(resolveVideoThumbnail({ thumbnail_url: 'https://cdn.example/t.jpg', youtube_id: 'dQw4w9WgXcQ' })).toBe(
      'https://cdn.example/t.jpg',
    );
  });

  it('falls back to YouTube when the stored thumbnail is missing or blank', () => {
    const expected = 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg';
    expect(resolveVideoThumbnail({ youtube_id: 'dQw4w9WgXcQ' })).toBe(expected);
    expect(resolveVideoThumbnail({ thumbnail_url: '  ', youtube_id: 'dQw4w9WgXcQ' })).toBe(expected);
  });

  it('returns undefined when neither source exists', () => {
    expect(resolveVideoThumbnail({})).toBeUndefined();
  });
});
