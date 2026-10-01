// frontend/app/admin/analytics/page.tsx
// Server component to fetch AI audit logs securely

import { createClient } from '@/lib/supabase/server';
import { CostDashboard } from '@/components/admin/cost-dashboard';

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  
  // Fetch recent 50 AI logs (ordered by newest first)
  const { data: logs } = await supabase
    .from('ai_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  // Calculate aggregate stats
  const totalCost = logs?.reduce((sum, log) => sum + Number(log.cost_usd || 0), 0) || 0;
  const totalTokens = logs?.reduce((sum, log) => sum + (log.input_tokens || 0) + (log.output_tokens || 0), 0) || 0;

  return (
    <CostDashboard 
      logs={logs || []} 
      totalCost={totalCost} 
      totalTokens={totalTokens} 
    />
  );
}
