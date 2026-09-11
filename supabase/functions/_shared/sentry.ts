// supabase/functions/_shared/sentry.ts
// Sentry initialization for Supabase Edge Functions (Deno)

import * as Sentry from "npm:@sentry/node@7.119.0"; // Pinned v7 for Deno stability

Sentry.init({
  dsn: Deno.env.get("SENTRY_DSN"),
  environment: Deno.env.get("ENVIRONMENT") || "production",
  tracesSampleRate: 1.0,
});

export { Sentry };
