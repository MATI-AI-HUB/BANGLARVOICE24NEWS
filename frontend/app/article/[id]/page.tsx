// frontend/app/article/[id]/page.tsx
// Sample article page with paywall integration

import { createClient } from '@/lib/supabase/server';
import { Paywall } from '@/components/paywall';
import { notFound } from 'next/navigation';

interface ArticlePageProps {
  params: { id: string };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const supabase = createClient();
  
  // Fetch article
  const { data: article, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !article) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      {/* Article header — always visible */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">{article.title}</h1>
        <div className="mt-4 flex items-center gap-4 text-sm text-neutral-500">
          <span>{article.author}</span>
          <span>•</span>
          <time>{new Date(article.published_at).toLocaleDateString('bn-BD')}</time>
          {article.is_premium && (
            <>
              <span>•</span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                প্রিমিয়াম
              </span>
            </>
          )}
        </div>
      </header>

      {/* Article content — paywall protected if premium */}
      {article.is_premium ? (
        <Paywall articleId={article.id} articleTitle={article.title}>
          <article className="prose prose-lg max-w-none">
            <div dangerouslySetInnerHTML={{ __html: article.content }} />
          </article>
        </Paywall>
      ) : (
        <article className="prose prose-lg max-w-none">
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </article>
      )}
    </main>
  );
}
