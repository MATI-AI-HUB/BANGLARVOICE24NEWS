# Banglar Voice — Agent guidelines

- Banglar Voice is an **independent, standalone** project. Do not add references
  to third-party app-generation platforms or their private storage.
- Keep published git history intact: avoid force pushing or rewriting commits
  that are already shared.
- Keep the main branch in a working state at all times.
- New code must not introduce external platform SDKs or cloud lock-in without an
  explicit decision to do so. Supabase, fonts and ad networks are fine — they are
  configured purely through environment variables.
