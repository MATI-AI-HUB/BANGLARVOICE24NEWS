# Authentication Password Security

## Supabase hosted limitation

Supabase Auth itself is open source, but its hosted HaveIBeenPwned.org leaked-password integration is a **Pro-plan-and-up feature**. It cannot be enabled on the current Free project through SQL, a migration, or repository code. The Dashboard error confirms that this is a plan gate.

The project must not claim to provide breached-password detection while this hosted feature is unavailable.

## Open-source controls currently implemented

- The web password-reset flow requires at least 12 characters.
- It requires a letter, a number, and a symbol.
- The policy is implemented in `frontend/lib/password-policy.ts` and covered by tests.
- Supabase Auth's own minimum length and character-class settings remain the server-side baseline.

These controls improve password quality but **do not identify every password in breach databases**.

## If full breached-password detection is mandatory

There are only two honest options:

1. Upgrade the Supabase project to a plan that includes the hosted integration; or
2. Operate a separately maintained open-source authentication stack with a locally managed compromised-password corpus and enforce it before account creation/password changes.

The second option is a major identity-platform change and should not be introduced as a frontend-only check. A client-side denylist can be bypassed by direct Auth API calls.
