-- Production-readiness reconciliation metadata for social_posts.
-- State transitions remain within the existing audit-preserving status contract.
alter table public.social_posts
  add column if not exists reconciliation_class text,
  add column if not exists reconciliation_reason text,
  add column if not exists reconciled_at timestamptz,
  add column if not exists reconciled_by text;

alter table public.social_posts
  drop constraint if exists social_posts_reconciliation_class_check;

alter table public.social_posts
  add constraint social_posts_reconciliation_class_check
  check (reconciliation_class is null or reconciliation_class in ('retry', 'skip', 'needs-credential'));

comment on column public.social_posts.reconciliation_class is
  'Bounded production-readiness classification: retry, skip, or needs-credential.';
comment on column public.social_posts.reconciliation_reason is
  'Secret-free reason recorded for the reconciliation classification.';
comment on column public.social_posts.reconciled_at is
  'Timestamp of the latest bounded reconciliation decision.';
comment on column public.social_posts.reconciled_by is
  'Human-run reconciliation batch identifier; never a secret.';
