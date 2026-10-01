-- Grant column-level SELECT access to authenticated role
-- This fixes the 50% error rate from admin routes accessing articles table
-- and ensures the permissions survive DB resets.

GRANT SELECT (id, status, published_at, title_bn, category, 
              created_at, updated_at, verification_status, source_url)
ON public.articles TO authenticated;

-- Grant full access to service_role for server-side admin routes
GRANT SELECT, INSERT, UPDATE, DELETE 
ON public.articles TO service_role;

-- Verification query
DO $$
BEGIN
  IF NOT has_column_privilege('authenticated','public.articles','id','SELECT') THEN
    RAISE EXCEPTION 'GRANT failed for authenticated role';
  END IF;
  IF NOT has_table_privilege('service_role','public.articles','SELECT') THEN
    RAISE EXCEPTION 'GRANT failed for service_role';
  END IF;
  RAISE NOTICE '✅ Articles GRANT migration applied successfully';
END $$;
