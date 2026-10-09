-- Captured from production on 2026-10-09: objects present in production but in no earlier migration.
-- Reference only for fresh projects; do NOT re-run on the production database.
-- Tables / views (with their own indexes, policies, grants)

CREATE TABLE public.newsroom_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid,
    job_type text NOT NULL,
    idempotency_key text NOT NULL,
    trace_id uuid DEFAULT gen_random_uuid() NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    job_status text DEFAULT 'ready'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 5 NOT NULL,
    available_at timestamp with time zone DEFAULT now() NOT NULL,
    locked_by text,
    locked_until timestamp with time zone,
    last_error_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT newsroom_jobs_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT newsroom_jobs_check CHECK ((attempts <= max_attempts)),
    CONSTRAINT newsroom_jobs_job_status_check CHECK ((job_status = ANY (ARRAY['ready'::text, 'running'::text, 'retry'::text, 'succeeded'::text, 'dead'::text, 'cancelled'::text]))),
    CONSTRAINT newsroom_jobs_job_type_check CHECK ((job_type = ANY (ARRAY['ingest'::text, 'verify'::text, 'classify_risk'::text, 'translate'::text, 'copy_edit'::text, 'validate_media'::text, 'publish'::text]))),
    CONSTRAINT newsroom_jobs_max_attempts_check CHECK ((max_attempts > 0))
);

ALTER TABLE ONLY public.newsroom_jobs
    ADD CONSTRAINT newsroom_jobs_idempotency_key_key UNIQUE (idempotency_key);

ALTER TABLE ONLY public.newsroom_jobs
    ADD CONSTRAINT newsroom_jobs_pkey PRIMARY KEY (id);

CREATE INDEX newsroom_jobs_article_idx ON public.newsroom_jobs USING btree (article_id);

CREATE INDEX newsroom_jobs_ready_idx ON public.newsroom_jobs USING btree (job_status, available_at, created_at);

ALTER TABLE ONLY public.newsroom_jobs
    ADD CONSTRAINT newsroom_jobs_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE RESTRICT;

ALTER TABLE public.newsroom_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY newsroom_service_manage_jobs ON public.newsroom_jobs TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.newsroom_jobs TO service_role;


CREATE TABLE public.newsroom_story_workflows (
    article_id uuid NOT NULL,
    workflow_state text DEFAULT 'queued'::text NOT NULL,
    risk_category text DEFAULT 'unclassified'::text NOT NULL,
    content_version_hash text,
    independent_source_count integer DEFAULT 0 NOT NULL,
    successful_verifier_count integer DEFAULT 0 NOT NULL,
    auto_publish_allowed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT newsroom_story_workflows_independent_source_count_check CHECK ((independent_source_count >= 0)),
    CONSTRAINT newsroom_story_workflows_risk_category_check CHECK ((risk_category = ANY (ARRAY['unclassified'::text, 'routine'::text, 'sensitive'::text, 'critical'::text]))),
    CONSTRAINT newsroom_story_workflows_successful_verifier_count_check CHECK ((successful_verifier_count >= 0)),
    CONSTRAINT newsroom_story_workflows_workflow_state_check CHECK ((workflow_state = ANY (ARRAY['queued'::text, 'verifying'::text, 'pending_editor'::text, 'pending_authority'::text, 'approved'::text, 'published'::text, 'rejected'::text, 'retracted'::text, 'blocked'::text])))
);

ALTER TABLE ONLY public.newsroom_story_workflows
    ADD CONSTRAINT newsroom_story_workflows_pkey PRIMARY KEY (article_id);

ALTER TABLE ONLY public.newsroom_story_workflows
    ADD CONSTRAINT newsroom_story_workflows_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE RESTRICT;

CREATE POLICY newsroom_editor_read_workflows ON public.newsroom_story_workflows FOR SELECT TO authenticated USING ((( SELECT public.current_app_role() AS current_app_role) = ANY (ARRAY['staff_reporter'::public.app_role, 'desk_editor'::public.app_role, 'chief_editor'::public.app_role, 'admin'::public.app_role])));

ALTER TABLE public.newsroom_story_workflows ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.newsroom_story_workflows TO service_role;
GRANT SELECT ON TABLE public.newsroom_story_workflows TO authenticated;


CREATE TABLE public.newsroom_ai_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid NOT NULL,
    stage text NOT NULL,
    provider text NOT NULL,
    model text NOT NULL,
    prompt_version text NOT NULL,
    input_hash text NOT NULL,
    output jsonb DEFAULT '{}'::jsonb NOT NULL,
    confidence numeric,
    run_status text DEFAULT 'queued'::text NOT NULL,
    error_code text,
    latency_ms integer,
    input_tokens integer,
    output_tokens integer,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT newsroom_ai_runs_confidence_check CHECK (((confidence IS NULL) OR ((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))),
    CONSTRAINT newsroom_ai_runs_input_tokens_check CHECK (((input_tokens IS NULL) OR (input_tokens >= 0))),
    CONSTRAINT newsroom_ai_runs_latency_ms_check CHECK (((latency_ms IS NULL) OR (latency_ms >= 0))),
    CONSTRAINT newsroom_ai_runs_output_tokens_check CHECK (((output_tokens IS NULL) OR (output_tokens >= 0))),
    CONSTRAINT newsroom_ai_runs_run_status_check CHECK ((run_status = ANY (ARRAY['queued'::text, 'running'::text, 'succeeded'::text, 'failed'::text, 'skipped'::text]))),
    CONSTRAINT newsroom_ai_runs_stage_check CHECK ((stage = ANY (ARRAY['claim_extraction'::text, 'source_verification'::text, 'counter_check'::text, 'risk_classification'::text, 'translation'::text, 'copy_edit'::text, 'image_validation'::text])))
);

ALTER TABLE ONLY public.newsroom_ai_runs
    ADD CONSTRAINT newsroom_ai_runs_pkey PRIMARY KEY (id);

CREATE INDEX newsroom_ai_runs_article_idx ON public.newsroom_ai_runs USING btree (article_id, created_at DESC);

ALTER TABLE ONLY public.newsroom_ai_runs
    ADD CONSTRAINT newsroom_ai_runs_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE RESTRICT;

ALTER TABLE public.newsroom_ai_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY newsroom_editor_read_ai_runs ON public.newsroom_ai_runs FOR SELECT TO authenticated USING ((( SELECT public.current_app_role() AS current_app_role) = ANY (ARRAY['staff_reporter'::public.app_role, 'desk_editor'::public.app_role, 'chief_editor'::public.app_role, 'admin'::public.app_role])));

