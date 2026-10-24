-- YouTube must follow the same fail-closed editorial principle as news.
-- Inventory rows that were previously marked needs_enrichment are not public
-- until the sync route revalidates them against the quality gate.
update public.videos
set status = 'quarantined',
    audit_reason = coalesce(audit_reason, 'legacy_needs_enrichment_review_required'),
    updated_at = now()
where status = 'needs_enrichment';

drop policy if exists "public read published videos" on public.videos;
create policy "public read published videos"
  on public.videos for select
  using (status in ('published', 'live'));

create index if not exists videos_quality_gate_idx
  on public.videos (status, audit_reason, published_at desc);
