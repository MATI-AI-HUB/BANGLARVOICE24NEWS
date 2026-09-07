CREATE TABLE public.newsroom_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  dek TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'national',
  body TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT,
  agent TEXT NOT NULL DEFAULT 'automation',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX newsroom_queue_status_created_idx ON public.newsroom_queue (status, created_at DESC);

GRANT ALL ON public.newsroom_queue TO service_role;

ALTER TABLE public.newsroom_queue ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER newsroom_queue_updated_at
BEFORE UPDATE ON public.newsroom_queue
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();