# VidPilot compatibility plan

## Goal

Add automated Bengali news-to-video generation beside the existing Banglar Voice newsroom without replacing or renaming the live `articles`, `videos`, `social_posts`, Vault, scheduler, or Facebook paths.

## Non-negotiable compatibility rules

- Existing news ingestion, article publishing, e-paper generation, and Facebook dispatch remain unchanged.
- No raw provider token is stored in a new table. YouTube, Facebook, AI, TTS, and stock-media credentials continue to use Supabase Vault through `public.api_vault`.
- Existing public video inventory remains `public.videos`; the new job tables only orchestrate generation and point to an existing `videos.id` after a render is accepted.
- New tables use a `video_generation_` prefix to avoid collision with the supplied VidPilot names.
- Generation status is controlled by server-side functions. Browser clients cannot directly mutate job status.
- YouTube remains fail-closed until OAuth refresh and channel identity probes succeed. Facebook readiness is independent.

## Additive data model

```text
public.articles
      │ article_id
      ▼
public.video_generation_jobs
      ├── public.video_generation_assets
      ├── public.video_generation_events
      └── public.videos (video_id after accepted render)
```

`video_generation_jobs` stores structured script output, retry/claim state, render paths, and review state. `video_generation_assets` stores only media metadata and licensed URLs. `video_generation_events` is an immutable operational audit trail.

## State machine

```text
queued → scripting → rendering → needs_review → publishing → published
   │         │          │             │             │
   ├─────────┴──────────┴─────────────┴─────────────┴→ failed
   └────────────────────────────────────────────────→ cancelled
```

The database rejects illegal transitions. Publishing requires an existing `public.videos` row; published requires a non-null `youtube_id` on that row. The existing website video feed remains the only public inventory.

## Rollout order

1. Apply the additive migration.
2. Verify table, function, RLS, and grant metadata read-only.
3. Deploy an independent worker that claims only `video_generation_jobs`.
4. Generate one canary job for an existing low-risk article; keep it in `needs_review`.
5. Verify render, copyright metadata, Bengali TTS, and review UI.
6. On explicit editorial approval, create/update `public.videos`, then dispatch through existing `social_posts` readiness gates.
7. Enable YouTube only after the fresh OAuth token passes refresh and channel identity verification.

## Rollback

Rollback is additive: stop the new worker and leave all existing newsroom jobs running. Do not drop tables in production while jobs or audit events exist. The new tables are unused by the live news path until the canary is approved.

## CSS/UI compatibility

The supplied `globals.css` contains only Tailwind's import. No global selector, token, reset, or font contract needs to change. New UI must use existing Tailwind utility classes and existing Bengali font variables from `app/layout.tsx`; no global CSS replacement is required.
