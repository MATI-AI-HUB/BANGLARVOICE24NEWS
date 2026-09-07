# বাংলার ভয়েস (Banglar Voice) — Deployment Guide

A bilingual (বাংলা / English) digital news platform built with **TanStack Start (React 19 + Vite 7)**,
**Tailwind CSS v4**, and **Supabase** (Postgres + Auth + Storage). Design system combines
Tactile Brutalism, magazine editorial layout, and multimedia-centric presentation.

---

## 1. What's in the box

```
src/
  routes/            file-based routes (home, category/$cat, article/$slug, admin,
                     learning-hub, e-paper, search, about, contact, privacy, terms,
                     rss.xml, sitemap.xml, api/*)
  components/        SiteHeader (breaking ticker + language + theme), SiteFooter,
                     ArticleCard, LearningHubPanel, NewsletterSignup, AdSlot, ui/*
  lib/               articles.ts (editorial data), i18n.tsx, config.server.ts
  assets/            editorial photography
  integrations/      generated Supabase client + types
supabase/migrations/ database schema (incl. newsroom_queue)
```

Key features: breaking-news ticker, bilingual toggle, dark/light/high-contrast themes,
AI Learning Hub (chat), Admin Console (Automation Monitor, Fact-Checking, Data Journalism,
Mobile Journalism, AI Policy), RSS + sitemap, AdSense-ready ad slots, ingestion API for
24/7 automated newsroom (`POST /api/public/ingest`).

## 2. Prerequisites

- Node.js 20+ (or Bun 1.1+)
- A Supabase project (free tier is fine)
- Optional: an OpenAI-compatible AI endpoint for the Learning Hub chat (see CHAT_AI_* below)

## 3. Local run

```bash
unzip banglar-voice-source.zip && cd banglar-voice
bun install          # or: npm install
cp .env.example .env # then fill in the values below
bun run dev          # http://localhost:8080
```

### Environment variables

| Variable | Where used | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | browser | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser | anon/publishable key (safe to ship) |
| `SUPABASE_URL` | server | same URL, server side |
| `SUPABASE_PUBLISHABLE_KEY` | server | same publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | server | only for privileged ingest/admin work |
| `CHAT_AI_KEY` | server | API key for the AI chat / Learning Hub endpoint (BYO key) |
| `CHAT_AI_BASE_URL` | server | OpenAI-compatible base URL (default `https://api.openai.com/v1`) |
| `CHAT_AI_MODEL` | server | model name (default `gpt-4o-mini`) |
| `VITE_ADSENSE_CLIENT` | browser | `ca-pub-XXXXXXXXXXXXXXXX` — loads adsbygoogle.js and renders live units |
| `ADSENSE_PUBLISHER_ID` | server | `pub-XXXXXXXXXXXXXXXX` — generates `/ads.txt` at runtime |
| `NEWSROOM_INGEST_KEY` | server | shared secret for `POST /api/public/ingest` and the Admin Console |

Never expose the service-role key to the browser.

## 4. Database

Apply the SQL in `supabase/migrations/` in timestamp order, either with the Supabase CLI:

```bash
supabase link --project-ref <your-ref>
supabase db push
```

or by pasting each file into the SQL editor. The `newsroom_queue` table backs the automated
newsroom (slug, title, body, status = pending/approved/rejected) and ships with RLS enabled
plus grants for `authenticated` and `service_role`.

## 5. Production build

```bash
bun run build      # outputs .output/ (server) + client assets
bun run start      # or: node .output/server/index.mjs
```

### Option A — Any Node host (VM, Render, Railway, Fly.io)

```bash
# Debian/Ubuntu VM
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs
npm install -g pm2
npm ci && npm run build
pm2 start .output/server/index.mjs --name banglar-voice
pm2 save && pm2 startup
```

Front it with nginx:

```nginx
server {
  server_name banglarvoice24news.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Then `sudo certbot --nginx -d banglarvoice24news.com` for TLS.

### Option B — Cloudflare Workers / Pages

The project targets the edge runtime out of the box:

```bash
bun run build
npx wrangler deploy
```

Set the env vars above as Worker secrets (`npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY`).

### Option C — Vercel / Netlify

Import the repo, build command `npm run build`, output handled by the TanStack Start preset.
Add the env vars in the dashboard.

## 6. Post-deploy checklist

- [ ] `/` renders with styles and images
- [ ] `/rss.xml` and `/sitemap.xml` return XML
- [ ] `/admin` loads the console
- [ ] `POST /api/public/ingest` accepts a signed automation payload
- [ ] Supabase migrations applied; RLS policies active
- [ ] `VITE_ADSENSE_CLIENT` + `ADSENSE_PUBLISHER_ID` set; `/ads.txt` returns your `pub-` line
- [ ] `curl -I https://<host>/ads.txt` → 200 before submitting the site in AdSense
- [ ] Domain + TLS configured, canonical URLs pointing at the live host

