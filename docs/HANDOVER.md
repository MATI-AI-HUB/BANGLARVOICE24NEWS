# Banglar Voice - Project Handover & Operations Manual

## 🚀 Live URLs
- **Frontend (Web):** https://banglarvoice24news.com
- **Admin Dashboard:** https://banglarvoice24news.com/admin/analytics
- **Worker (AI Pipeline):** Railway App (Check Logs)

## 🏗️ Architecture Summary
1. **Frontend:** Next.js 14 (App Router) deployed on Vercel.
2. **Backend:** Supabase (Postgres + Auth + Storage).
3. **AI Worker:** Node.js TypeScript running on Railway.app.
4. **Mobile:** Flutter Monorepo (5 Apps) with CI/CD via GitHub Actions.
5. **Storage:** Cloudflare R2 for media & backups.

## 🔑 Critical Secrets (Must be kept safe)
| Service | Variable Name | Purpose |
|---|---|---|
| **Supabase** | `SUPABASE_DB_URL` | Database connection for Worker |
| **Supabase** | `SUPABASE_SERVICE_ROLE_KEY` | Backend access |
| **Stripe** | `STRIPE_SECRET_KEY` | Payment processing |
| **bKash** | `BKASH_MERCHANT_ID` | Local payments |
| **Sentry** | `NEXT_PUBLIC_SENTRY_DSN` | Error tracking |
| **Plausible** | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Analytics |
| **Upstash** | `UPSTASH_REDIS_REST_TOKEN` | Rate limiting |

## 🛠️ Maintenance Tasks
1. **Database Backups:** Automated weekly via GitHub Actions (Sun 2 AM UTC).
2. **Worker Scaling:** Monitor Railway logs for memory usage.
3. **Payment Keys:** Replace test keys with production keys before launch.

## ✅ Launch Checklist
- [ ] Stripe/bKash Production Keys active
- [ ] Domain DNS pointed to Vercel
- [ ] Supabase Connection Pooling (PgBouncer) enabled
- [ ] Email SMTP configured for notifications
