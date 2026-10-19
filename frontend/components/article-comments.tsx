'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ARTICLE_COMMENT_BODY_MAX, ARTICLE_COMMENT_NAME_MAX, normalizeArticleCommentInput } from '@/lib/article-comments';
import { createClient } from '@/lib/supabase/client';

type CommentItem = {
  id: string;
  display_name: string;
  body: string;
  created_at: string;
};

type Props = {
  articleSlug: string;
  locale: 'bn' | 'en';
};

export function ArticleComments({ articleSlug, locale }: Props) {
  const [articleId, setArticleId] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const bn = locale !== 'en';
  const unavailableMessage = bn ? 'এই মুহূর্তে মন্তব্য লোড করা যাচ্ছে না। পরে আবার চেষ্টা করুন।' : 'Comments are temporarily unavailable. Please try again later.';
  const copy = {
    title: bn ? 'পাঠকের মন্তব্য' : 'Reader comments',
    intro: bn ? 'আপনার মতামত লিখুন। প্রকাশের আগে মন্তব্যটি সম্পাদকীয় পর্যালোচনার জন্য অপেক্ষা করবে।' : 'Share your view. Comments are reviewed by the editorial team before publication.',
    name: bn ? 'আপনার নাম' : 'Your name',
    comment: bn ? 'মন্তব্য' : 'Comment',
    submit: bn ? 'মন্তব্য জমা দিন' : 'Submit comment',
    pending: bn ? 'ধন্যবাদ। আপনার মন্তব্যটি পর্যালোচনার জন্য জমা হয়েছে। অনুমোদনের পর এটি দেখা যাবে।' : 'Thank you. Your comment is queued for review and will appear after approval.',
    empty: bn ? 'এখনো কোনো অনুমোদিত মন্তব্য নেই। প্রথম মন্তব্যটি আপনিই করতে পারেন।' : 'No approved comments yet. You can be the first to comment.',
    invalid: bn ? 'নাম ও মন্তব্যের ঘর ঠিকভাবে পূরণ করুন।' : 'Please check your name and comment.',
    sending: bn ? 'জমা হচ্ছে…' : 'Submitting…',
    failed: bn ? 'মন্তব্য জমা হয়নি। একটু পরে আবার চেষ্টা করুন।' : 'Comment was not submitted. Please try again shortly.',
    rateLimited: bn ? 'খুব দ্রুত মন্তব্য পাঠানো হয়েছে। কিছুক্ষণ পরে চেষ্টা করুন।' : 'Too many attempts. Please wait and try again.',
    count: bn ? 'অনুমোদিত মন্তব্য' : 'approved comments',
  };

  const loadComments = useCallback(async () => {
    setLoading(true);
    setArticleId(null);
    setComments([]);
    try {
      const supabase = createClient();
      // Resolve the article with the current browser session so premium
      // entitlements remain governed by the existing articles RLS policy.
      const { data: article, error: articleError } = await supabase
        .from('articles')
        .select('id')
        .eq('slug', articleSlug)
        .eq('status', 'published')
        .maybeSingle();

      if (articleError) throw articleError;
      if (!article?.id) {
        setError(unavailableMessage);
        return;
      }

      setArticleId(article.id);
      const { data, error: commentsError } = await supabase
        .from('article_comments')
        .select('id, display_name, body, created_at')
        .eq('article_id', article.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(50);

      if (commentsError) throw commentsError;
      setComments((data || []) as CommentItem[]);
      setError('');
    } catch {
      setError(unavailableMessage);
    } finally {
      setLoading(false);
    }
  }, [articleSlug, unavailableMessage]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');

    // Keep the honeypot as a quiet client-side bot filter. Database constraints,
    // RLS, and the insert trigger remain authoritative for direct API callers.
    if (website.trim()) {
      setName('');
      setBody('');
      setWebsite('');
      setNotice(copy.pending);
      return;
    }

    const normalized = normalizeArticleCommentInput({ displayName: name, body });
    if (!articleId || !normalized) {
      setError(copy.invalid);
      return;
    }

    setSending(true);
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from('article_comments').insert({
        article_id: articleId,
        display_name: normalized.displayName,
        body: normalized.body,
      });

      if (insertError) {
        setError(insertError.message.includes('comment_rate_limit_exceeded') ? copy.rateLimited : copy.failed);
        return;
      }

      setName('');
      setBody('');
      setWebsite('');
      setNotice(copy.pending);
    } catch {
      setError(copy.failed);
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-labelledby="article-comments-title" className="mt-10 border-t border-border pt-7 dark:border-white/10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="article-comments-title" className="font-serifbn text-2xl font-bold">{copy.title}</h2>
        <span className="text-xs text-neutral-500">{comments.length} {copy.count}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{copy.intro}</p>

      {error && !articleId && !loading ? <p role="alert" className="mt-4 text-sm text-red-600">{error}</p> : null}

      {articleId ? (
        <form onSubmit={submitComment} className="mt-5 space-y-4">
          <div>
            <label htmlFor="article-comment-name" className="mb-1 block text-sm font-semibold">{copy.name}</label>
            <input
              id="article-comment-name"
              name="displayName"
              autoComplete="name"
              required
              minLength={2}
              maxLength={ARTICLE_COMMENT_NAME_MAX}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="article-comment-body" className="mb-1 block text-sm font-semibold">{copy.comment}</label>
            <textarea
              id="article-comment-body"
              name="body"
              required
              minLength={3}
              maxLength={ARTICLE_COMMENT_BODY_MAX}
              rows={4}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="w-full resize-y rounded border border-border bg-background px-3 py-2 text-sm leading-relaxed"
            />
            <p className="mt-1 text-right text-xs text-neutral-500">{body.length}/{ARTICLE_COMMENT_BODY_MAX}</p>
          </div>
          <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
            <label htmlFor="article-comment-website">Website</label>
            <input
              id="article-comment-website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>
          {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
          {notice ? <p role="status" className="text-sm text-green-700 dark:text-green-400">{notice}</p> : null}
          <button
            type="submit"
            disabled={sending || loading}
            className="rounded bg-primary px-5 py-2.5 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? copy.sending : copy.submit}
          </button>
        </form>
      ) : null}

      <div aria-live="polite" className="mt-7 space-y-4">
        {loading ? <p className="text-sm text-neutral-500">{bn ? 'মন্তব্য লোড হচ্ছে…' : 'Loading comments…'}</p> : null}
        {!loading && !error && comments.length === 0 ? <p className="text-sm text-neutral-500">{copy.empty}</p> : null}
        {comments.map((comment) => (
          <article key={comment.id} className="rounded border border-border p-4 dark:border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold">{comment.display_name}</h3>
              <time dateTime={comment.created_at} className="text-xs text-neutral-500">
                {new Date(comment.created_at).toLocaleString(bn ? 'bn-BD' : 'en-US')}
              </time>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{comment.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