## 7. Automated newsroom (optional)

Schedule ingestion with pg_cron in Supabase:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('newsroom-ingest', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://banglarvoice24news.com/api/public/ingest',
    headers := '{"Content-Type":"application/json","apikey":"<publishable-key>"}'::jsonb,
    body := '{}'::jsonb
  );
$$);
```

Items land in `newsroom_queue` as `pending` and are published only after editorial approval
in the Admin Console — keeping a human in the loop as the AI policy requires.


## 8. Google AdSense — production checklist

1. Set `VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX` at **build time** (it is inlined into the
   client bundle) and `ADSENSE_PUBLISHER_ID=pub-XXXXXXXXXXXXXXXX` at **runtime**.
2. Rebuild (`bun run build`) and restart. `adsbygoogle.js` is then injected in `<head>` with a
   `preconnect`, and each `<AdSlot slot="…">` pushes its unit on mount.
3. `/ads.txt` is a server route generated from the env var — no file to hand-edit per host.
   Without the env var it returns a harmless comment instead of a fake publisher id.
4. In AdSense: add the domain, verify ownership, wait for the ads.txt crawl (up to 24 h).
5. Pass real slot ids from your AdSense account: `<AdSlot slot="1234567890" format="rectangle" />`.
   Slots without ids keep rendering the in-house placeholder — policy-safe during review.

## 9. SEO & structured data — what ships

- Per-route `title`, `description`, `og:*`, `twitter:*`, self-referencing `canonical` and `og:url`
  on every public route (`/`, categories, articles, about, services, contact, legal, e-paper,
  learning hub). `/search` and `/admin` are `noindex`.
- JSON-LD: `NewsMediaOrganization` + `WebSite` (with `SearchAction`) sitewide,
  `NewsArticle` on every story, `BreadcrumbList` on stories and category pages,
  `ContactPoint` on `/contact`.
- `/sitemap.xml` — all static routes plus every story (static + editor-approved automation rows),
  with `<news:news>` entries for anything published in the last 48 h. `<lastmod>` is emitted only
  from real publication timestamps, never from build time.
- `/rss.xml` and `/api/public/feed.json` (JSON Feed 1.1) include approved automation stories.
- `/robots.txt` allows everything except `/search` and `/admin`, and advertises the sitemap.

Verify after deploy:

```bash
curl -s https://<host>/sitemap.xml | head
curl -s https://<host>/rss.xml | head
curl -s https://<host>/news/<slug> | grep -o 'application/ld+json' | wc -l   # ≥ 2
```

Then submit the sitemap in Google Search Console and run the Rich Results Test on one article URL.

## 10. Super automation on a VM (A → Z)

The loop is: **agent → ingest → editorial approval → live page + feeds**, with a human always in
the middle (AI policy at `/about#ai`).

```bash
# 1. secret shared by the agent and the Admin Console
export NEWSROOM_INGEST_KEY="$(openssl rand -hex 32)"   # add to your systemd unit / .env

# 2. agent posts drafts (single object or array up to 50)
curl -X POST https://<host>/api/public/ingest \
  -H "content-type: application/json" \
  -H "x-ingest-key: $NEWSROOM_INGEST_KEY" \
  -d '[{"title":"…","dek":"…","category":"national","body":["…","…"],"source":"…","agent":"gpt-newsdesk"}]'
# → 202 {"ok":true,"queued":1,...}  status = pending
```

Every draft lands in `newsroom_queue` as `pending`. An editor opens `/admin`, enters the same key
and approves or rejects. **Approved rows immediately become live pages** at `/news/<slug>` and are
merged into `/sitemap.xml`, `/rss.xml` and `/api/public/feed.json` — no rebuild required.

Schedule the agent on the VM with cron (or keep the pg_cron variant below):

```cron
*/15 * * * * /usr/local/bin/newsroom-agent.sh >> /var/log/newsroom.log 2>&1
```

Systemd unit for the app itself:

```ini
# /etc/systemd/system/banglar-voice.service
[Unit]
Description=Banglar Voice
After=network.target

[Service]
WorkingDirectory=/srv/banglar-voice
EnvironmentFile=/srv/banglar-voice/.env
ExecStart=/usr/bin/node .output/server/index.mjs
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now banglar-voice
```

Health probes for monitoring: `GET /api/public/ingest` (service banner),
`GET /api/public/weather`, `GET /sitemap.xml`.
