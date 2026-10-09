CREATE OR REPLACE FUNCTION public.requeue_failed_news(p_limit integer DEFAULT 50)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
REVOKE ALL ON FUNCTION public.requeue_failed_news(integer) FROM PUBLIC;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE command LIKE '%requeue_failed_news%') THEN
    PERFORM cron.schedule('newsroom-failed-retry', '*/5 * * * *', 'select public.requeue_failed_news(50);');
  END IF;
END $$;;
