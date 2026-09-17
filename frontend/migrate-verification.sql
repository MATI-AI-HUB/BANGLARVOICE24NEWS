-- ═══════════════════════════════════════════════════════
--  Banglar Voice — AI Verification System Schema
-- ═══════════════════════════════════════════════════════

-- 1. Verification Queue
CREATE TABLE IF NOT EXISTS verification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  content_snapshot JSONB,
  status TEXT DEFAULT 'pending',
  priority INT DEFAULT 5,
  ai_started_at TIMESTAMPTZ,
  ai_completed_at TIMESTAMPTZ,
  ai_duration_ms INT,
  ai_consensus_score NUMERIC(5,2),
  ai_consensus_verdict TEXT,
  ai_confidence NUMERIC(3,2),
  ai_agents_count INT DEFAULT 0,
  assigned_to UUID,
  assigned_at TIMESTAMPTZ,
  checked_at TIMESTAMPTZ,
  checker_notes TEXT,
  human_override BOOLEAN DEFAULT FALSE,
  override_reason TEXT,
  time_to_approve_sec INT,
  rejection_reasons JSONB,
  fact_sources JSONB,
  tags TEXT[],
  priority_category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AI Agent Verifications
CREATE TABLE IF NOT EXISTS ai_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES verification_queue(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  agent_model TEXT,
  agent_version TEXT DEFAULT '1.0',
  passed BOOLEAN NOT NULL,
  score NUMERIC(5,2),
  confidence NUMERIC(3,2),
  verdict TEXT,
  reasoning TEXT,
  evidence JSONB,
  flagged_items JSONB,
  suggestions JSONB,
  model_tokens_in INT,
  model_tokens_out INT,
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aiv_queue ON ai_verifications(queue_id);
CREATE INDEX IF NOT EXISTS idx_aiv_agent ON ai_verifications(agent_name);

-- 3. Human Verification Checks
CREATE TABLE IF NOT EXISTS verification_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES verification_queue(id) ON DELETE CASCADE,
  check_type TEXT,
  passed BOOLEAN,
  notes TEXT,
  evidence JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Feedback Loop
CREATE TABLE IF NOT EXISTS verification_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES verification_queue(id),
  ai_verification_id UUID REFERENCES ai_verifications(id),
  human_verdict TEXT NOT NULL,
  ai_was_correct BOOLEAN,
  correct_verdict TEXT,
  feedback_notes TEXT,
  examples JSONB,
  is_training_ready BOOLEAN DEFAULT FALSE,
  used_in_training BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Agent Performance
CREATE TABLE IF NOT EXISTS agent_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL UNIQUE,
  total_checks INT DEFAULT 0,
  correct_checks INT DEFAULT 0,
  false_positive INT DEFAULT 0,
  false_negative INT DEFAULT 0,
  avg_confidence NUMERIC(3,2),
  avg_duration_ms INT,
  avg_cost_cents NUMERIC(10,4),
  current_weight NUMERIC(3,2) DEFAULT 1.00,
  last_10_accuracy NUMERIC(3,2),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Seed agent weights
INSERT INTO agent_performance (agent_name, current_weight) VALUES
  ('fact_checker', 2.00),
  ('language', 1.50),
  ('image', 1.50),
  ('video', 1.25),
  ('source', 2.00),
  ('bias', 1.75),
  ('legal', 2.50),
  ('seo', 0.75),
  ('brand_voice', 0.50),
  ('duplicate', 1.25)
ON CONFLICT (agent_name) DO NOTHING;

-- 6. Audit Log
CREATE TABLE IF NOT EXISTS verification_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  actor_type TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Extend articles table
ALTER TABLE articles 
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verification_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS ai_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS human_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_by UUID,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS fact_sources JSONB,
  ADD COLUMN IF NOT EXISTS content_credentials JSONB;

CREATE INDEX IF NOT EXISTS idx_articles_verif ON articles(verification_status);
CREATE INDEX IF NOT EXISTS idx_queue_status ON verification_queue(status);

-- 8. RLS Policies (basic)
ALTER TABLE verification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='verification_queue' AND policyname='vq_service_all') THEN
    CREATE POLICY vq_service_all ON verification_queue FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ai_verifications' AND policyname='aiv_service_all') THEN
    CREATE POLICY aiv_service_all ON ai_verifications FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agent_performance' AND policyname='ap_service_all') THEN
    CREATE POLICY ap_service_all ON agent_performance FOR ALL USING (true);
  END IF;
END $$;