GRANT ALL ON TABLE public.newsroom_ai_runs TO service_role;
GRANT SELECT ON TABLE public.newsroom_ai_runs TO authenticated;


CREATE TABLE public.newsroom_review_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    reviewer_role text NOT NULL,
    decision text NOT NULL,
    authority_approval boolean DEFAULT false NOT NULL,
    article_version_hash text NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    policy_version text DEFAULT 'v1'::text NOT NULL,
    decided_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT newsroom_review_decisions_decision_check CHECK ((decision = ANY (ARRAY['approve'::text, 'reject'::text, 'request_changes'::text, 'escalate'::text])))
);

ALTER TABLE ONLY public.newsroom_review_decisions
    ADD CONSTRAINT newsroom_review_decisions_pkey PRIMARY KEY (id);

CREATE INDEX newsroom_decisions_article_idx ON public.newsroom_review_decisions USING btree (article_id, decided_at DESC);

CREATE INDEX newsroom_decisions_reviewer_idx ON public.newsroom_review_decisions USING btree (reviewer_id);

ALTER TABLE ONLY public.newsroom_review_decisions
    ADD CONSTRAINT newsroom_review_decisions_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.newsroom_review_decisions
    ADD CONSTRAINT newsroom_review_decisions_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

CREATE POLICY newsroom_editor_read_decisions ON public.newsroom_review_decisions FOR SELECT TO authenticated USING ((( SELECT public.current_app_role() AS current_app_role) = ANY (ARRAY['desk_editor'::public.app_role, 'chief_editor'::public.app_role, 'admin'::public.app_role])));

ALTER TABLE public.newsroom_review_decisions ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.newsroom_review_decisions TO service_role;
GRANT SELECT ON TABLE public.newsroom_review_decisions TO authenticated;


CREATE TABLE public.newsroom_media_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid NOT NULL,
    bucket_id text,
    object_path text,
    source_url text,
    license text DEFAULT ''::text NOT NULL,
    attribution text DEFAULT ''::text NOT NULL,
    alt_text_bn text DEFAULT ''::text NOT NULL,
    is_representational boolean DEFAULT false NOT NULL,
    asset_status text DEFAULT 'discovered'::text NOT NULL,
    content_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT newsroom_media_assets_asset_status_check CHECK ((asset_status = ANY (ARRAY['discovered'::text, 'needs_rights_review'::text, 'approved'::text, 'stored'::text, 'rejected'::text]))),
    CONSTRAINT newsroom_media_assets_check CHECK (((bucket_id IS NULL) = (object_path IS NULL)))
);

ALTER TABLE ONLY public.newsroom_media_assets
    ADD CONSTRAINT newsroom_media_assets_pkey PRIMARY KEY (id);

CREATE INDEX newsroom_media_article_idx ON public.newsroom_media_assets USING btree (article_id, asset_status);

ALTER TABLE ONLY public.newsroom_media_assets
    ADD CONSTRAINT newsroom_media_assets_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE RESTRICT;

CREATE POLICY newsroom_editor_read_media ON public.newsroom_media_assets FOR SELECT TO authenticated USING ((( SELECT public.current_app_role() AS current_app_role) = ANY (ARRAY['staff_reporter'::public.app_role, 'desk_editor'::public.app_role, 'chief_editor'::public.app_role, 'admin'::public.app_role])));

ALTER TABLE public.newsroom_media_assets ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.newsroom_media_assets TO service_role;
GRANT SELECT ON TABLE public.newsroom_media_assets TO authenticated;


CREATE TABLE public.newsroom_audit_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid,
    actor_id uuid,
    event_type text NOT NULL,
    from_state text,
    to_state text,
    event_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.newsroom_audit_events
    ADD CONSTRAINT newsroom_audit_events_pkey PRIMARY KEY (id);

CREATE INDEX newsroom_audit_actor_idx ON public.newsroom_audit_events USING btree (actor_id);

CREATE INDEX newsroom_audit_article_idx ON public.newsroom_audit_events USING btree (article_id, created_at DESC);

ALTER TABLE ONLY public.newsroom_audit_events
    ADD CONSTRAINT newsroom_audit_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.newsroom_audit_events
    ADD CONSTRAINT newsroom_audit_events_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE RESTRICT;

CREATE POLICY newsroom_admin_read_audit ON public.newsroom_audit_events FOR SELECT TO authenticated USING ((( SELECT public.current_app_role() AS current_app_role) = ANY (ARRAY['chief_editor'::public.app_role, 'admin'::public.app_role])));

ALTER TABLE public.newsroom_audit_events ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.newsroom_audit_events TO service_role;
GRANT SELECT ON TABLE public.newsroom_audit_events TO authenticated;


CREATE TABLE public.newsroom_verification_policies (
    category text NOT NULL,
    requires_human_review boolean DEFAULT true NOT NULL,
    requires_authority_approval boolean DEFAULT false NOT NULL,
    min_independent_sources smallint DEFAULT 2 NOT NULL,
    min_successful_verifiers smallint DEFAULT 2 NOT NULL,
    auto_publish_allowed boolean DEFAULT false NOT NULL,
    policy_version text DEFAULT 'v1'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT newsroom_verification_policies_category_check CHECK ((category = ANY (ARRAY['unclassified'::text, 'routine'::text, 'sensitive'::text, 'critical'::text]))),
    CONSTRAINT newsroom_verification_policies_min_independent_sources_check CHECK ((min_independent_sources >= 1)),
    CONSTRAINT newsroom_verification_policies_min_successful_verifiers_check CHECK ((min_successful_verifiers >= 1))
);

ALTER TABLE ONLY public.newsroom_verification_policies
    ADD CONSTRAINT newsroom_verification_policies_pkey PRIMARY KEY (category);

CREATE POLICY newsroom_admin_read_policies ON public.newsroom_verification_policies FOR SELECT TO authenticated USING ((( SELECT public.current_app_role() AS current_app_role) = ANY (ARRAY['chief_editor'::public.app_role, 'admin'::public.app_role])));

ALTER TABLE public.newsroom_verification_policies ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.newsroom_verification_policies TO service_role;
GRANT SELECT ON TABLE public.newsroom_verification_policies TO authenticated;


