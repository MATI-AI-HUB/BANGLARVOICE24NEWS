import { requireAdmin } from '@/lib/server/require-admin';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { ApproveRejectButtons } from './approve-reject-buttons';

export const dynamic = 'force-dynamic';

async function getDetail(id: string) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: queue } = await sb
    .from('verification_queue')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!queue) return null;

  const { data: verifications } = await sb
    .from('ai_verifications')
    .select('*')
    .eq('queue_id', id)
    .order('agent_name');

  let article: any = null;
  if (queue.content_type === 'article') {
    const { data } = await sb
      .from('articles')
      .select('id, title_bn, title_en, content_bn, category_key, thumbnail_url, published_at, source_name, source_url')
      .eq('id', queue.content_id)
      .maybeSingle();
    article = data;
  }

  const { data: audit } = await sb
    .from('verification_audit')
    .select('*')
    .eq('queue_id', id)
    .order('created_at');

  return { queue, verifications: verifications || [], article, audit: audit || [] };
}

function AgentBadge({ score, verdict }: { score: number; verdict: string }) {
  const color = verdict === 'pass' ? 'green'
              : verdict === 'warn' ? 'yellow'
              : verdict === 'fail' ? 'red'
              : 'gray';
  const cls: Record<string, string> = {
    green:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
    red:    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
    gray:   'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${cls[color]}`}>
      {Math.round(score)}/100
    </span>
  );
}

export default async function VerificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect('/login?redirectedFrom=/admin/verification');

  const { id } = await params;
  const data = await getDetail(id);

  if (!data) notFound();
  const { queue, verifications, article, audit } = data;

  const verdictLabels: Record<string, string> = {
    auto_approve:  '✅ Auto-Approved',
    human_eyeball: '👁️  Quick Eyeball',
    human_review:  '🔍 Careful Review',
    auto_reject:   '❌ Auto-Rejected',
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link href="/admin/verification" className="text-crimson hover:underline">
          ← Verification Queue
        </Link>
        <span className="text-ink/40 dark:text-white/40">/</span>
        <span className="text-ink/60 dark:text-white/60">Detail</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="font-serifbn text-2xl font-extrabold text-ink dark:text-white">
            {article?.title_bn || queue.content_snapshot?.title_bn || 'Untitled'}
          </h1>
          {article?.title_en && (
            <p className="mt-1 text-sm text-ink/60 dark:text-white/60">{article.title_en}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-ink/80 dark:bg-white/10 dark:text-white/80">
              {article?.category_key || 'unknown'}
            </span>
            <span className="rounded-full bg-crimson/10 px-2.5 py-1 font-semibold text-crimson">
              {verdictLabels[queue.ai_consensus_verdict || ''] || queue.ai_consensus_verdict}
            </span>
            {queue.ai_consensus_score != null && (
              <span className="font-bold text-ink dark:text-white">
                Score: {Number(queue.ai_consensus_score).toFixed(1)}/100
              </span>
            )}
            {queue.ai_confidence != null && (
              <span className="text-ink/60 dark:text-white/60">
                Confidence: {(queue.ai_confidence * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
        {article?.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.thumbnail_url}
            alt=""
            className="h-24 w-40 rounded-lg object-cover"
          />
        )}
      </div>

      {/* Actions */}
      <div className="mb-8 rounded-2xl border-2 border-crimson/20 bg-crimson/5 p-4 dark:border-crimson/40 dark:bg-crimson/10">
        <h2 className="mb-3 font-serifbn text-lg font-bold text-ink dark:text-white">
          Final Decision
        </h2>
        <ApproveRejectButtons queueId={id} currentStatus={queue.status} />
      </div>

      {/* AI Agent Results */}
      <section className="mb-8">
        <h2 className="mb-4 font-serifbn text-xl font-bold text-ink dark:text-white">
          🤖 AI Agent Verdicts ({verifications.length})
        </h2>
        <div className="space-y-3">
          {verifications.map((v: any) => (
            <div key={v.id} className="rounded-xl border border-border bg-paper p-4 dark:border-white/10 dark:bg-neutral-900">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {v.verdict === 'pass' ? '✅' : v.verdict === 'warn' ? '⚠️' : v.verdict === 'fail' ? '❌' : '❓'}
                  </span>
                  <span className="font-semibold text-ink dark:text-white capitalize">
                    {v.agent_name.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-ink/40 dark:text-white/40">
                    ({v.agent_model})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AgentBadge score={v.score || 0} verdict={v.verdict} />
                  <span className="text-xs text-ink/40 dark:text-white/40">
                    {v.duration_ms}ms
                  </span>
                </div>
              </div>
              {v.reasoning && (
                <p className="text-sm leading-relaxed text-ink/80 dark:text-white/80">
                  {v.reasoning}
                </p>
              )}
              {v.flagged_items && Array.isArray(v.flagged_items) && v.flagged_items.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-bold text-red-700 dark:text-red-300">
                    Flagged ({v.flagged_items.length}):
                  </p>
                  {v.flagged_items.slice(0, 5).map((item: any, i: number) => (
                    <div key={i} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-200">
                      {item.issue || item.word || item.found || JSON.stringify(item)}
                      {item.suggestion && <span className="opacity-70"> → {item.suggestion}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Article Content */}
      {article?.content_bn && (
        <section className="mb-8">
          <h2 className="mb-3 font-serifbn text-xl font-bold text-ink dark:text-white">
            📰 Article Content
          </h2>
          <div
            className="prose prose-sm max-w-none rounded-xl border border-border bg-paper p-5 dark:border-white/10 dark:bg-neutral-900 dark:prose-invert"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(article.content_bn),
            }}
          />
        </section>
      )}

      {/* Audit Log */}
      {audit.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-serifbn text-xl font-bold text-ink dark:text-white">
            📋 Audit Log
          </h2>
          <div className="space-y-1 rounded-xl border border-border bg-paper p-4 text-sm dark:border-white/10 dark:bg-neutral-900">
            {audit.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 text-ink/70 dark:text-white/70">
                <span className="text-xs opacity-60">
                  {new Date(a.created_at).toLocaleString('en-GB')}
                </span>
                <span className="font-semibold">{a.action}</span>
                <span className="text-xs opacity-60">by {a.actor_type}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
