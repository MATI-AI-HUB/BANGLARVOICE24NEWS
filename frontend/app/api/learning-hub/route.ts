import { NextResponse } from 'next/server';
import { fetchPublishedArticlesFeed } from '../../../lib/supabase/published-articles';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

type Source = { title: string; url: string; snippet: string; kind: 'site' | 'web' };

type Provider = { key: string; base: string; model: string };

function strip(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function decodeUrl(value: string): string {
  try {
    const url = new URL(value, 'https://html.duckduckgo.com');
    return url.searchParams.get('uddg') || value;
  } catch {
    return value;
  }
}

async function webSearch(question: string): Promise<Source[]> {
  try {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(question)}`, {
      headers: { 'User-Agent': 'BanglarVoiceLearningHub/1.0 (+https://www.banglarvoice24news.com)' },
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) return [];
    const html = await response.text();
    const results: Source[] = [];
    const pattern = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) && results.length < 5) {
      const url = decodeUrl(match[1]);
      if (!/^https?:\/\//.test(url)) continue;
      results.push({ title: strip(match[2]), url, snippet: strip(match[3]).slice(0, 500), kind: 'web' });
    }
    return results;
  } catch {
    return [];
  }
}

function pickProvider(): Provider | null {
  const explicit = process.env.CHAT_AI_KEY;
  if (explicit) return { key: explicit, base: (process.env.CHAT_AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''), model: process.env.CHAT_AI_MODEL || 'gpt-4o-mini' };
  if (process.env.GROQ_API_KEY) return { key: process.env.GROQ_API_KEY, base: 'https://api.groq.com/openai/v1', model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant' };
  if (process.env.OPENROUTER_API_KEY) return { key: process.env.OPENROUTER_API_KEY, base: 'https://openrouter.ai/api/v1', model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini' };
  return null;
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => ({}));
  const question = typeof body === 'object' && body !== null && 'question' in body && typeof body.question === 'string'
    ? body.question.trim().slice(0, 1200)
    : '';
  if (question.length < 2) return NextResponse.json({ error: 'question_required' }, { status: 400 });

  const [rows, web] = await Promise.all([fetchPublishedArticlesFeed().catch(() => []), webSearch(question)]);
  const terms: string[] = question.toLowerCase().split(/\s+/).filter((term: string) => term.length > 2);
  const site: Source[] = rows
    .filter((row) => {
      const text = `${row.title_bn || ''} ${row.excerpt_bn || ''}`.toLowerCase();
      return terms.some((term: string) => text.includes(term));
    })
    .slice(0, 5)
    .map((row) => ({
      title: row.title_bn || 'বাংলার ভয়েস সংবাদ',
      url: `https://www.banglarvoice24news.com/article/${row.id}`,
      snippet: (row.excerpt_bn || row.content_bn || '').slice(0, 500),
      kind: 'site' as const,
    }));
  const sources = [...site, ...web].slice(0, 8);
  const provider = pickProvider();

  if (!provider) {
    return NextResponse.json({
      answer: sources.length
        ? `এই বিষয়ে পাওয়া সূত্রগুলো দেখুন:\n\n${sources.map((source, index) => `${index + 1}. ${source.title}\n${source.snippet}`).join('\n\n')}`
        : 'এই মুহূর্তে নির্ভরযোগ্য উত্তর তৈরির AI সেবা অনুপলব্ধ। পরে আবার চেষ্টা করুন।',
      sources,
    });
  }

  const sourceText = sources.map((source, index) => `[${index + 1}] ${source.title}\nURL: ${source.url}\n${source.snippet}`).join('\n\n');
  const response = await fetch(`${provider.base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.key}` },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        { role: 'system', content: 'তুমি বাংলার ভয়েস লার্নিং হাবের গবেষণা সহকারী। বাংলায় উত্তর দেবে। প্রদত্ত সূত্রের বাইরে তথ্য বানাবে না। সাম্প্রতিক বা বিতর্কিত তথ্যের ক্ষেত্রে অনিশ্চয়তা স্পষ্ট করবে। প্রয়োজন হলে উত্তরে [1], [2] এভাবে সূত্র উদ্ধৃত করবে।' },
        { role: 'user', content: `প্রশ্ন: ${question}\n\nগবেষণা সূত্র:\n${sourceText || 'কোনো নির্ভরযোগ্য সূত্র পাওয়া যায়নি।'}` },
      ],
    }),
  });
  const data: { choices?: Array<{ message?: { content?: string } }> } = await response.json().catch(() => ({}));
  const answer = data.choices?.[0]?.message?.content;
  if (!response.ok || !answer) return NextResponse.json({ answer: 'উত্তর তৈরি করতে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।', sources }, { status: 502 });
  return NextResponse.json({ answer, sources });
}
