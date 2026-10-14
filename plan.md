# Banglar Voice production SaaS plan

## Verified baseline

- Vercel production deployment is healthy on the latest application commit.
- News ingest is publishing and source probes are healthy for the enabled registry.
- Learning Hub reaches the Vault-backed AI Gateway; Groq is currently the verified healthy provider.
- E-paper generation code has a full HTML/pages quality gate, but the GitHub Actions e-paper workflow fails before runner steps and therefore is not a reliable execution dependency.
- `getApiKey` has handler-level admin/chief-editor authorization but production edge JWT enforcement is disabled.
- Social configuration has a readiness registry, but TikTok dispatch is intentionally a stub; overdue calendar rows and pending ledger rows require controlled reconciliation, not bulk deletion.
- `videos` has no production rows, so YouTube player readiness cannot be claimed until content is synchronized.

## Implementation decisions

1. **Scheduler resilience:** Vercel Cron is the primary e-paper scheduler; GitHub Actions remains a manual diagnostic/fallback workflow. E-paper requests require a secret bearer token and must never trust a spoofable public cron header.
2. **Secret boundary:** `getApiKey` becomes edge-JWT protected. Its existing role authorization remains mandatory. No plaintext key is read, logged, or changed during deployment.
3. **AI quality:** add a benchmark harness and quality telemetry before changing model priority. Compare headline fidelity, entity/number preservation, unsupported-claim rate, Bengali style, and structured-output validity on a fixed redacted fixture set.
4. **Social delivery:** preserve every ledger row; reconcile overdue calendar records through idempotent state transitions. Add versioned Facebook payload/comment evidence before enabling or replaying backlog.
5. **TikTok:** keep the platform fail-closed until the exact TikTok Content Posting API product, OAuth scopes, account identity, and video asset contract are verified. Do not treat a Vault key name as proof of publish permission.
6. **AI Learning Hub agent:** separate answer generation from future persistent agent state. Add conversation/tool tables only after the approved tool list and retention policy are specified; the current public endpoint remains read-only web/site research.
7. **Video:** do not seed placeholder videos. Synchronize only verified YouTube uploads and store embeddable metadata with provenance.
8. **APK release:** treat the existing five signed APK assets as the current release baseline; run a new release only after source/build/signature evidence is available.

## Project structure

- `frontend/app/api/cron/epaper`: authenticated daily e-paper writer.
- `frontend/app/api/learning-hub`: server-side research answer endpoint.
- `frontend/app/api/social`: readiness-gated social dispatch and manager routes.
- `supabase/functions/ai-gateway`: provider routing, circuit breaker, and audit events.
- `supabase/functions/getApiKey`: admin-only Vault access boundary.
- `supabase/migrations`: versioned schema, RLS, and audit changes.
- `worker/src/agents`: collector, rewriter, quality/editor, media, broadcast, and supervisor agents.
- `.github/workflows`: validation, deploy, APK, video, and diagnostic automation.

## Delivery order

1. Apply and verify secret-only e-paper cron authentication and edge JWT enforcement.
2. Validate frontend and Edge Function configuration, deploy, and run unauthenticated negative smoke tests.
3. Repair the e-paper execution path and verify a non-empty stored edition through the public reader.
4. Add benchmark fixtures/runner and quality evidence without changing publishing cadence.
5. Reconcile social backlog with idempotency and versioned Facebook comment evidence.
6. Implement TikTok only after official API contract and account authorization are verified.
7. Implement persistent Learning Hub sessions/tools with scoped permissions and retention controls.
8. Synchronize verified YouTube content and validate player embeds.
9. Rebuild and release five APKs only after production source and signing evidence pass.

No step may delete published articles, disable the news pipeline, expose secrets, or silently convert a failed quality check into publication.
