-- =============================================================================
-- Banglar Voice — Premium Features & Business Modules (BBC Bangla / DW / NYT style)
-- -----------------------------------------------------------------------------
-- Single idempotent migration: reader premium features (live blogs, video hub,
-- podcasts, opinion, newsletters) + business modules (subscriptions/paywall,
-- donations/membership, advertising, analytics, CMS, licensing API keys).
--
-- Conventions follow the app's existing migrations:
--   * server-only tables: RLS enabled + service_role grant + deny anon/authenticated
--   * public-read tables: FOR SELECT USING (true) to anon/authenticated
--   * updated_at maintained by public.set_updated_at() trigger
-- Safe to run twice. Requires the earlier newsroom_queue migration (status column).
-- =============================================================================

\set ON_ERROR_STOP off

-- ---------------------------------------------------------------------------
-- 1) LIVE BLOGS  (reader-facing real-time coverage of breaking events)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_blogs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  title_bn      TEXT NOT NULL,
  title_en      TEXT NOT NULL DEFAULT '',
  dek           TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL DEFAULT 'national',
  cover_image   TEXT,
  status        TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live','paused','closed')),
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.live_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_blog_id  UUID NOT NULL REFERENCES public.live_blogs(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL DEFAULT 'update' CHECK (kind IN ('update','headline','quote','photo','video')),
  body_bn       TEXT NOT NULL,
  image_url     TEXT,
  attribution   TEXT,
  author        TEXT NOT NULL DEFAULT 'Banglar Voice Desk',
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pinned        BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2) VIDEO HUB  (channels + playlists like BBC/DW video)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.videos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  title_bn      TEXT NOT NULL,
  title_en      TEXT NOT NULL DEFAULT '',
  dek           TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL DEFAULT 'national',
  kind          TEXT NOT NULL DEFAULT 'youtube' CHECK (kind IN ('youtube','facebook','m3u8','mp4')),
  embed_url     TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_sec  INT,
  channel       TEXT NOT NULL DEFAULT 'Banglar Voice',
  playlist      TEXT NOT NULL DEFAULT '',
  is_live       BOOLEAN NOT NULL DEFAULT false,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3) PODCASTS & EPISODES  (audio articles + podcast feed)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.podcasts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  title_bn      TEXT NOT NULL,
  title_en      TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  cover_url     TEXT,
  category      TEXT NOT NULL DEFAULT 'podcast',
  author        TEXT NOT NULL DEFAULT 'Banglar Voice',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.podcast_episodes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id    UUID NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL UNIQUE,
  title_bn      TEXT NOT NULL,
  title_en      TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  audio_url     TEXT NOT NULL,
  duration_sec  INT,
  size_bytes    BIGINT,
  episode_no    INT,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4) OPINION / OP-ED  (with author profiles)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.authors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name_bn       TEXT NOT NULL,
  name_en       TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'Contributor',
  bio_bn        TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT,
  email         TEXT,
  twitter       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.opinion_pieces (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  title_bn      TEXT NOT NULL,
  title_en      TEXT NOT NULL DEFAULT '',
  dek           TEXT NOT NULL DEFAULT '',
  body_paragraphs TEXT[] NOT NULL DEFAULT '{}',
  author_id     UUID REFERENCES public.authors(id) ON DELETE SET NULL,
  category      TEXT NOT NULL DEFAULT 'opinion',
  tags          TEXT[] NOT NULL DEFAULT '{}',
  image_url     TEXT,
  is_featured   BOOLEAN NOT NULL DEFAULT false,
  status        TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  published_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 5) NEWSLETTER SUBSCRIBERS  (double-opt-in)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','subscribed','unsubscribed','bounced')),
  source        TEXT NOT NULL DEFAULT 'homepage',
  token         TEXT,
  subscribed_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6) SUBSCRIPTIONS / PAYWALL  (Free / Premium tiers, metered paywall)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,            -- free | premium_monthly | premium_yearly | team
  name_bn       TEXT NOT NULL,
  name_en       TEXT NOT NULL DEFAULT '',
  price_bdt     NUMERIC(10,2) NOT NULL DEFAULT 0,
  interval      TEXT NOT NULL DEFAULT 'month' CHECK (interval IN ('month','year','once')),
  features      JSONB NOT NULL DEFAULT '[]',
  free_articles_per_month INT NOT NULL DEFAULT 10,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id       UUID REFERENCES public.subscription_plans(id),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','trialing','past_due','canceled','expired')),
  provider      TEXT NOT NULL DEFAULT 'manual' CHECK (provider IN ('manual','stripe','bkash','nagad')),
  provider_ref  TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  renews_at     TIMESTAMPTZ,
  canceled_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_active_user ON public.subscriptions(user_id) WHERE status IN ('active','trialing');

