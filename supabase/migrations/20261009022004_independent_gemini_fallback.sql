DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ai_gateway_key_state'::regclass AND conname = 'ai_gateway_key_state_provider_check') THEN
    ALTER TABLE public.ai_gateway_key_state DROP CONSTRAINT ai_gateway_key_state_provider_check;
  END IF;
END $$;
ALTER TABLE public.ai_gateway_key_state ADD CONSTRAINT ai_gateway_key_state_provider_check CHECK (provider = ANY (ARRAY['openrouter'::text, 'gemini'::text, 'groq'::text, 'ollama'::text]));
ALTER TABLE public.ai_gateway_usage_events ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS final_error_code text;
INSERT INTO public.api_vault (service_name, key_encrypted, environment, is_active)
SELECT 'AI_GATEWAY_GEMINI_SECONDARY', id, 'prod'::vault_env, true FROM vault.secrets WHERE name = 'GEMINI_API_KEY' AND NOT EXISTS (SELECT 1 FROM public.api_vault WHERE service_name = 'AI_GATEWAY_GEMINI_SECONDARY');
INSERT INTO public.ai_gateway_key_state (api_vault_id, provider, account_label, priority, model, base_url, is_enabled, state)
SELECT av.id, 'gemini', 'AI_GATEWAY_GEMINI_SECONDARY', 20, 'gemini-2.5-flash', 'https://generativelanguage.googleapis.com/v1beta', true, 'healthy' FROM public.api_vault av WHERE av.service_name = 'AI_GATEWAY_GEMINI_SECONDARY' AND av.is_active = true AND NOT EXISTS (SELECT 1 FROM public.ai_gateway_key_state ks WHERE ks.api_vault_id = av.id);
UPDATE public.ai_gateway_key_state SET priority = 30, updated_at = now() WHERE provider = 'groq' AND account_label = 'AI_GATEWAY_GROQ_BACKUP';;
