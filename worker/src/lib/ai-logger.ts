// worker/src/lib/ai-logger.ts
// Utility to log AI API calls, costs, and latency to Supabase

import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS for inserting logs
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AiLogPayload {
  userId?: string;
  model: string;
  provider: string; // e.g., 'groq', 'gemini', 'openai'
  promptVersion?: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  status?: 'success' | 'error';
  errorMessage?: string;
}

export async function logAiCost(payload: AiLogPayload) {
  try {
    const { error } = await supabaseAdmin.from('ai_audit_log').insert({
      user_id: payload.userId || null,
      model: payload.model,
      provider: payload.provider,
      prompt_version: payload.promptVersion || null,
      input_tokens: payload.inputTokens,
      output_tokens: payload.outputTokens,
      cost_usd: payload.costUsd,
      latency_ms: payload.latencyMs,
      status: payload.status || 'success',
      error_message: payload.errorMessage || null,
    });

    if (error) {
      console.error('Failed to insert AI audit log:', error.message);
    }
  } catch (err) {
    // Never crash the main worker pipeline if logging fails
    console.error('Unexpected error in logAiCost:', err);
  }
}