CREATE TABLE public.newsroom_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid NOT NULL,
    claim_text text NOT NULL,
    claim_type text DEFAULT 'factual'::text NOT NULL,
    assessment text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    content_version_hash text,
    CONSTRAINT newsroom_claims_assessment_check CHECK ((assessment = ANY (ARRAY['pending'::text, 'supported'::text, 'contradicted'::text, 'uncertain'::text, 'unsupported'::text]))),
    CONSTRAINT newsroom_claims_claim_text_check CHECK ((length(btrim(claim_text)) > 0))
);

ALTER TABLE ONLY public.newsroom_claims
    ADD CONSTRAINT newsroom_claims_article_id_id_key UNIQUE (article_id, id);

ALTER TABLE ONLY public.newsroom_claims
    ADD CONSTRAINT newsroom_claims_pkey PRIMARY KEY (id);

CREATE INDEX newsroom_claims_article_idx ON public.newsroom_claims USING btree (article_id, created_at);

CREATE INDEX newsroom_claims_version_idx ON public.newsroom_claims USING btree (article_id, content_version_hash, assessment);

ALTER TABLE ONLY public.newsroom_claims
    ADD CONSTRAINT newsroom_claims_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE RESTRICT;

ALTER TABLE public.newsroom_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY newsroom_editor_read_claims ON public.newsroom_claims FOR SELECT TO authenticated USING ((( SELECT public.current_app_role() AS current_app_role) = ANY (ARRAY['staff_reporter'::public.app_role, 'desk_editor'::public.app_role, 'chief_editor'::public.app_role, 'admin'::public.app_role])));

GRANT ALL ON TABLE public.newsroom_claims TO service_role;
GRANT SELECT ON TABLE public.newsroom_claims TO authenticated;


CREATE TABLE public.newsroom_evidence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid NOT NULL,
    claim_id uuid NOT NULL,
    source_name text NOT NULL,
    source_url text NOT NULL,
    source_domain text,
    independence_key text,
    source_published_at timestamp with time zone,
    retrieved_at timestamp with time zone DEFAULT now() NOT NULL,
    evidence_summary text DEFAULT ''::text NOT NULL,
    supports_claim text DEFAULT 'unassessed'::text NOT NULL,
    content_hash text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    content_version_hash text,
    CONSTRAINT newsroom_evidence_supports_claim_check CHECK ((supports_claim = ANY (ARRAY['supports'::text, 'contradicts'::text, 'context_only'::text, 'unassessed'::text])))
);

ALTER TABLE ONLY public.newsroom_evidence
    ADD CONSTRAINT newsroom_evidence_pkey PRIMARY KEY (id);

CREATE INDEX newsroom_evidence_article_idx ON public.newsroom_evidence USING btree (article_id, claim_id);

CREATE INDEX newsroom_evidence_claim_idx ON public.newsroom_evidence USING btree (claim_id);

CREATE INDEX newsroom_evidence_version_idx ON public.newsroom_evidence USING btree (article_id, content_version_hash, supports_claim);

ALTER TABLE ONLY public.newsroom_evidence
    ADD CONSTRAINT newsroom_evidence_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.newsroom_evidence
    ADD CONSTRAINT newsroom_evidence_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.newsroom_claims(id) ON DELETE RESTRICT;

CREATE POLICY newsroom_editor_read_evidence ON public.newsroom_evidence FOR SELECT TO authenticated USING ((( SELECT public.current_app_role() AS current_app_role) = ANY (ARRAY['staff_reporter'::public.app_role, 'desk_editor'::public.app_role, 'chief_editor'::public.app_role, 'admin'::public.app_role])));

ALTER TABLE public.newsroom_evidence ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.newsroom_evidence TO service_role;
GRANT SELECT ON TABLE public.newsroom_evidence TO authenticated;


