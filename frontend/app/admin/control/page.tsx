'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Tab = 'overview' | 'secrets' | 'users' | 'platform' | 'audit';

type Stats = {
  articles: { total: number; published: number; pending: number; archived: number; last24h: number };
  users: { total: number; admins: number; editors: number; reporters: number };
  secrets: { total: number; active: number };
  pipeline: { lastRunAt: string | null; runsLast24h: number };
};

type Secret = { id: string; service_name: string; environment: string; is_active: boolean; last_tested: string | null; created_at: string };
type User = { id: string; email: string; role: string; full_name: string | null; phone: string | null; verified: boolean; created_at: string; last_sign_in_at: string | null };
type CronJob = { jobname: string; schedule: string; active: boolean; last_run?: string | null };
type PipelineRun = { id: string; model: string; provider: string; status: string; latency_ms: number | null; created_at: string };
type AuditRow = { id: string; actor_id: string | null; action: string; detail: Record<string, unknown> | null; created_at: string };

const ROLES = ['admin', 'chief_editor', 'desk_editor', 'staff_reporter', 'citizen_reporter'];

export default function ControlCenterPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [cron, setCron] = useState<CronJob[]>([]);
  const [pipeline, setPipeline] = useState<PipelineRun[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newSvc, setNewSvc] = useState('');
  const [newVal, setNewVal] = useState('');
  const [newEnv, setNewEnv] = useState('prod');

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const j = useCallback(async (url: string, opts?: RequestInit) => {
    const r = await fetch(url, { cache: 'no-store', ...opts });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'overview') setStats(await j('/api/admin/control/stats'));
      else if (tab === 'secrets') {
        const d = await j('/api/admin/control/secrets');
        setSecrets(d.items || []);
      } else if (tab === 'users') {
        const d = await j('/api/admin/control/users');
        setUsers(d.items || []);
      } else if (tab === 'platform') {
        const [c, p] = await Promise.all([
          j('/api/admin/control/cron'),
          j('/api/admin/control/pipeline?limit=20'),
        ]);
        setCron(c.jobs || []);
        setPipeline(p.runs || []);
      } else if (tab === 'audit') {
        const d = await j('/api/admin/control/audit?limit=100');
        setAudit(d.entries || []);
      }
    } catch (e) {
      showToast(`❌ ${e instanceof Error ? e.message : e}`, 'err');
    } finally {
      setLoading(false);
    }
  }, [tab, j, showToast]);

  useEffect(() => { load(); }, [load]);

  async function addSecret() {
    if (!newSvc || !newVal) { showToast('সার্ভিস নাম ও key দিন', 'err'); return; }
    try {
      await j('/api/admin/control/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_name: newSvc, environment: newEnv, key_value: newVal }),
      });
      showToast('✅ Key যোগ হয়েছে', 'ok');
      setShowAdd(false); setNewSvc(''); setNewVal('');
      load();
    } catch (e) {
      showToast(`❌ ${e instanceof Error ? e.message : e}`, 'err');
    }
  }

  async function delSecret(id: string, name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await j(`/api/admin/control/secrets/${id}`, { method: 'DELETE' });
      showToast('🗑️ মুছে ফেলা হয়েছে', 'ok');
      load();
    } catch (e) {
      showToast(`❌ ${e instanceof Error ? e.message : e}`, 'err');
    }
  }

  async function testSecret(id: string) {
    try {
      const r = await j(`/api/admin/control/secrets/${id}/test`, { method: 'POST' });
      showToast(r.ok ? `✅ ${r.message}` : `❌ ${r.message}`, r.ok ? 'ok' : 'err');
      load();
    } catch (e) {
      showToast(`❌ ${e instanceof Error ? e.message : e}`, 'err');
    }
  }

  async function changeRole(id: string, role: string) {
    try {
      await j(`/api/admin/control/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      showToast('✅ Role আপডেট', 'ok');
      load();
    } catch (e) {
      showToast(`❌ ${e instanceof Error ? e.message : e}`, 'err');
    }
  }

  async function toggleVerified(id: string, verified: boolean) {
    try {
      await j(`/api/admin/control/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified }),
      });
      showToast('✅ Verified আপডেট', 'ok');
      load();
    } catch (e) {
      showToast(`❌ ${e instanceof Error ? e.message : e}`, 'err');
    }
  }

  async function resetPassword(id: string) {
    if (!confirm('Reset link পাঠাবে?')) return;
    try {
      await j(`/api/admin/control/users/${id}/reset-password`, { method: 'POST' });
      showToast('📧 Reset link পাঠানো হয়েছে', 'ok');
    } catch (e) {
      showToast(`❌ ${e instanceof Error ? e.message : e}`, 'err');
    }
  }

  async function delUser(id: string, email: string) {
    if (!confirm(`Delete ${email}?`)) return;
    try {
      await j(`/api/admin/control/users/${id}`, { method: 'DELETE' });
      showToast('🗑️ User মুছে ফেলা হয়েছে', 'ok');
      load();
    } catch (e) {
      showToast(`❌ ${e instanceof Error ? e.message : e}`, 'err');
    }
  }

  function gotoPending() {
    router.push('/admin/pending');
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-zinc-900">🎛️ Control Center</h1>
          <p className="text-sm text-zinc-600 mt-1">Platform management & monitoring</p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {(['overview', 'secrets', 'users', 'platform', 'audit'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${
                tab === t ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              {t === 'overview' && '📊 Overview'}
              {t === 'secrets' && '🔑 Secrets'}
              {t === 'users' && '👥 Users'}
              {t === 'platform' && '⚙️ Platform'}
              {t === 'audit' && '📋 Audit'}
            </button>
          ))}
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 ml-auto whitespace-nowrap"
          >
            🔄 Refresh
          </button>
        </div>

        {loading && <div className="text-center py-12 text-zinc-500">Loading...</div>}

        {!loading && tab === 'overview' && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card
              title="Articles"
              value={stats.articles.total}
              sub={`${stats.articles.published} published`}
              onClick={() => setTab('platform')}
              hint="tap to see pipeline"
            />
            <Card
              title="Pending"
              value={stats.articles.pending}
              sub="awaiting approval"
              onClick={gotoPending}
              hint="tap to review"
              highlight={stats.articles.pending > 0}
            />
            <Card
              title="Users"
              value={stats.users.total}
              sub={`${stats.users.admins} admins`}
              onClick={() => setTab('users')}
              hint="tap to manage"
            />
            <Card
              title="Secrets"
              value={stats.secrets.total}
              sub={`${stats.secrets.active} active`}
              onClick={() => setTab('secrets')}
              hint="tap to manage"
            />
            <Card
              title="Last 24h"
              value={stats.articles.last24h}
              sub="new articles"
              onClick={() => setTab('platform')}
              hint="tap to see runs"
            />
            <Card
              title="Pipeline Runs"
              value={stats.pipeline.runsLast24h}
              sub="last 24h"
              onClick={() => setTab('platform')}
              hint="tap to inspect"
            />
            <Card
              title="Editors"
              value={stats.users.editors}
              sub="chief + desk"
              onClick={() => setTab('users')}
              hint="tap to assign"
            />
            <Card
              title="Reporters"
              value={stats.users.reporters}
              sub="staff + citizen"
              onClick={() => setTab('users')}
              hint="tap to view"
            />
          </div>
        )}

        {!loading && tab === 'secrets' && (
          <div>
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setShowAdd(!showAdd)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium"
              >
                {showAdd ? '✕ Cancel' : '+ Add Secret'}
              </button>
            </div>

            {showAdd && (
              <div className="bg-white p-4 rounded-lg border border-zinc-200 mb-4 space-y-3">
                <input
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="service_name (e.g. OPENAI_API_KEY)"
                  value={newSvc}
                  onChange={(e) => setNewSvc(e.target.value.toUpperCase())}
                />
                <div className="flex gap-3">
                  <select
                    className="px-3 py-2 border rounded-md"
                    value={newEnv}
                    onChange={(e) => setNewEnv(e.target.value)}
                  >
                    <option value="prod">prod</option>
                    <option value="dev">dev</option>
                    <option value="staging">staging</option>
                  </select>
                  <input
                    className="flex-1 px-3 py-2 border rounded-md font-mono text-xs"
                    placeholder="key value (paste here)"
                    value={newVal}
                    onChange={(e) => setNewVal(e.target.value)}
                  />
                </div>
                <button
                  onClick={addSecret}
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium"
                >
                  Save
                </button>
              </div>
            )}

            <div className="space-y-3">
              {secrets.map((s) => (
                <div key={s.id} className="bg-white p-4 rounded-lg border border-zinc-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-semibold text-zinc-900">{s.service_name}</span>
                        <span className="text-xs px-2 py-0.5 bg-zinc-100 rounded">{s.environment}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${s.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {s.is_active ? 'active' : 'inactive'}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500">
                        Last tested: {s.last_tested ? new Date(s.last_tested).toLocaleString() : 'never'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => testSecret(s.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => delSecret(s.id, s.service_name)}
                        className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && tab === 'users' && (
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="bg-white p-4 rounded-lg border border-zinc-200">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-zinc-900 truncate">{u.email}</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {u.full_name || 'no name'} · {u.phone || 'no phone'}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">
                      Last sign in: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : 'never'}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="px-2 py-1 text-xs border rounded"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button
                      onClick={() => toggleVerified(u.id, !u.verified)}
                      className={`px-3 py-1.5 text-xs font-medium rounded ${
                        u.verified ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {u.verified ? '✓ Verified' : 'Unverified'}
                    </button>
                    <button
                      onClick={() => resetPassword(u.id)}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Reset PW
                    </button>
                    <button
                      onClick={() => delUser(u.id, u.email)}
                      className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === 'platform' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">⏰ Cron Jobs</h3>
              <div className="space-y-2">
                {cron.map((c) => (
                  <div key={c.jobname} className="bg-white p-3 rounded-lg border border-zinc-200 flex justify-between items-center">
                    <div>
                      <div className="font-mono text-sm font-medium">{c.jobname}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{c.schedule}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${c.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {c.active ? 'active' : 'paused'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">📊 Recent Pipeline Runs</h3>
              <div className="space-y-2">
                {pipeline.map((p) => (
                  <div key={p.id} className="bg-white p-3 rounded-lg border border-zinc-200 text-xs flex justify-between">
                    <div>
                      <div className="font-mono">{p.model} <span className="text-zinc-500">via {p.provider}</span></div>
                      <div className="text-zinc-400 mt-0.5">{new Date(p.created_at).toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className={p.status.includes('pending') ? 'text-amber-700' : 'text-green-700'}>{p.status}</div>
                      {p.latency_ms != null && <div className="text-zinc-400 mt-0.5">{p.latency_ms}ms</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && tab === 'audit' && (
          <div className="space-y-2">
            {audit.map((a) => (
              <div key={a.id} className="bg-white p-3 rounded-lg border border-zinc-200 text-xs">
                <div className="flex justify-between">
                  <span className="font-mono font-medium">{a.action}</span>
                  <span className="text-zinc-400">{new Date(a.created_at).toLocaleString()}</span>
                </div>
                {a.detail && (
                  <pre className="mt-1 text-zinc-600 text-[10px] overflow-x-auto">{JSON.stringify(a.detail)}</pre>
                )}
              </div>
            ))}
            {audit.length === 0 && (
              <div className="text-center py-8 text-zinc-500 text-sm">No audit entries yet</div>
            )}
          </div>
        )}

        {toast && (
          <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white ${
            toast.type === 'ok' ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  sub,
  onClick,
  hint,
  highlight,
}: {
  title: string;
  value: number;
  sub: string;
  onClick?: () => void;
  hint?: string;
  highlight?: boolean;
}) {
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      className={`bg-white p-4 rounded-lg border transition-all ${
        clickable ? 'cursor-pointer hover:shadow-md hover:border-blue-400 active:scale-98' : ''
      } ${highlight ? 'border-amber-400 ring-1 ring-amber-200' : 'border-zinc-200'}`}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-zinc-500">{title}</div>
        {clickable && <div className="text-zinc-300 text-xs">→</div>}
      </div>
      <div className="text-3xl font-bold text-zinc-900 mt-1">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{sub}</div>
      {hint && clickable && (
        <div className="text-[10px] text-blue-500 mt-2">{hint}</div>
      )}
    </div>
  );
}
