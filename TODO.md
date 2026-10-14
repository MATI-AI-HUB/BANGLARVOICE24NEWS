# Production SaaS outcomes

- [ ] E-paper daily execution must run through an authenticated primary scheduler, produce non-empty HTML/pages, archive article count consistently, and remain readable from the public e-paper page.
- [ ] The e-paper scheduler must not depend exclusively on a GitHub Actions runner that currently fails before steps; manual workflow failure must remain observable.
- [ ] `getApiKey` must enforce Supabase edge JWT validation and retain admin/chief-editor authorization before any Vault decryption; no client may receive a key without an authenticated authorized caller.
- [ ] News publishing must remain continuous while quality controls compare headline fidelity, entity/number preservation, unsupported claims, Bengali style, and structured-output validity.
- [ ] Failed quality attempts must remain reviewable with retry/age evidence; published quality articles must not be bulk deleted.
- [ ] Facebook delivery must persist a versioned caption, image, first-comment URL, external post ID, and comment result for each idempotent publish attempt.
- [ ] Overdue social calendar rows must be reconciled through safe retry/skip audit states; they must not be silently deleted.
- [ ] TikTok must remain fail-closed until official Content Posting API scopes, account identity, video asset requirements, and successful sandbox/production evidence are verified.
- [ ] YouTube integration must synchronize only verified channel uploads into `videos`; the public player must show real metadata and embed URLs.
- [ ] Learning Hub must retain source relevance, provider telemetry, and safe degraded responses; persistent agent tools and memory require scoped permissions and retention policy before implementation.
- [ ] Five APKs must be rebuilt/released only with verified source commit, production signature, artifact checksums, and release asset evidence.
- [ ] Every production deployment must include typecheck, tests, lint/build evidence, clean Git state, deployment READY evidence, and live endpoint smoke evidence.