CREATE TABLE public.public_article_previews (
    article_id uuid NOT NULL,
    title_bn text NOT NULL,
    title_en text DEFAULT ''::text NOT NULL,
    excerpt_bn text DEFAULT ''::text NOT NULL,
    category text DEFAULT 'national'::text NOT NULL,
    category_key text DEFAULT 'national'::text NOT NULL,
    thumbnail_url text DEFAULT ''::text NOT NULL,
    featured_image text DEFAULT ''::text NOT NULL,
    is_premium boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.public_article_previews
    ADD CONSTRAINT public_article_previews_pkey PRIMARY KEY (article_id);

CREATE INDEX public_article_previews_published_idx ON public.public_article_previews USING btree (published_at DESC);

ALTER TABLE ONLY public.public_article_previews
    ADD CONSTRAINT public_article_previews_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;

CREATE POLICY "public read article previews" ON public.public_article_previews FOR SELECT TO authenticated, anon USING (true);

ALTER TABLE public.public_article_previews ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.public_article_previews TO service_role;
GRANT SELECT ON TABLE public.public_article_previews TO anon;
GRANT SELECT ON TABLE public.public_article_previews TO authenticated;


CREATE VIEW public.public_source_registry WITH (security_invoker='true') AS
 SELECT id,
    name_en,
    name_bn,
    domain,
    is_active,
    created_at
   FROM public.source_registry
  WHERE ((feed_enabled = true) AND (is_active = true));

GRANT ALL ON TABLE public.public_source_registry TO authenticated;
GRANT ALL ON TABLE public.public_source_registry TO service_role;
GRANT SELECT ON TABLE public.public_source_registry TO anon;

-- Functions
CREATE OR REPLACE FUNCTION public.admin_grant_manual_subscription(p_user_id uuid, p_plan text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_interval text DEFAULT 'monthly'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_subscription_id uuid;
  v_actor_id uuid := auth.uid();
BEGIN
  IF v_actor_id IS NULL OR public.current_app_role() <> 'admin'::public.app_role THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL OR p_plan NOT IN ('premium', 'team') THEN
    RAISE EXCEPTION 'valid user and premium/team plan required' USING ERRCODE = '22023';
  END IF;
  IF p_interval NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'interval must be monthly or yearly' USING ERRCODE = '22023';
  END IF;
  IF p_expires_at IS NOT NULL AND p_expires_at <= now() THEN
    RAISE EXCEPTION 'expiration must be in the future or null' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles AS p WHERE p.id = p_user_id) THEN
    RAISE EXCEPTION 'user profile not found' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  UPDATE public.subscriptions AS s
  SET status = 'canceled', updated_at = now()
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND s.plan IN ('premium', 'team');

  INSERT INTO public.subscriptions (
    user_id, plan, status, amount_bdt, interval, provider,
    started_at, expires_at, updated_at
  ) VALUES (
    p_user_id, p_plan, 'active', 0, p_interval, 'manual',
    now(), p_expires_at, now()
  )
  RETURNING id INTO v_subscription_id;

  INSERT INTO public.audit_log (actor_id, action, detail)
  VALUES (
    v_actor_id,
    'manual_subscription_granted',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'subscription_id', v_subscription_id,
      'plan', p_plan,
      'expires_at', p_expires_at
    )
  );

  RETURN v_subscription_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.enforce_field_report_hardening()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role public.app_role;
  v_actor uuid := auth.uid();
  v_request_role text := auth.role();
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF v_request_role = 'service_role' THEN
      IF NEW.status = 'pending_review'::public.report_status THEN
        INSERT INTO public.audit_log(actor_id,action,detail)
        VALUES (NULL,'field_report_status_change',jsonb_build_object(
          'report_id',NEW.id,'from_status',NULL,'to_status',NEW.status::text,'actor_role','service_role'));
      END IF;
      RETURN NEW;
    END IF;

    IF v_request_role IS DISTINCT FROM 'authenticated' OR v_actor IS NULL THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='authenticated reporter required';
    END IF;
    SELECT public.current_app_role() INTO v_role;
    IF v_role NOT IN ('citizen_reporter'::public.app_role,'staff_reporter'::public.app_role) THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='reporter role required';
    END IF;
    IF NEW.reporter_id IS DISTINCT FROM v_actor THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='reporter_id must equal auth.uid()';
    END IF;
    IF NEW.status NOT IN ('draft'::public.report_status,'pending_review'::public.report_status) THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='report insert status must be draft or pending_review';
    END IF;
    NEW.ai_score := NULL;
    NEW.ai_transcript := '';
    NEW.ai_summary := '';
    NEW.ai_translation_en := '';
    NEW.ai_duplicate_of := NULL;
    IF NEW.status='pending_review'::public.report_status THEN
      INSERT INTO public.audit_log(actor_id,action,detail)
      VALUES (v_actor,'field_report_status_change',jsonb_build_object(
        'report_id',NEW.id,'from_status',NULL,'to_status',NEW.status::text,'actor_role',v_request_role));
    END IF;
    RETURN NEW;
  END IF;

  IF v_request_role = 'service_role' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.audit_log(actor_id,action,detail)
      VALUES (NULL,'field_report_status_change',jsonb_build_object(
        'report_id',OLD.id,'from_status',OLD.status::text,'to_status',NEW.status::text,'actor_role','service_role'));
    END IF;
    RETURN NEW;
  END IF;

  v_role := public.current_app_role();
  IF v_role IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='profile role required';
  END IF;

  IF v_role NOT IN ('desk_editor'::public.app_role,'chief_editor'::public.app_role,'admin'::public.app_role) THEN
    IF v_actor IS NULL OR v_role NOT IN ('citizen_reporter'::public.app_role,'staff_reporter'::public.app_role)
       OR OLD.reporter_id IS DISTINCT FROM v_actor
       OR OLD.status <> 'draft'::public.report_status
       OR NEW.status <> 'pending_review'::public.report_status THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='reporter UPDATE must be own draft to pending_review';
    END IF;
    IF NEW.reporter_id IS DISTINCT FROM OLD.reporter_id
       OR NEW.ai_score IS DISTINCT FROM OLD.ai_score
       OR NEW.ai_transcript IS DISTINCT FROM OLD.ai_transcript
       OR NEW.ai_summary IS DISTINCT FROM OLD.ai_summary
       OR NEW.ai_translation_en IS DISTINCT FROM OLD.ai_translation_en
       OR NEW.ai_duplicate_of IS DISTINCT FROM OLD.ai_duplicate_of
       OR NEW.id IS DISTINCT FROM OLD.id
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.media_urls IS DISTINCT FROM OLD.media_urls
       OR NEW.location IS DISTINCT FROM OLD.location
       OR NEW.lat IS DISTINCT FROM OLD.lat
       OR NEW.lng IS DISTINCT FROM OLD.lng
       OR NEW.captured_at IS DISTINCT FROM OLD.captured_at
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='reporter may only submit the existing draft';
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.audit_log(actor_id,action,detail)
    VALUES (v_actor,'field_report_status_change',jsonb_build_object(
      'report_id',OLD.id,'from_status',OLD.status::text,'to_status',NEW.status::text,'actor_role',v_request_role));
  END IF;
  RETURN NEW;
