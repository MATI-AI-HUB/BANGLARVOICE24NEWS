-- supabase/migrations/20260912_db_optimization.sql
-- Performance optimization for key tables

-- Enable pg_trgm for fuzzy text search
create extension if not exists pg_trgm;

-- 1. Articles Table Optimizations
-- Index for fast search by status and published date
create index if not exists articles_status_published_idx
  on public.articles(status, published_at desc);

-- Trigram index on title_bn (Bengali) for fast LIKE search
create index if not exists articles_title_bn_trgm_idx
  on public.articles using gin(title_bn gin_trgm_ops);

-- 2. AI Audit Log Optimizations
create index if not exists ai_audit_log_date_provider_idx
  on public.ai_audit_log(created_at desc, provider);

-- 3. Subscriptions Optimizations
create index if not exists subscriptions_active_user_idx
  on public.subscriptions(user_id, expires_at)
  where status = 'active';

-- 4. Profiles Optimizations
create index if not exists profiles_role_idx on public.profiles(role);
