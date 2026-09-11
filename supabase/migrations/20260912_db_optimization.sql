-- supabase/migrations/20260912_db_optimization.sql
-- Performance optimization for key tables

-- 1. Articles Table Optimizations
-- Index for fast search by status and published date (used in feed/queue)
create index if not exists articles_status_published_idx on public.articles(status, published_at desc);

-- Index for full-text search (if using tsvector later)
-- Note: Ensure 'title' and 'content' are indexed if you add a tsvector column
create index if not exists articles_title_trgm_idx on public.articles using gin(title gin_trgm_ops);

-- 2. AI Audit Log Optimizations (Critical for Admin Dashboard)
-- Already created in previous migration, but adding composite index for dashboard queries
create index if not exists ai_audit_log_date_provider_idx on public.ai_audit_log(created_at desc, provider);

-- 3. Subscriptions Optimizations
-- Index for checking active user subscriptions (Paywall logic)
create index if not exists subscriptions_active_user_idx on public.subscriptions(user_id, expires_at) where status = 'active';

-- 4. Profiles Optimizations
-- Index for role-based access control checks
create index if not exists profiles_role_idx on public.profiles(role);

-- 5. General Maintenance Instructions (Commented out to run manually or via cron)
-- Run this periodically to reclaim space from deleted/updated rows:
-- VACUUM ANALYZE public.articles;
-- VACUUM ANALYZE public.ai_audit_log;
-- VACUUM ANALYZE public.subscriptions;
