'use client';

import { useEffect, useState, useCallback } from 'react';

type ApiKey = {
  id: string;
  service_name: string;
  environment: string;
  is_active: boolean;
  last_tested: string | null;
  usage_percent: number;
  created_at: string;
  updated_at: string;
};

type TestResult = {
  ok: boolean;
  status: number;
  message: string;
  error?: string;
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, TestResult | 'loading'>>({});
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/api-keys', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setKeys(data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function testKey(id: string) {
    setTestResults((r) => ({ ...r, [id]: 'loading' }));
    try {
      const res = await fetch(`/api/admin/api-keys/${id}/test`, {
        method: 'POST',
        cache: 'no-store',
      });
      const data: TestResult = await res.json();
      setTestResults((r) => ({ ...r, [id]: data }));
      if (data.ok) {
        showToast(`✅ ${data.message}`, 'ok');
      } else {
        showToast(`❌ ${data.message || data.error || 'Test failed'}`, 'err');
      }
      fetchKeys();
    } catch (e) {
      setTestResults((r) => ({ ...r, [id]: { ok: false, status: 0, message: String(e) } }));
      showToast(`❌ Test error: ${e}`, 'err');
    }
  }

  async function deleteKey(id: string, name: string) {
    if (!confirm(`Delete key "${name}"?\n\nThis will remove the encrypted secret from vault. Cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      showToast(`🗑️ Deleted: ${name}`, 'ok');
      fetchKeys();
    } catch (e) {
      showToast(`❌ Delete failed: ${e}`, 'err');
    }
  }

  function fmtTime(iso: string | null): string {
    if (!iso) return 'never';
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.round(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.round(diff / 3600000)} hr ago`;
    return d.toLocaleDateString('bn-BD', { dateStyle: 'medium' });
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 dark:border-white/10">
        <div>
          <h1 className="font-serifbn text-3xl font-bold text-ink dark:text-paper">
            API Key Management
          </h1>
          <p className="mt-1 text-sm text-ink/60 dark:text-paper/60">
            এনক্রিপ্টেড কী vault (pgsodium) — শুধু service_role decrypt করতে পারে
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchKeys}
            className="rounded-full border border-border bg-paper px-4 py-2 text-sm font-semibold text-ink hover:bg-muted dark:border-white/10 dark:bg-neutral-800 dark:text-paper"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-full bg-crimson px-4 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            + Add Key
          </button>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          ❌ {error}
        </div>
      )}

      {/* Loading */}
      {loading && keys.length === 0 ? (
        <div className="py-12 text-center text-sm text-neutral-500">Loading…</div>
      ) : keys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-neutral-500 dark:border-white/10">
          কোনো API key নেই। উপরে <strong>+ Add Key</strong> ক্লিক করুন।
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => {
            const test = testResults[k.id];
            return (
              <div
                key={k.id}
                className="rounded-2xl border border-border bg-paper p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-mono text-base font-bold text-ink dark:text-paper">
                        {k.service_name}
                      </h2>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {k.environment}
                      </span>
                      {k.is_active ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          ● Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                          ○ Inactive
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-500">
                      <span>Last tested: <strong>{fmtTime(k.last_tested)}</strong></span>
                      <span>Usage: <strong>{k.usage_percent}%</strong></span>
                    </div>
                    {test && test !== 'loading' && (
                      <div
                        className={`mt-2 rounded border p-2 text-xs ${
                          test.ok
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200'
                            : 'border-red-300 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200'
                        }`}
                      >
                        {test.ok ? '✅' : '❌'} {test.message} {test.status ? `(HTTP ${test.status})` : ''}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => testKey(k.id)}
                      disabled={test === 'loading'}
                      className="rounded-full border border-border bg-paper px-3 py-1.5 text-xs font-semibold text-ink hover:bg-muted disabled:opacity-50 dark:border-white/10 dark:bg-neutral-800 dark:text-paper"
                    >
                      {test === 'loading' ? '⏳ Testing…' : '🧪 Test'}
                    </button>
                    <button
                      onClick={() => deleteKey(k.id, k.service_name)}
                      className="rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddKeyModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            showToast('✅ Key added successfully', 'ok');
            fetchKeys();
          }}
          onError={(msg) => showToast(`❌ ${msg}`, 'err')}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-xl ${
            toast.type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </main>
  );
}

// ═══ Add Key Modal ═══
function AddKeyModal({
  onClose,
  onSuccess,
  onError,
}: {
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [serviceName, setServiceName] = useState('');
  const [environment, setEnvironment] = useState<'prod' | 'staging'>('prod');
  const [keyValue, setKeyValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const PRESETS = [
    'GROQ_API_KEY',
    'OPENAI_API_KEY',
    'GEMINI_API_KEY',
    'CF_API_KEY',
    'PEXELS_API_KEY',
    'TELEGRAM_BOT_TOKEN',
    'FACEBOOK_PAGE_TOKEN',
    'X_API_KEY',
    'INSTAGRAM_ACCESS_TOKEN',
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceName.trim() || !keyValue.trim()) {
      onError('service_name and key_value required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_name: serviceName.trim(),
          environment,
          key_value: keyValue.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onSuccess();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-paper p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900">
        <h2 className="font-serifbn text-xl font-bold text-ink dark:text-paper">
          Add API Key
        </h2>
        <p className="mt-1 text-xs text-ink/60 dark:text-paper/60">
          Encrypted via pgsodium vault. Value শুধু একবার save হবে।
        </p>

        <form onSubmit={submit} className="mt-4 space-y-4">
          {/* Service name */}
          <div>
            <label className="block text-sm font-semibold text-ink dark:text-paper">
              Service Name
            </label>
            <input
              list="preset-services"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="GROQ_API_KEY"
              className="mt-1 w-full rounded-lg border border-border bg-paper px-3 py-2 font-mono text-sm text-ink focus:border-crimson focus:outline-none dark:border-white/10 dark:bg-neutral-800 dark:text-paper"
              autoFocus
            />
            <datalist id="preset-services">
              {PRESETS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          {/* Environment */}
          <div>
            <label className="block text-sm font-semibold text-ink dark:text-paper">
              Environment
            </label>
            <div className="mt-1 flex gap-2">
              {(['prod', 'staging'] as const).map((env) => (
                <button
                  key={env}
                  type="button"
                  onClick={() => setEnvironment(env)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                    environment === env
                      ? 'bg-crimson text-white'
                      : 'border border-border bg-paper text-ink hover:bg-muted dark:border-white/10 dark:bg-neutral-800 dark:text-paper'
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>
          </div>

          {/* Key value */}
          <div>
            <label className="block text-sm font-semibold text-ink dark:text-paper">
              Key Value
            </label>
            <textarea
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder="sk-... / gsk_... / your-secret-value"
              rows={3}
              className="mt-1 w-full rounded-lg border border-border bg-paper px-3 py-2 font-mono text-xs text-ink focus:border-crimson focus:outline-none dark:border-white/10 dark:bg-neutral-800 dark:text-paper"
            />
            <p className="mt-1 text-[11px] text-ink/50 dark:text-paper/50">
              ⚠️ Value encrypt হয়ে vault-এ যাবে — পরে দেখা যাবে না।
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-full border border-border bg-paper px-5 py-2 text-sm font-semibold text-ink hover:bg-muted disabled:opacity-50 dark:border-white/10 dark:bg-neutral-800 dark:text-paper"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-crimson px-5 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? '⏳ Saving…' : '✓ Save Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
