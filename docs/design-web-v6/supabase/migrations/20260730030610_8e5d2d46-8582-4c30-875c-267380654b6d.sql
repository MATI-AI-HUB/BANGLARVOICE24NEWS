CREATE POLICY "newsroom_queue_no_client_access"
ON public.newsroom_queue
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);