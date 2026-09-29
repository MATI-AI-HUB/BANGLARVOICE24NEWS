# APK audit (static)

Status: **pending** — no `*.apk` / `*.aab` under `/workspace`, `/opt`, `/root`, `/tmp`. No emulator, aapt2, apksigner, apktool, jadx, or gitleaks in PATH. Classification below is from **source** in `mobile_monorepo/apps/` only. Upload binaries to re-run static audit (hash, signer, secrets).

## Apps (five)

| App | Package (from AndroidManifest / docs) | Purpose | Class |
|---|---|---|---|
| Reader | `com.banglarvoice.reader` | Public feed, categories, live/video tabs | RELEVANT-BROKEN until custom domain + live feed |
| Admin Console | `com.banglarvoice.admin` | Moderation, stats, reporters | RELEVANT-BROKEN: needs Auth + server role checks |
| Reporter | `com.banglarvoice.reporter` | Field drafts, live, uploads | RELEVANT-BROKEN: needs Auth + EXIF strip verify |
| Studio | `com.banglarvoice.studio` | Breaking live control room | RELEVANT-WORKING as source; live infra optional |
| TV | `com.banglarvoice.tv` | Leanback / audio-video streamer | RELEVANT-WORKING as source against public JSON |

No APK sha256 / signature / minSdk recorded: files absent.

## Secrets

Hardcoded Supabase anon JWTs that previously lived as `defaultValue` in admin/reporter/studio `config.dart` were removed. Clients now take `--dart-define=SUPABASE_URL` and `SUPABASE_ANON_KEY` only. `service_role` was not present in those Dart files. **Rotate the published anon key in the Supabase dashboard** because it was in git history. Do not put `service_role` in any APK.

Reader and TV talk to `https://banglarvoice24news.com/api/public/...` which currently returns `DEPLOYMENT_NOT_FOUND`.

## Manual checklist (user device)

1. Install only APKs you built after dart-define injection; do not redistribute unsigned or unknown binaries.
2. Reader: published cards show source name + Bangla time; no draft rows.
3. Admin: login as editor/admin only; reporter account cannot approve.
4. Reporter: draft save offline, submit, cannot set status=published.
5. Studio/TV: stream URLs load; no vault secrets in logcat.

## Recommendation

Keep five role-based apps in the monorepo for now (reader / admin / reporter / studio / TV). Merge later only if install friction dominates. A Trusted Web Activity wrapper is a fallback for the reader **after** the domain is live (Lighthouse targets met). Do not ship current Play-store binaries from this workspace: none exist here and keystores must stay off-repo.