-- ---------------------------------------------------------------------------
-- 7) DONATIONS & MEMBERSHIP  (DW-style public-service)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.donations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_name    TEXT NOT NULL DEFAULT '',
  donor_email   TEXT NOT NULL DEFAULT '',
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount_bdt    NUMERIC(10,2) NOT NULL CHECK (amount_bdt > 0),
  kind          TEXT NOT NULL DEFAULT 'one_time' CHECK (kind IN ('one_time','monthly_membership','yearly_membership')),
  provider      TEXT NOT NULL DEFAULT 'manual' CHECK (provider IN ('manual','stripe','bkash','nagad')),
  provider_ref  TEXT,
  message       TEXT NOT NULL DEFAULT '',
  is_anonymous  BOOLEAN NOT NULL DEFAULT false,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 8) ADVERTISING  (direct-sold slots; programmatic placeholder)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ad_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_key TEXT NOT NULL UNIQUE,   -- header | leaderboard | rectangle | skyscraper | in_article | video_preroll | newsletter
  label_bn      TEXT NOT NULL DEFAULT 'বিজ্ঞাপন',
  width         INT,
  height        INT,
  is_active     BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ad_creatives (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id       UUID REFERENCES public.ad_slots(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT '',
  kind          TEXT NOT NULL DEFAULT 'image' CHECK (kind IN ('image','html','video')),
  image_url     TEXT,
  html_code     TEXT,
  link_url      TEXT,
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  impressions   BIGINT NOT NULL DEFAULT 0,
  clicks        BIGINT NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','expired')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 9) ANALYTICS  (lightweight event tracking + daily rollup)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event         TEXT NOT NULL,               -- pageview | article_view | subscribe | donation | ad_click ...
  path          TEXT NOT NULL DEFAULT '/',
  slug          TEXT,
  referrer      TEXT,
  utm_source    TEXT,
  user_agent    TEXT,
  ip_hash       TEXT,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analytics_daily (
  date          DATE NOT NULL,
  event         TEXT NOT NULL DEFAULT 'pageview',
  path          TEXT NOT NULL DEFAULT '/',
  count         BIGINT NOT NULL DEFAULT 0,
  users         BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (date, event, path)
);

-- ---------------------------------------------------------------------------
-- 10) CMS ENHANCEMENTS  (editorial calendar, media library, SEO meta)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.editorial_calendar (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'national',
  author_id     UUID REFERENCES public.authors(id) ON DELETE SET NULL,
  publish_at    TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','published','moved')),
  notes         TEXT NOT NULL DEFAULT '',
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media_library (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename      TEXT NOT NULL,
  path          TEXT NOT NULL,
  mime          TEXT NOT NULL DEFAULT 'image/webp',
  size_bytes    BIGINT,
  width         INT,
  height        INT,
  alt_text      TEXT,
  credit        TEXT NOT NULL DEFAULT '',
  license       TEXT NOT NULL DEFAULT 'CC BY-SA 4.0',
  uploader_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seo_meta (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route         TEXT NOT NULL UNIQUE,          -- / | /news/xyz | /video ...
  seo_title     TEXT NOT NULL DEFAULT '',
  seo_desc      TEXT NOT NULL DEFAULT '',
  og_image      TEXT,
  canonical_url TEXT,
  noindex       BOOLEAN NOT NULL DEFAULT false,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 11) CONTENT LICENSING API KEYS  (syndication for partners)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  key_hash      TEXT NOT NULL UNIQUE,          -- sha256 of the raw key (raw shown once)
  partner       TEXT NOT NULL DEFAULT '',
  scopes        TEXT[] NOT NULL DEFAULT '{stories}',
  monthly_quota INT NOT NULL DEFAULT 10000,
  requests_used INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  expires_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- Grants + RLS
-- ---------------------------------------------------------------------------
GRANT ALL ON public.live_blogs, public.live_entries, public.videos,
  public.podcasts, public.podcast_episodes, public.opinion_pieces,
  public.authors, public.newsletter_subscribers, public.subscription_plans,
  public.subscriptions, public.donations, public.ad_slots, public.ad_creatives,
  public.analytics_events, public.analytics_daily, public.editorial_calendar,
  public.media_library, public.seo_meta, public.api_keys TO service_role;

ALTER TABLE public.live_blogs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_entries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcasts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_episodes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opinion_pieces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authors               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_slots              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_creatives          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_calendar    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_library         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_meta              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys              ENABLE ROW LEVEL SECURITY;

-- Public-read: live blogs + entries, videos, podcasts + episodes, opinion,
-- authors, ad slots, ad creatives (only active+within dates), media library,
-- subscription plans (so pricing page can list them).
CREATE POLICY "public read live_blogs"   ON public.live_blogs   FOR SELECT USING (status <> 'closed' OR true);
CREATE POLICY "public read live_entries" ON public.live_entries FOR SELECT USING (true);
CREATE POLICY "public read videos"       ON public.videos       FOR SELECT USING (true);
CREATE POLICY "public read podcasts"     ON public.podcasts     FOR SELECT USING (true);
CREATE POLICY "public read podcast_episodes" ON public.podcast_episodes FOR SELECT USING (true);
CREATE POLICY "public read opinion"      ON public.opinion_pieces FOR SELECT USING (status = 'published');
CREATE POLICY "public read authors"      ON public.authors      FOR SELECT USING (true);
CREATE POLICY "public read subscription_plans" ON public.subscription_plans FOR SELECT USING (is_active);
CREATE POLICY "public read ad_slots"     ON public.ad_slots     FOR SELECT USING (true);
CREATE POLICY "public read active ad_creatives" ON public.ad_creatives
  FOR SELECT USING (status = 'active' AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));
CREATE POLICY "public read media_library" ON public.media_library FOR SELECT USING (true);
CREATE POLICY "public read seo_meta"     ON public.seo_meta     FOR SELECT USING (true);

-- Sensitive/server-only: newsletter (subscribe via RPC only), subscriptions
-- (owner can read own), donations (owner can read own), analytics (deny anon),
-- editorial calendar (deny anon), api_keys (deny anon).
CREATE POLICY "users read own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users read own donations" ON public.donations
  FOR SELECT USING (auth.uid() = user_id OR is_anonymous = false AND donor_email = '');
CREATE POLICY "deny all newsletter" ON public.newsletter_subscribers
  FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "deny all analytics_events" ON public.analytics_events
  FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "deny all analytics_daily" ON public.analytics_daily
  FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "deny all editorial_calendar" ON public.editorial_calendar
  FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "deny all api_keys" ON public.api_keys
  FOR ALL USING (false) WITH CHECK (false);
-- ad_creatives writes & impressions/clicks updates: server-only
CREATE POLICY "deny write ad_creatives" ON public.ad_creatives
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- Triggers (updated_at)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER live_blogs_upd   BEFORE UPDATE ON public.live_blogs        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER videos_upd       BEFORE UPDATE ON public.videos            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER podcasts_upd     BEFORE UPDATE ON public.podcasts          FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER podcast_episodes_upd BEFORE UPDATE ON public.podcast_episodes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER opinion_upd      BEFORE UPDATE ON public.opinion_pieces    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER authors_upd      BEFORE UPDATE ON public.authors           FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER newsletter_upd   BEFORE UPDATE ON public.newsletter_subscribers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER subscriptions_upd BEFORE UPDATE ON public.subscriptions    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER donations_upd    BEFORE UPDATE ON public.donations         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ad_creatives_upd BEFORE UPDATE ON public.ad_creatives      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER calendar_upd     BEFORE UPDATE ON public.editorial_calendar FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER seo_meta_upd     BEFORE UPDATE ON public.seo_meta          FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Subscribe to newsletter (double opt-in): no auth needed, rate-limit on email.
CREATE OR REPLACE FUNCTION public.subscribe_newsletter(p_email TEXT, p_name TEXT DEFAULT '', p_source TEXT DEFAULT 'homepage')
RETURNS TEXT LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_token TEXT := encode(gen_random_bytes(16), 'hex');
BEGIN
  IF p_email IS NULL OR position('@' in p_email) < 2 THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;
  INSERT INTO public.newsletter_subscribers (email, name, status, source, token)
  VALUES (lower(p_email), p_name, 'pending', p_source, v_token)
  ON CONFLICT (email) DO UPDATE
    SET status = CASE WHEN public.newsletter_subscribers.status = 'unsubscribed'
                      THEN 'pending' ELSE public.newsletter_subscribers.status END,
        token  = EXCLUDED.token
  RETURNING token INTO v_token;
  RETURN v_token;
END; $$;

-- Confirm subscription token.
CREATE OR REPLACE FUNCTION public.confirm_newsletter(p_token TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.newsletter_subscribers
     SET status = 'subscribed', subscribed_at = now()
   WHERE token = p_token AND status = 'pending';
  RETURN FOUND;
END; $$;

-- Unsubscribe.
CREATE OR REPLACE FUNCTION public.unsubscribe_newsletter(p_token TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.newsletter_subscribers SET status = 'unsubscribed'
   WHERE token = p_token;
  RETURN FOUND;
END; $$;

-- Issue a licensing API key (server-only; admin passes a plaintext name,
-- returns the raw key ONCE). Key stored as sha256.
CREATE OR REPLACE FUNCTION public.issue_api_key(p_name TEXT, p_partner TEXT DEFAULT '')
RETURNS TEXT LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_raw TEXT := 'bv_' || encode(gen_random_bytes(18), 'hex');
BEGIN
  INSERT INTO public.api_keys (name, partner, key_hash, created_by)
  VALUES (p_name, p_partner, encode(sha256(v_raw::bytea), 'hex'), auth.uid());
  RETURN v_raw;
END; $$;

-- Record an analytics event (public beacon; light validation).
CREATE OR REPLACE FUNCTION public.track_event(p_event TEXT, p_path TEXT DEFAULT '/', p_slug TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO public.analytics_events (event, path, slug, user_agent)
  VALUES (p_event, left(p_path, 500), left(p_slug, 200), left(current_setting('request.headers', true), 500));
EXCEPTION WHEN OTHERS THEN NULL; -- never break the page for analytics
END; $$;

-- Daily rollup: aggregate analytics_events into analytics_daily (worker cron).
CREATE OR REPLACE FUNCTION public.rollup_daily(p_date DATE DEFAULT (CURRENT_DATE - 1))
RETURNS INT LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_rows INT;
BEGIN
  INSERT INTO public.analytics_daily (date, event, path, count)
  SELECT p_date, COALESCE(event,'pageview'), COALESCE(path,'/'), count(*)
    FROM public.analytics_events
   WHERE created_at::date = p_date
   GROUP BY event, path
  ON CONFLICT (date, event, path) DO UPDATE SET count = EXCLUDED.count;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  DELETE FROM public.analytics_events WHERE created_at::date <= p_date;
  RETURN v_rows;
END; $$;

-- Increment ad click/impression (server-safe).
CREATE OR REPLACE FUNCTION public.ad_hit(p_slot TEXT, p_click BOOLEAN DEFAULT false)
RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.ad_creatives c
     SET impressions = impressions + 1
    FROM public.ad_slots s WHERE s.id = c.slot_id AND s.placement_key = p_slot
     AND c.status = 'active';
  IF p_click THEN
    UPDATE public.ad_creatives c SET clicks = clicks + 1
      FROM public.ad_slots s WHERE s.id = c.slot_id AND s.placement_key = p_slot
      AND c.status = 'active';
  END IF;
END; $$;

-- Seed default ad slots + subscription plans
INSERT INTO public.ad_slots (placement_key, width, height) VALUES
  ('header', 728, 90), ('leaderboard', 728, 90), ('rectangle', 300, 250),
  ('skyscraper', 300, 600), ('in_article', 728, 90), ('video_preroll', 640, 360),
  ('newsletter', 600, 120)
ON CONFLICT (placement_key) DO NOTHING;

INSERT INTO public.subscription_plans (code, name_bn, name_en, price_bdt, interval, features, free_articles_per_month, sort_order) VALUES
  ('free', 'ফ্রি', 'Free', 0, 'month', '["10 free articles/month","Standard reading"]'::jsonb, 10, 1),
  ('premium_monthly', 'প্রিমিয়াম মাসিক', 'Premium Monthly', 299, 'month', '["Unlimited articles","Ad-light reading","Deep analysis + podcasts","Weekly data report"]'::jsonb, -1, 2),
  ('premium_yearly', 'প্রিমিয়াম বার্ষিক', 'Premium Yearly', 2990, 'year', '["Everything in Premium","2 months free","Early event access"]'::jsonb, -1, 3),
  ('team', 'টিম', 'Team / Organisation', 999, 'month', '["5 seats","Unlimited articles","Licensing included"]'::jsonb, -1, 4)
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE public.live_blogs IS 'BBC-style live blog coverage of breaking events';
COMMENT ON TABLE public.videos IS 'Video hub: YouTube/FB/m3u8 embeds with playlists';
COMMENT ON TABLE public.podcast_episodes IS 'Audio articles + podcast RSS feed source';
COMMENT ON TABLE public.subscriptions IS 'Paywall entitlements (Free/Premium/Team)';
COMMENT ON TABLE public.api_keys IS 'Content licensing / syndication partner keys (raw shown once at issue)';
