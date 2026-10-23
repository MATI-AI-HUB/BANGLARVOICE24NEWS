-- Production safety hardening: preserve Facebook while quarantining provider-invalid
-- X and YouTube credentials until a successful user-context/OAuth probe is recorded.
-- This changes no article, scheduler, e-paper, or Facebook data.

update public.social_platforms
set names_verified = false,
    updated_at = now()
where platform in ('x', 'youtube');

comment on table public.social_platforms is
  'Provider-invalid X and YouTube connections remain fail-closed until live identity probes succeed; Facebook remains independently operable.';
