'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ApproveRejectButtons({
  queueId,
  currentStatus,
}: {
  queueId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [reasons, setReasons] = useState<string[]>([]);
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');

  const rejectionOptions = [
    'ভুল তথ্য / Factual error',
    'অসম্পূর্ণ তথ্য / Incomplete info',
    'বানান/ব্যাকরণ ভুল',
    'অপ্রাসঙ্গিক ছবি',
    'সাংস্কৃতিক অসঙ্গতি',
    'Source অপর্যাপ্ত',
    'Duplicate content',
  ];

  async function handleApprove() {
    setLoading('approve');
    setError('');
    try {
      const res = await fetch(`/api/admin/verification/${queueId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approve failed');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    if (reasons.length === 0 && !notes.trim()) {
      setError('At least one reason or note required');
      return;
    }
    setLoading('reject');
    setError('');
    try {
      const res = await fetch(`/api/admin/verification/${queueId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reasons, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reject failed');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  function toggleReason(r: string) {
    setReasons(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  }

  return (
    <div className="space-y-4">
      {currentStatus === 'approved' && (
        <div className="rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-800 dark:bg-green-950/40 dark:text-green-200">
          ✅ This item is already approved
        </div>
      )}
      {currentStatus === 'rejected' && (
        <div className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">
          ❌ This item is rejected
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/70 dark:text-white/70">
          Rejection Reasons (optional)
        </label>
        <div className="flex flex-wrap gap-2">
          {rejectionOptions.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => toggleReason(r)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                reasons.includes(r)
                  ? 'border-crimson bg-crimson text-white'
                  : 'border-border text-ink/70 hover:border-crimson dark:border-white/20 dark:text-white/70'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/70 dark:text-white/70">
          Verifier Notes
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add notes (Bengali or English)..."
          rows={3}
          className="w-full rounded-lg border border-border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-crimson dark:border-white/20 dark:bg-neutral-900 dark:text-white"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleApprove}
          disabled={loading !== null}
          className="flex-1 rounded-full bg-green-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          {loading === 'approve' ? '⏳ Approving...' : '✅ Approve & Publish'}
        </button>
        <button
          onClick={handleReject}
          disabled={loading !== null}
          className="flex-1 rounded-full bg-crimson px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-crimson-dark disabled:opacity-50"
        >
          {loading === 'reject' ? '⏳ Rejecting...' : '❌ Reject'}
        </button>
      </div>
    </div>
  );
}
