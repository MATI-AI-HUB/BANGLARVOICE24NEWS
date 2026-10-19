const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

/** Removes markup so the speech engine never reads tags, URLs or entities aloud. */
export function stripForSpeech(input: string): string {
  return input
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|br)>|<br\s*\/?>/gi, '. ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot|apos|#39);/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? ' ')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/(\.\s*){2,}/g, '. ')
    .trim();
}

/**
 * Splits text into utterance-sized chunks (Chrome silently stops long
 * utterances). Breaks on the Bengali danda, then sentence punctuation, then
 * whitespace, so words are never cut in half.
 */
export function chunkForSpeech(text: string, maxLength = 220): string[] {
  const sentences = text.match(/[^।.!?]+[।.!?]*/g) ?? [text];
  const chunks: string[] = [];
  let current = '';

  const push = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) chunks.push(trimmed);
  };

  for (const sentence of sentences) {
    if (sentence.length > maxLength) {
      push(current);
      current = '';
      let line = '';
      for (const word of sentence.split(/\s+/)) {
        if ((line + ' ' + word).length > maxLength) {
          push(line);
          line = word;
        } else {
          line = line ? `${line} ${word}` : word;
        }
      }
      push(line);
      continue;
    }
    if ((current + sentence).length > maxLength) {
      push(current);
      current = sentence;
    } else {
      current += sentence;
    }
  }
  push(current);
  return chunks;
}

/** Prefers bn-BD, then bn-IN, then any Bengali voice; null when none is installed. */
export function pickBengaliVoice<T extends { lang?: string; localService?: boolean }>(voices: T[]): T | null {
  const bengali = voices.filter((voice) => (voice.lang ?? '').toLowerCase().replace('_', '-').startsWith('bn'));
  const rank = (voice: T) => {
    const lang = (voice.lang ?? '').toLowerCase().replace('_', '-');
    return (lang === 'bn-bd' ? 0 : lang === 'bn-in' ? 1 : 2) * 2 + (voice.localService ? 0 : 1);
  };
  return bengali.sort((a, b) => rank(a) - rank(b))[0] ?? null;
}
