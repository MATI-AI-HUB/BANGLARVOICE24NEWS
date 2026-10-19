import { describe, expect, it } from 'vitest';
import { chunkForSpeech, pickBengaliVoice, stripForSpeech } from '../lib/tts-text';

describe('stripForSpeech', () => {
  it('removes tags, entities and urls', () => {
    expect(stripForSpeech('<p>ঢাকা &amp; চট্টগ্রাম</p><a href="x">https://example.com/a</a>')).toBe('ঢাকা & চট্টগ্রাম.');
  });
});

describe('chunkForSpeech', () => {
  it('splits on the danda and respects the max length', () => {
    const text = 'প্রথম বাক্য। দ্বিতীয় বাক্য। তৃতীয় বাক্য।';
    const chunks = chunkForSpeech(text, 20);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 20)).toBe(true);
    expect(chunks.join(' ')).toContain('তৃতীয় বাক্য।');
  });

  it('breaks long sentences on word boundaries', () => {
    const chunks = chunkForSpeech('শব্দ '.repeat(100), 50);
    expect(chunks.every((chunk) => chunk.length <= 50)).toBe(true);
  });
});

describe('pickBengaliVoice', () => {
  it('prefers bn-BD over bn-IN and ignores other languages', () => {
    const voice = pickBengaliVoice([
      { lang: 'en-US' },
      { lang: 'bn-IN', localService: true },
      { lang: 'bn-BD', localService: false },
    ]);
    expect(voice?.lang).toBe('bn-BD');
  });

  it('returns null when no Bengali voice exists', () => {
    expect(pickBengaliVoice([{ lang: 'en-US' }])).toBeNull();
  });
});
