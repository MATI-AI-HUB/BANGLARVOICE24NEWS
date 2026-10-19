import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/server/require-admin';
import { deletePendingArticleComment, moderateArticleComment } from './actions';

export const dynamic = 'force-dynamic';

type PendingComment = {
  id: string;
  article_id: string;
  display_name: string;
  body: string;
  created_at: string;
  articles?: { title_bn?: string | null; slug?: string | null } | null;
};

export default async function AdminCommentsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect('/login?redirectedFrom=/admin/comments');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('article_comments')
    .select('id, article_id, display_name, body, created_at, articles(title_bn, slug)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100);

  const comments = (data || []) as unknown as PendingComment[];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Editorial tools</p>
          <h1 className="mt-1 font-serifbn text-3xl font-extrabold">পাঠকের মন্তব্য পর্যালোচনা</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            অনুমোদন না পাওয়া পর্যন্ত পাঠকের মন্তব্য প্রকাশিত হবে না।
          </p>
        </div>
        <Link href="/admin" className="text-sm font-semibold text-primary underline">অ্যাডমিন ড্যাশবোর্ড</Link>
      </div>

      {error ? (
        <p role="alert" className="rounded border border-red-300 p-4 text-sm text-red-700">
          মন্তব্যের queue লোড করা যায়নি। Database migration প্রয়োগ হয়েছে কি না এবং আপনার editorial permission আছে কি না যাচাই করুন।
        </p>
      ) : null}

      {!error && comments.length === 0 ? (
        <p className="rounded border border-border p-5 text-sm text-neutral-600 dark:text-neutral-300">
          পর্যালোচনার জন্য কোনো অপেক্ষমাণ মন্তব্য নেই।
        </p>
      ) : null}

      <div className="space-y-4">
        {comments.map((comment) => (
          <article key={comment.id} className="rounded-xl border border-border p-5 dark:border-white/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold">{comment.display_name}</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  {new Date(comment.created_at).toLocaleString('bn-BD')}
                </p>
              </div>
              {comment.articles?.slug ? (
                <Link href={`/article/${comment.articles.slug}`} target="_blank" className="text-sm font-semibold text-primary underline">
                  {comment.articles.title_bn || 'সংবাদ দেখুন'}
                </Link>
              ) : (
                <span className="text-xs text-neutral-500">Article: {comment.article_id}</span>
              )}
            </div>
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed">{comment.body}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <form action={moderateArticleComment}>
                <input type="hidden" name="id" value={comment.id} />
                <input type="hidden" name="status" value="approved" />
                <button type="submit" className="rounded bg-primary px-4 py-2 text-sm font-bold text-white">
                  অনুমোদন ও প্রকাশ
                </button>
              </form>
              <form action={moderateArticleComment}>
                <input type="hidden" name="id" value={comment.id} />
                <input type="hidden" name="status" value="rejected" />
                <button type="submit" className="rounded border border-border px-4 py-2 text-sm font-semibold">
                  প্রত্যাখ্যান
                </button>
              </form>
              <form action={deletePendingArticleComment}>
                <input type="hidden" name="id" value={comment.id} />
                <button type="submit" className="rounded border border-red-300 px-4 py-2 text-sm font-semibold text-red-700">
                  মুছে ফেলুন
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-8 text-xs text-neutral-500">Signed in as {admin.email} · {admin.role}</p>
    </main>
  );
}
