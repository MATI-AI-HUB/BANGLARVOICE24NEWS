// frontend/components/admin/cost-dashboard.tsx
// Client component to display AI cost metrics and logs table

'use client';

interface AiLog {
  id: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  latency_ms: number;
  created_at: string;
}

interface Props {
  logs: AiLog[];
  totalCost: number;
  totalTokens: number;
}

export function CostDashboard({ logs, totalCost, totalTokens }: Props) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">AI Cost Dashboard</h1>
      <p className="mt-1 text-sm text-neutral-500">Real-time monitoring of AI API usage and costs.</p>
      
      {/* Stats Cards */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-neutral-500">Total Cost (USD)</div>
          <div className="mt-2 text-3xl font-bold text-green-600">${totalCost.toFixed(4)}</div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-neutral-500">Total Tokens</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">{totalTokens.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-neutral-500">Total API Calls</div>
          <div className="mt-2 text-3xl font-bold text-purple-600">{logs.length}</div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="mt-8 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 text-right">Tokens (In/Out)</th>
                <th className="px-4 py-3 text-right">Cost ($)</th>
                <th className="px-4 py-3 text-right">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                    No AI logs recorded yet.
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50 transition">
                  <td className="px-4 py-3 text-neutral-600">
                    {new Date(log.created_at).toLocaleString('bn-BD')}
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-900">{log.model}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium">
                      {log.provider}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-600">
                    {log.input_tokens.toLocaleString()} / {log.output_tokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-green-700">
                    ${Number(log.cost_usd).toFixed(6)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-600">
                    {log.latency_ms} ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
