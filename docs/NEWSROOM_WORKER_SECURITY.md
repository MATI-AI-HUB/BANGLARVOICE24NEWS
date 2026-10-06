# Newsroom Worker Security Contract

## Components

- `worker/` is the long-running Node.js AI newsroom process. It runs on a persistent worker host and uses `NEWSROOM_INGEST_KEY` when calling the backend.
- `supabase/functions/newsroom-worker/` is the Supabase Edge boundary. It is not the long-running AI process; it exposes only an authenticated health/control endpoint.
- `supabase/functions/news-pipeline/` is the separate RSS collector function and retains its existing service-side non-JWT contract.

## Authentication

`newsroom-worker` uses two independent controls:

1. Supabase platform JWT verification is enabled (`verify_jwt = true`).
2. The handler requires the `x-newsroom-key` header to match the non-empty `NEWSROOM_INGEST_KEY` secret.

If the secret is missing, the function returns `503` and never permits an anonymous request. If the key is wrong, it returns `401`.

Do not put the key in Git, source files, URLs, or logs. Configure it only as a Supabase Edge Function secret and as a protected environment variable on the worker host.

## Deployment rules

- Deploy the function from its tracked source in `supabase/functions/newsroom-worker/`.
- Do not use a global `--no-verify-jwt` deployment flag.
- Per-function JWT policy is declared in `supabase/config.toml`.
- Any future change to the endpoint contract must update this document and the worker caller together.
