'use client';

import { useEffect, useState, useCallback } from 'react';

type PendingArticle = {
  id: string;
  slug: string;
  title_bn: string;
  summary: string;
  category: string;
  reporter_name: string;
  source_url: string;
  thumbnail_url: string;
  ai_score: number;
  submitted_at: string;
};

export default function PendingPage() {
  const [items, setItems] = useState<PendingArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/pending', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setItems(data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  async function approve(id: string) {
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, note: 'approved from admin panel' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      showToast('✅ Published', 'ok');
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      showToast(`❌ ${e instanceof Error ? e.message : e}`, 'err');
    }
  }

  async function reject(id: string) {
    if (!confirm('Reject this article? It will be archived.')) return;
    try {
      const res = await fetch('/api/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, reason: 'rejected from admin panel' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      showToast('🗑️ Archived', 'ok');
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      showToast(`❌ ${e instanceof Error ? e.message : e}`, 'err');
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">📋 Editorial Queue</h1>
            <p className="text-sm text-zinc-600 mt-1">Sensitive articles requiring approval</p>
          </div>
          <button
            onClick={fetchPending}
            className="px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-700"
          >
            🔄 Refresh
          </button>
        </div>

        {loading && <div className="text-center py-12 text-zinc-500">Loading...</div>}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            ❌ {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-zinc-200">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-zinc-600">No pending articles</div>
            <div className="text-sm text-zinc-500 mt-1">All caught up!</div>
          </div>
        )}

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg border border-zinc-200 p-4">
              <div className="flex gap-4">
                {item.thumbnail_url && (
                  <img src={item.thumbnail_url} alt="" className="w-24 h-24 object-cover rounded-md flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 text-xs">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded">{item.category}</span>
                    <span className="text-zinc-500">AI score: {item.ai_score}</span>
                    <span className="text-zinc-400">·</span>
                    <span className="text-zinc-500">{item.reporter_name}</span>
                  </div>
                  <h3 className="font-semibold text-zinc-900 leading-snug">{item.title_bn}</h3>
                  <p className="text-sm text-zinc-600 mt-1 line-clamp-2">{item.summary}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => approve(item.id)}
                      className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      ✅ Approve & Publish
                    </button>
                    <button
                      onClick={() => reject(item.id)}
                      className="px-3 py-1.5 text-sm font-medium bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                    >
                      🗑️ Reject
                    </button>
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:underline"
                      >
                        🔗 Source
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
