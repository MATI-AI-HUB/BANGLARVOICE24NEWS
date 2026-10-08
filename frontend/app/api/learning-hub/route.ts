import { NextResponse } from 'next/server';
import { fetchPublishedArticlesFeed } from '../../../lib/supabase/published-articles';
import { callAiGateway } from '../../../lib/ai-gateway';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

type Source = { title: string; url: string; snippet: string; kind: 'site' | 'web' };

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
  const sourceText = sources.map((source, index) => `[${index + 1}] ${source.title}\nURL: ${source.url}\n${source.snippet}`).join('\n\n');
  try {
    const result = await callAiGateway({
      task: 'learning_hub',
      temperature: 0.2,
      maxTokens: 900,
      signal: AbortSignal.timeout(25000),
      metadata: { source_count: sources.length },
      messages: [
        { role: 'system', content: 'তুমি বাংলার ভয়েস লার্নিং হাবের গবেষণা সহকারী। বাংলায় উত্তর দেবে। প্রদত্ত সূত্রের বাইরে তথ্য বানাবে না। সাম্প্রতিক বা বিতর্কিত তথ্যের ক্ষেত্রে অনিশ্চয়তা স্পষ্ট করবে। প্রয়োজন হলে উত্তরে [1], [2] এভাবে সূত্র উদ্ধৃত করবে।' },
        { role: 'user', content: `প্রশ্ন: ${question}\n\nগবেষণা সূত্র:\n${sourceText || 'কোনো নির্ভরযোগ্য সূত্র পাওয়া যায়নি।'}` },
      ],
    });
    return NextResponse.json({ answer: result.answer, sources, provider: result.provider, request_id: result.requestId });
  } catch {
    // The gateway owns provider failover; return only a safe degraded answer.
  }

  return NextResponse.json({
    answer: sources.length
      ? `AI উত্তর সেবা সাময়িকভাবে ব্যস্ত। যাচাইযোগ্য সূত্র থেকে প্রাসঙ্গিক তথ্য:\n\n${sources.map((source, index) => `[${index + 1}] ${source.title}\n${source.snippet}\n${source.url}`).join('\n\n')}`
      : 'এই মুহূর্তে নির্ভরযোগ্য উত্তর তৈরির জন্য কোনো সূত্র পাওয়া যায়নি। পরে আবার চেষ্টা করুন।',
    sources,
    degraded: true,
  });
}