END
$function$
;
CREATE OR REPLACE FUNCTION public.newsroom_claim_jobs(p_worker_id text, p_limit integer DEFAULT 1)
 RETURNS SETOF newsroom_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF p_worker_id IS NULL OR length(btrim(p_worker_id))=0 OR length(p_worker_id)>128 THEN
    RAISE EXCEPTION 'Invalid worker identifier' USING ERRCODE = '22023';
  END IF;
  UPDATE public.newsroom_jobs
    SET job_status='dead',locked_by=NULL,locked_until=NULL,completed_at=now(),last_error_code=coalesce(last_error_code,'lease_expired_max_attempts')
    WHERE job_status='running' AND locked_until < now() AND attempts >= max_attempts;

  RETURN QUERY
  WITH picked AS (
    SELECT j.id FROM public.newsroom_jobs AS j
    WHERE j.attempts < j.max_attempts
      AND ((j.job_status IN ('ready','retry') AND j.available_at <= now())
        OR (j.job_status='running' AND j.locked_until < now()))
    ORDER BY j.available_at,j.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(coalesce(p_limit,1),1),10)
  ), claimed AS (
    UPDATE public.newsroom_jobs AS j
      SET job_status='running',attempts=j.attempts+1,locked_by=p_worker_id,locked_until=now()+interval '5 minutes'
      FROM picked WHERE j.id=picked.id
      RETURNING j.*
  ), workflow_updates AS (
    UPDATE public.newsroom_story_workflows AS w
      SET workflow_state='verifying',updated_at=now()
      FROM claimed AS c
      WHERE c.job_type='verify' AND c.article_id=w.article_id AND w.workflow_state IN ('queued','verifying')
      RETURNING w.article_id
  )
  SELECT c.* FROM claimed AS c CROSS JOIN (SELECT count(*) FROM workflow_updates) AS completed_updates;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.newsroom_finish_job(p_job_id uuid, p_succeeded boolean, p_error_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_job public.newsroom_jobs%ROWTYPE;
  v_new_status text;
BEGIN
  SELECT * INTO v_job FROM public.newsroom_jobs WHERE id=p_job_id AND job_status='running' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No running job found for this id' USING ERRCODE = 'P0002'; END IF;
  v_new_status := CASE WHEN p_succeeded THEN 'succeeded' WHEN v_job.attempts >= v_job.max_attempts THEN 'dead' ELSE 'retry' END;

  UPDATE public.newsroom_jobs
    SET job_status=v_new_status,
        available_at=CASE WHEN v_new_status='retry' THEN now()+make_interval(secs=>LEAST(3600,30*power(2,LEAST(v_job.attempts,7))::integer)) ELSE available_at END,
        locked_by=NULL,locked_until=NULL,
        last_error_code=CASE WHEN p_succeeded THEN NULL ELSE left(coalesce(p_error_code,'worker_error'),120) END,
        completed_at=CASE WHEN v_new_status IN ('succeeded','dead') THEN now() ELSE NULL END
    WHERE id=p_job_id;

  IF v_job.job_type='verify' AND v_job.article_id IS NOT NULL THEN
    UPDATE public.newsroom_story_workflows AS w
      SET workflow_state=CASE
          WHEN v_new_status='succeeded' AND EXISTS (SELECT 1 FROM public.newsroom_verification_policies AS p WHERE p.category=w.risk_category AND p.requires_authority_approval AND p.active) THEN 'pending_authority'
          WHEN v_new_status='succeeded' THEN 'pending_editor'
          WHEN v_new_status='dead' THEN 'blocked'
          ELSE 'queued'
        END,
        updated_at=now()
      WHERE w.article_id=v_job.article_id AND w.workflow_state<>'published';
  END IF;

  INSERT INTO public.newsroom_audit_events(article_id,event_type,from_state,to_state,event_metadata)
  VALUES (v_job.article_id,'job_'||v_new_status,v_job.job_status,v_new_status,
          jsonb_build_object('job_id',p_job_id,'job_type',v_job.job_type,'attempt',v_job.attempts,'error_code',CASE WHEN p_succeeded THEN NULL ELSE left(coalesce(p_error_code,'worker_error'),120) END));
  RETURN jsonb_build_object('job_id',p_job_id,'job_status',v_new_status,'attempts',v_job.attempts);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.newsroom_finish_job(p_job_id uuid, p_worker_id text, p_succeeded boolean, p_error_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_job public.newsroom_jobs%ROWTYPE;
  v_new_status text;
BEGIN
  IF p_worker_id IS NULL OR length(btrim(p_worker_id))=0 OR length(p_worker_id)>128 THEN
    RAISE EXCEPTION 'Invalid worker identifier' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_job FROM public.newsroom_jobs
   WHERE id=p_job_id AND job_status='running' AND locked_by=p_worker_id AND locked_until>now()
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job lease missing, expired, or owned by another worker' USING ERRCODE = '42501'; END IF;
  v_new_status := CASE WHEN p_succeeded THEN 'succeeded' WHEN v_job.attempts >= v_job.max_attempts THEN 'dead' ELSE 'retry' END;

  UPDATE public.newsroom_jobs
    SET job_status=v_new_status,
        available_at=CASE WHEN v_new_status='retry' THEN now()+make_interval(secs=>LEAST(3600,30*power(2,LEAST(v_job.attempts,7))::integer)) ELSE available_at END,
        locked_by=NULL,locked_until=NULL,
        last_error_code=CASE WHEN p_succeeded THEN NULL ELSE left(coalesce(p_error_code,'worker_error'),120) END,
        completed_at=CASE WHEN v_new_status IN ('succeeded','dead') THEN now() ELSE NULL END
    WHERE id=p_job_id;

  IF v_job.job_type='verify' AND v_job.article_id IS NOT NULL THEN
    UPDATE public.newsroom_story_workflows AS w
      SET workflow_state=CASE
          WHEN v_new_status='succeeded' AND EXISTS (SELECT 1 FROM public.newsroom_verification_policies AS p WHERE p.category=w.risk_category AND p.requires_authority_approval AND p.active) THEN 'pending_authority'
          WHEN v_new_status='succeeded' THEN 'pending_editor'
          WHEN v_new_status='dead' THEN 'blocked'
          ELSE 'queued'
        END,
        updated_at=now()
      WHERE w.article_id=v_job.article_id AND w.workflow_state<>'published';
  END IF;

  INSERT INTO public.newsroom_audit_events(article_id,event_type,from_state,to_state,event_metadata)
  VALUES (v_job.article_id,'job_'||v_new_status,v_job.job_status,v_new_status,
          jsonb_build_object('job_id',p_job_id,'job_type',v_job.job_type,'attempt',v_job.attempts,'worker_id',p_worker_id,'error_code',CASE WHEN p_succeeded THEN NULL ELSE left(coalesce(p_error_code,'worker_error'),120) END));
  RETURN jsonb_build_object('job_id',p_job_id,'job_status',v_new_status,'attempts',v_job.attempts);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.newsroom_publish_article(p_article_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_db_role text := auth.role();
  v_role public.app_role;
  v_article public.articles%ROWTYPE;
  v_workflow public.newsroom_story_workflows%ROWTYPE;
  v_policy public.newsroom_verification_policies%ROWTYPE;
  v_hash text;
  v_source_count integer;
  v_verifier_count integer;
  v_claim_count integer;
  v_unresolved_count integer;
  v_human_approved boolean;
  v_authority_approved boolean;
BEGIN
  IF auth.uid() IS NULL AND v_db_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Authenticated editor or worker role required' USING ERRCODE = '42501';
  END IF;
  IF v_db_role IS DISTINCT FROM 'service_role' THEN
    v_role := public.current_app_role();
    IF v_role IS NULL OR NOT (v_role = ANY (ARRAY['desk_editor'::public.app_role,'chief_editor'::public.app_role,'admin'::public.app_role])) THEN
      RAISE EXCEPTION 'Editorial publish role required' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT * INTO v_article FROM public.articles WHERE id=p_article_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Article not found' USING ERRCODE = 'P0002'; END IF;
  IF v_article.status='published' THEN
    RETURN jsonb_build_object('article_id',p_article_id,'status','published','idempotent',true);
  END IF;
  IF v_article.status IN ('archived','retracted') THEN RAISE EXCEPTION 'Archived or retracted article cannot be published' USING ERRCODE = '22023'; END IF;

  SELECT * INTO v_workflow FROM public.newsroom_story_workflows WHERE article_id=p_article_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Article has not entered newsroom verification' USING ERRCODE = 'P0002'; END IF;
  v_hash := encode(extensions.digest(convert_to(concat_ws(chr(10),coalesce(v_article.title_bn,''),coalesce(v_article.content_bn,''),coalesce(v_article.title_en,''),coalesce(v_article.content_en,''),coalesce(v_article.source_url,'')),'UTF8'),'sha256'),'hex');
  IF v_workflow.content_version_hash IS DISTINCT FROM v_hash THEN
    RAISE EXCEPTION 'Article changed after verification; resubmit the current version' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_policy FROM public.newsroom_verification_policies WHERE category=v_workflow.risk_category AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active verification policy for article risk' USING ERRCODE = '22023'; END IF;

  SELECT count(DISTINCT coalesce(nullif(btrim(independence_key),''),nullif(lower(btrim(source_domain)),''),source_url))
    INTO v_source_count FROM public.newsroom_evidence
    WHERE article_id=p_article_id AND content_version_hash=v_hash AND supports_claim='supports';
  SELECT count(DISTINCT provider||':'||model)
    INTO v_verifier_count FROM public.newsroom_ai_runs
    WHERE article_id=p_article_id AND input_hash=v_hash AND run_status='succeeded' AND stage IN ('source_verification','counter_check');
  SELECT count(*),count(*) FILTER (WHERE assessment<>'supported')
    INTO v_claim_count,v_unresolved_count FROM public.newsroom_claims
    WHERE article_id=p_article_id AND content_version_hash=v_hash;

  IF v_source_count < v_policy.min_independent_sources THEN RAISE EXCEPTION 'Insufficient independent supporting sources' USING ERRCODE = '22023'; END IF;
  IF v_verifier_count < v_policy.min_successful_verifiers THEN RAISE EXCEPTION 'Insufficient successful independent verifier models' USING ERRCODE = '22023'; END IF;
  IF v_claim_count=0 OR v_unresolved_count>0 THEN RAISE EXCEPTION 'Claims are missing or unresolved; publication blocked' USING ERRCODE = '22023'; END IF;

  SELECT EXISTS(SELECT 1 FROM public.newsroom_review_decisions d
    WHERE d.article_id=p_article_id AND d.article_version_hash=v_hash AND d.decision='approve'
      AND d.reviewer_role IN ('desk_editor','chief_editor','admin')) INTO v_human_approved;
  SELECT EXISTS(SELECT 1 FROM public.newsroom_review_decisions d
    WHERE d.article_id=p_article_id AND d.article_version_hash=v_hash AND d.decision='approve'
      AND d.reviewer_role='admin' AND d.authority_approval) INTO v_authority_approved;

  IF v_policy.requires_authority_approval AND NOT v_authority_approved THEN
    RAISE EXCEPTION 'Sensitive or critical publication requires admin authority approval' USING ERRCODE = '42501';
  END IF;
  IF (v_policy.requires_human_review OR NOT v_policy.auto_publish_allowed) AND NOT v_human_approved THEN
    RAISE EXCEPTION 'Human editorial approval is required by the active policy' USING ERRCODE = '42501';
  END IF;
  IF v_policy.requires_authority_approval AND v_workflow.workflow_state<>'approved' THEN
    RAISE EXCEPTION 'Authority-reviewed workflow must be approved before publication' USING ERRCODE = '22023';
  END IF;

  UPDATE public.articles
    SET status='published',workflow_status='published',editorial_status='published',
        verification_status='verified',human_verified=v_human_approved,
        published_at=coalesce(published_at,now()),updated_at=now()
    WHERE id=p_article_id;
  UPDATE public.newsroom_story_workflows SET workflow_state='published',updated_at=now() WHERE article_id=p_article_id;
  INSERT INTO public.newsroom_audit_events(article_id,actor_id,event_type,from_state,to_state,event_metadata)
    VALUES (p_article_id,auth.uid(),'article_published',v_workflow.workflow_state,'published',
            jsonb_build_object('source_count',v_source_count,'verifier_count',v_verifier_count,'claim_count',v_claim_count,'authority_approval',v_authority_approved,'content_version_hash',v_hash));
  RETURN jsonb_build_object('article_id',p_article_id,'status','published','source_count',v_source_count,'verifier_count',v_verifier_count,'human_approved',v_human_approved,'authority_approved',v_authority_approved);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.newsroom_record_review_decision(p_article_id uuid, p_decision text, p_article_version_hash text, p_reason text DEFAULT ''::text, p_authority_approval boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role public.app_role;
  v_workflow public.newsroom_story_workflows%ROWTYPE;
  v_policy public.newsroom_verification_policies%ROWTYPE;
  v_decision_id uuid;
  v_next_state text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  v_role := public.current_app_role();
  IF v_role IS NULL OR NOT (v_role = ANY (ARRAY['desk_editor'::public.app_role,'chief_editor'::public.app_role,'admin'::public.app_role])) THEN
    RAISE EXCEPTION 'Editorial decision role required' USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('approve','reject','request_changes','escalate') THEN
    RAISE EXCEPTION 'Invalid editorial decision' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_workflow FROM public.newsroom_story_workflows WHERE article_id=p_article_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Article has not entered newsroom verification' USING ERRCODE = 'P0002'; END IF;
  IF v_workflow.content_version_hash IS DISTINCT FROM p_article_version_hash THEN
    RAISE EXCEPTION 'Article changed after verification; resubmit the current version' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_policy FROM public.newsroom_verification_policies WHERE category=v_workflow.risk_category AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active verification policy for article risk' USING ERRCODE = '22023'; END IF;
  IF p_authority_approval AND v_role<>'admin'::public.app_role THEN
    RAISE EXCEPTION 'Authority approval is restricted to admin role' USING ERRCODE = '42501';
  END IF;
  IF p_decision='approve' AND v_policy.requires_authority_approval AND (v_role<>'admin'::public.app_role OR NOT p_authority_approval) THEN
    RAISE EXCEPTION 'Sensitive or critical stories require explicit admin authority approval' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.newsroom_review_decisions(article_id,reviewer_id,reviewer_role,decision,authority_approval,article_version_hash,reason,policy_version)
  VALUES (p_article_id,auth.uid(),v_role::text,p_decision,p_authority_approval,p_article_version_hash,left(coalesce(p_reason,''),4000),v_policy.policy_version)
  RETURNING id INTO v_decision_id;

  v_next_state := CASE p_decision WHEN 'approve' THEN 'approved' WHEN 'reject' THEN 'rejected' WHEN 'escalate' THEN 'pending_authority' ELSE 'pending_editor' END;
  UPDATE public.newsroom_story_workflows SET workflow_state=v_next_state,updated_at=now() WHERE article_id=p_article_id;
  INSERT INTO public.newsroom_audit_events(article_id,actor_id,event_type,from_state,to_state,event_metadata)
  VALUES (p_article_id,auth.uid(),'review_'||p_decision,v_workflow.workflow_state,v_next_state,
          jsonb_build_object('decision_id',v_decision_id,'authority_approval',p_authority_approval,'article_version_hash',p_article_version_hash));
  RETURN jsonb_build_object('decision_id',v_decision_id,'workflow_state',v_next_state,'authority_approval',p_authority_approval);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.newsroom_submit_for_verification(p_article_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog, public'
AS $function$
DECLARE
  v_role public.app_role;
  v_article public.articles%ROWTYPE;
  v_risk text;
  v_hash text;
  v_job_id uuid;
  v_state text;
  v_auto_publish boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  v_role := public.current_app_role();
  IF v_role IS NULL OR NOT (v_role = ANY (ARRAY['staff_reporter'::public.app_role,'desk_editor'::public.app_role,'chief_editor'::public.app_role,'admin'::public.app_role])) THEN
    RAISE EXCEPTION 'Role cannot submit newsroom articles' USING ERRCODE = '42501';
  END IF;

  SELECT a.* INTO v_article FROM public.articles AS a WHERE a.id = p_article_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Article not found' USING ERRCODE = 'P0002'; END IF;
  IF public.platform_role() = 'reporter' AND v_article.author_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Reporters may submit only their own articles' USING ERRCODE = '42501';
  END IF;
  IF v_article.status IN ('published','archived','retracted') THEN
    RAISE EXCEPTION 'Published, archived, or retracted articles cannot be resubmitted' USING ERRCODE = '22023';
  END IF;

  v_risk := CASE lower(btrim(coalesce(v_article.risk_level,'')))
    WHEN 'low' THEN 'routine'
    WHEN 'medium' THEN 'sensitive'
    WHEN 'high' THEN 'sensitive'
    WHEN 'sensitive' THEN 'sensitive'
    WHEN 'critical' THEN 'critical'
    ELSE 'unclassified'
  END;
  SELECT (p.auto_publish_allowed AND NOT p.requires_human_review AND NOT p.requires_authority_approval)
    INTO v_auto_publish
  FROM public.newsroom_verification_policies AS p
  WHERE p.category = v_risk AND p.active;
  v_auto_publish := coalesce(v_auto_publish, false);

  v_hash := encode(extensions.digest(convert_to(concat_ws(chr(10),coalesce(v_article.title_bn,''),coalesce(v_article.content_bn,''),coalesce(v_article.title_en,''),coalesce(v_article.content_en,''),coalesce(v_article.source_url,'')),'UTF8'),'sha256'),'hex');

  INSERT INTO public.newsroom_story_workflows(article_id,workflow_state,risk_category,content_version_hash,independent_source_count,successful_verifier_count,auto_publish_allowed,updated_at)
  VALUES (p_article_id,'queued',v_risk,v_hash,0,0,v_auto_publish,now())
  ON CONFLICT (article_id) DO UPDATE
    SET workflow_state='queued', risk_category=EXCLUDED.risk_category, content_version_hash=EXCLUDED.content_version_hash,
        independent_source_count=0, successful_verifier_count=0,
        auto_publish_allowed=EXCLUDED.auto_publish_allowed, updated_at=now()
    WHERE public.newsroom_story_workflows.content_version_hash IS DISTINCT FROM EXCLUDED.content_version_hash
      AND public.newsroom_story_workflows.workflow_state <> 'published';

  IF EXISTS (SELECT 1 FROM public.newsroom_story_workflows WHERE article_id=p_article_id AND workflow_state='published') THEN
    RAISE EXCEPTION 'Article workflow is already published' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.newsroom_jobs(article_id,job_type,idempotency_key,payload)
  VALUES (p_article_id,'verify','verify:'||p_article_id::text||':'||v_hash,
          jsonb_build_object('article_id',p_article_id,'content_version_hash',v_hash,'risk_category',v_risk))
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_job_id;

  IF v_job_id IS NULL THEN
    SELECT id INTO v_job_id FROM public.newsroom_jobs WHERE idempotency_key='verify:'||p_article_id::text||':'||v_hash;
  ELSE
    INSERT INTO public.newsroom_audit_events(article_id,actor_id,event_type,to_state,event_metadata)
    VALUES (p_article_id,auth.uid(),'verification_submitted','queued',jsonb_build_object('content_version_hash',v_hash,'risk_category',v_risk,'auto_publish_allowed',v_auto_publish));
  END IF;

  SELECT workflow_state INTO v_state FROM public.newsroom_story_workflows WHERE article_id=p_article_id;
  RETURN jsonb_build_object('article_id',p_article_id,'job_id',v_job_id,'workflow_state',v_state,'risk_category',v_risk,'content_version_hash',v_hash,'auto_publish_allowed',v_auto_publish);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.pipeline_health()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ WITH recent_runs AS (SELECT id, status, created_at, pending_review, failed FROM public.news_pipeline_runs WHERE created_at > pg_catalog.now() - interval '1 hour'), last_run AS (SELECT id, status, created_at, pending_review, failed FROM public.news_pipeline_runs ORDER BY created_at DESC LIMIT 1), per_source AS (SELECT ns.name, count(a.id) AS articles, max(a.created_at) AS last_ingest FROM public.news_sources ns LEFT JOIN public.articles a ON a.source_id = ns.id WHERE ns.enabled = true GROUP BY ns.id, ns.name) SELECT jsonb_build_object('stale', COALESCE((SELECT max(created_at) < pg_catalog.now() - interval '15 minutes' FROM recent_runs), true), 'last_run', (SELECT jsonb_build_object('id', id, 'status', status, 'created_at', created_at, 'ingested', pending_review, 'failed', failed) FROM last_run), 'hour_summary', (SELECT jsonb_build_object('total_runs', count(*), 'success', count(*) FILTER (WHERE status = 'success'), 'partial', count(*) FILTER (WHERE status = 'partial'), 'failed', count(*) FILTER (WHERE status = 'failed'), 'total_ingested', COALESCE(sum(pending_review), 0)) FROM recent_runs), 'sources', COALESCE((SELECT jsonb_agg(to_jsonb(per_source) ORDER BY last_ingest DESC NULLS LAST) FROM per_source), '[]'::jsonb)); $function$
;
CREATE OR REPLACE FUNCTION public.requeue_failed_news(p_limit integer DEFAULT 50)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE changed integer;
BEGIN
  WITH candidates AS (
    SELECT id FROM public.news_ingest_queue
    WHERE status = 'failed' AND attempts < 5 AND updated_at < now() - interval '5 minutes'
    ORDER BY updated_at ASC LIMIT greatest(1, least(coalesce(p_limit, 50), 500))
  )
  UPDATE public.news_ingest_queue q
  SET status = 'queued', attempts = q.attempts + 1, locked_at = NULL, locked_by = NULL, last_error = NULL, updated_at = now()
  FROM candidates c WHERE q.id = c.id;
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.sync_public_article_preview()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_article_previews WHERE article_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.status = 'published' THEN
    INSERT INTO public.public_article_previews (
      article_id, title_bn, title_en, excerpt_bn, category, category_key,
      thumbnail_url, featured_image, is_premium, published_at, updated_at
    ) VALUES (
      NEW.id, NEW.title_bn, NEW.title_en, NEW.excerpt_bn, NEW.category,
      NEW.category_key, NEW.thumbnail_url, NEW.featured_image, NEW.is_premium,
      NEW.published_at, now()
    )
    ON CONFLICT (article_id) DO UPDATE SET
      title_bn = EXCLUDED.title_bn,
      title_en = EXCLUDED.title_en,
      excerpt_bn = EXCLUDED.excerpt_bn,
      category = EXCLUDED.category,
      category_key = EXCLUDED.category_key,
      thumbnail_url = EXCLUDED.thumbnail_url,
      featured_image = EXCLUDED.featured_image,
      is_premium = EXCLUDED.is_premium,
      published_at = EXCLUDED.published_at,
      updated_at = now();
  ELSE
    DELETE FROM public.public_article_previews WHERE article_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$
;
revoke all on function admin_grant_manual_subscription(uuid,text,timestamp with time zone,text) from public, anon, authenticated;
revoke all on function enforce_field_report_hardening() from public, anon, authenticated;
revoke all on function newsroom_claim_jobs(text,integer) from public, anon, authenticated;
revoke all on function newsroom_finish_job(uuid,boolean,text) from public, anon, authenticated;
revoke all on function newsroom_finish_job(uuid,text,boolean,text) from public, anon, authenticated;
revoke all on function newsroom_publish_article(uuid) from public, anon, authenticated;
revoke all on function newsroom_record_review_decision(uuid,text,text,text,boolean) from public, anon, authenticated;
revoke all on function newsroom_submit_for_verification(uuid) from public, anon, authenticated;
revoke all on function pipeline_health() from public, anon, authenticated;
revoke all on function requeue_failed_news(integer) from public, anon, authenticated;
revoke all on function sync_public_article_preview() from public, anon, authenticated;
grant execute on function admin_grant_manual_subscription(uuid,text,timestamp with time zone,text) to service_role;
grant execute on function enforce_field_report_hardening() to service_role;
grant execute on function newsroom_claim_jobs(text,integer) to service_role;
grant execute on function newsroom_finish_job(uuid,text,boolean,text) to service_role;
grant execute on function newsroom_publish_article(uuid) to service_role;
grant execute on function newsroom_record_review_decision(uuid,text,text,text,boolean) to authenticated;
grant execute on function newsroom_record_review_decision(uuid,text,text,text,boolean) to service_role;
grant execute on function newsroom_submit_for_verification(uuid) to authenticated;
grant execute on function newsroom_submit_for_verification(uuid) to service_role;
grant execute on function pipeline_health() to service_role;
grant execute on function requeue_failed_news(integer) to authenticated;
grant execute on function requeue_failed_news(integer) to service_role;
grant execute on function sync_public_article_preview() to service_role;
-- Triggers on existing tables
CREATE TRIGGER trg_field_reports_hardening BEFORE INSERT OR UPDATE ON public.field_reports FOR EACH ROW EXECUTE FUNCTION enforce_field_report_hardening();
CREATE TRIGGER sync_public_article_preview AFTER INSERT OR DELETE OR UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION sync_public_article_preview();
-- articles policies
create policy "editorial insert unpublished articles" on public.articles as PERMISSIVE for INSERT to authenticated with check (((current_app_role() = ANY (ARRAY['desk_editor'::app_role, 'chief_editor'::app_role, 'admin'::app_role])) AND (status = ANY (ARRAY['draft'::text, 'pending'::text, 'submitted'::text, 'approved'::text, 'archived'::text, 'retracted'::text]))));
create policy "editorial update unpublished articles" on public.articles as PERMISSIVE for UPDATE to authenticated using (((current_app_role() = ANY (ARRAY['desk_editor'::app_role, 'chief_editor'::app_role, 'admin'::app_role])) AND (status = ANY (ARRAY['draft'::text, 'pending'::text, 'submitted'::text, 'approved'::text, 'archived'::text, 'retracted'::text])))) with check (((current_app_role() = ANY (ARRAY['desk_editor'::app_role, 'chief_editor'::app_role, 'admin'::app_role])) AND (status = ANY (ARRAY['draft'::text, 'pending'::text, 'submitted'::text, 'approved'::text, 'archived'::text, 'retracted'::text]))));
create policy "read published articles by entitlement" on public.articles as PERMISSIVE for SELECT to anon,authenticated using (((status = 'published'::text) AND ((is_premium = false) OR ( SELECT private.has_active_premium_subscription() AS has_active_premium_subscription))));
-- Indexes on existing tables
CREATE INDEX IF NOT EXISTS idx_articles_field_report_id ON public.articles USING btree (field_report_id);
CREATE INDEX IF NOT EXISTS idx_field_reports_ai_duplicate_of ON public.field_reports USING btree (ai_duplicate_of);
CREATE INDEX IF NOT EXISTS idx_live_sessions_started_by ON public.live_sessions USING btree (started_by);
CREATE INDEX IF NOT EXISTS idx_news_ingest_queue_article_id ON public.news_ingest_queue USING btree (article_id);
CREATE INDEX IF NOT EXISTS idx_news_ingest_queue_status_created ON public.news_ingest_queue USING btree (status, created_at);
CREATE INDEX IF NOT EXISTS idx_news_ingest_queue_source_registry ON public.news_ingest_queue USING btree (source_registry_id);
CREATE INDEX IF NOT EXISTS articles_author_id_idx ON public.articles USING btree (author_id);
CREATE INDEX IF NOT EXISTS articles_source_id_idx ON public.articles USING btree (source_id);
