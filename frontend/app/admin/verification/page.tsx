import { requireAdmin } from '@/lib/server/require-admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Verification Queue — Admin',
};

type QueueItem = {
  id: string;
  content_type: string;
  content_id: string;
  content_snapshot: any;
  status: string;
  ai_consensus_score: number | null;
  ai_consensus_verdict: string | null;
  ai_confidence: number | null;
  ai_agents_count: number | null;
  ai_completed_at: string | null;
  created_at: string;
  article?: {
    title_bn: string;
    category_key: string;
    thumbnail_url: string | null;
  } | null;
};

async function getQueue() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: queue } = await sb
    .from('verification_queue')
    .select(`
      id, content_type, content_id, content_snapshot, status,
      ai_consensus_score, ai_consensus_verdict, ai_confidence,
      ai_agents_count, ai_completed_at, created_at
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  const articleIds = (queue || [])
    .filter(q => q.content_type === 'article')
    .map(q => q.content_id);

  let articlesMap: Record<string, any> = {};
  if (articleIds.length) {
    const { data: arts } = await sb
      .from('articles')
      .select('id, title_bn, category_key, thumbnail_url')
      .in('id', articleIds);
    (arts || []).forEach(a => { articlesMap[a.id] = a; });
  }

  return (queue || []).map(q => ({
    ...q,
    article: articlesMap[q.content_id] || null,
  })) as QueueItem[];
}

function VerdictBadge({ verdict, score }: { verdict: string | null; score: number | null }) {
  if (!verdict) {
    return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">pending</span>;
  }
  const map: Record<string, { label: string; cls: string }> = {
    auto_approve:  { label: '✅ Auto-approve',  cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    human_eyeball: { label: '👁️  Eyeball',      cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    human_review:  { label: '🔍 Review',        cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
    auto_reject:   { label: '❌ Auto-reject',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  };
  const v = map[verdict] || { label: verdict, cls: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${v.cls}`}>
      {v.label} {score != null && <span className="opacity-70">({score})</span>}
    </span>
  );
}

export default async function VerificationPage() {
  const admin = await requireAdmin();
  if (!admin) redirect('/login?redirectedFrom=/admin/verification');

  const queue = await getQueue();

  const groups = {
    auto_approve:  queue.filter(q => q.ai_consensus_verdict === 'auto_approve' && q.status === 'ai_complete'),
    human_eyeball: queue.filter(q => q.ai_consensus_verdict === 'human_eyeball' && q.status === 'ai_complete'),
    human_review:  queue.filter(q => q.ai_consensus_verdict === 'human_review' && q.status === 'ai_complete'),
    auto_reject:   queue.filter(q => q.ai_consensus_verdict === 'auto_reject'),
    pending:       queue.filter(q => q.status !== 'ai_complete'),
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serifbn text-3xl font-extrabold text-ink dark:text-white">
            🛡️ AI Verification Queue
          </h1>
          <p className="mt-1 text-sm text-ink/60 dark:text-white/60">
            Multi-agent AI quality check • human approval
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-full bg-crimson px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-crimson-dark"
        >
          ← Back to Control Center
        </Link>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { key: 'auto_approve',  label: 'Auto-approve',  cls: 'border-green-300  bg-green-50  text-green-800  dark:border-green-800  dark:bg-green-950/40  dark:text-green-200' },
          { key: 'human_eyeball', label: 'Eyeball (30s)', cls: 'border-blue-300   bg-blue-50   text-blue-800   dark:border-blue-800   dark:bg-blue-950/40   dark:text-blue-200' },
          { key: 'human_review',  label: 'Careful Review',cls: 'border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200' },
          { key: 'auto_reject',   label: 'Auto-reject',   cls: 'border-red-300    bg-red-50    text-red-800    dark:border-red-800    dark:bg-red-950/40    dark:text-red-200' },
          { key: 'pending',       label: 'Pending',       cls: 'border-gray-300   bg-gray-50   text-gray-800   dark:border-gray-700   dark:bg-gray-900/40   dark:text-gray-200' },
        ].map(({ key, label, cls }) => (
          <div key={key} className={`rounded-2xl border-2 p-4 ${cls}`}>
            <div className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</div>
            <div className="mt-1 font-serifbn text-3xl font-black">
              {groups[key as keyof typeof groups].length}
            </div>
          </div>
        ))}
      </div>

      {/* Queue table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-paper dark:border-white/10 dark:bg-neutral-950">
        <div className="border-b border-border px-4 py-3 dark:border-white/10">
          <h2 className="font-serifbn text-lg font-bold">Recent 50 Items</h2>
        </div>
        {queue.length === 0 ? (
          <div className="p-8 text-center text-ink/60 dark:text-white/60">
            <p className="text-4xl">📭</p>
            <p className="mt-2">No verification entries yet</p>
            <p className="mt-1 text-xs">Queue is populated by the AI pipeline</p>
          </div>
        ) : (
          <div className="divide-y divide-border dark:divide-white/10">
            {queue.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/50 dark:hover:bg-white/5">
                {item.article?.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.article.thumbnail_url}
                    alt=""
                    className="h-16 w-24 shrink-0 rounded-lg object-cover"
                    loading="lazy"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <VerdictBadge verdict={item.ai_consensus_verdict} score={item.ai_consensus_score} />
                    {item.article?.category_key && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-ink/70 dark:bg-white/10 dark:text-white/70">
                        {item.article.category_key}
                      </span>
                    )}
                    <span className="text-xs text-ink/40 dark:text-white/40">
                      {new Date(item.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <h3 className="mt-1.5 line-clamp-2 font-serifbn text-base font-semibold text-ink dark:text-white">
                    {item.article?.title_bn || item.content_snapshot?.title_bn || '(untitled)'}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink/60 dark:text-white/60">
                    <span>Status: <b>{item.status}</b></span>
                    {item.ai_confidence != null && (
                      <span>Confidence: <b>{(item.ai_confidence * 100).toFixed(0)}%</b></span>
                    )}
                    {item.ai_agents_count != null && <span>Agents: <b>{item.ai_agents_count}</b></span>}
                  </div>
                </div>
                <Link
                  href={`/admin/verification/${item.id}`}
                  className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:bg-crimson hover:text-white dark:border-white/20 dark:text-white"
                >
                  Review →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
