# বাংলার ভয়েস (Banglar Voice)

স্বাধীন, সম্পূর্ণ ওপেন-সোর্স বাংলা নিউজ প্ল্যাটফর্ম — **TanStack Start (React 19)**, **Tailwind CSS v4** ও **Supabase**-এ নির্মিত। কোনো তৃতীয়-পক্ষ অ্যাপ-জেনারেটর বা ক্লাউড লক-ইন ছাড়াই স্বয়ংসম্পূর্ণ (fully standalone)।

**Banglar Voice** — an independent, fully self-hostable bilingual (বাংলা / English) digital news platform. No app-generator platform dependencies.

## বৈশিষ্ট্য / Features

- Breaking-news ticker, bilingual toggle, dark / light / high-contrast themes
- Category, article, author, e-paper, search, learning-hub, about/contact/legal routes
- RSS + sitemap + JSON Feed, AdSense-ready ad slots, SEO JSON-LD (NewsMediaOrganization, NewsArticle, BreadcrumbList)
- AI Learning Hub chat (bring-your-own OpenAI-compatible endpoint)
- Supabase (Postgres + Auth + Storage) with RLS and migrations
- Automated newsroom ingestion API (`POST /api/public/ingest`) with editorial approval

## Stack

- TanStack Start / Router / React Query
- Vite + React + TypeScript
- Tailwind CSS v4
- Supabase (`@supabase/supabase-js`)
- Nitro server engine

## Development

```sh
npm install        # or: bun install
cp .env.example .env   # fill in the values — see DEPLOY.md
npm run dev        # http://localhost:8080
```

## Production build

```sh
npm run build      # outputs .output/ (server) + client assets
npm run start      # or: node .output/server/index.mjs
```

See **DEPLOY.md** for VM/Nginx, Cloudflare, Vercel/Netlify options, the environment reference, and the deployment checklist. See **BUNDLE_README.md** for the release-bundle & secure-download DevOps kit.

## Repository layout

```
src/               application source (routes, components, lib, integrations)
public/            static assets (favicon, robots.txt)
supabase/          migrations + database schema
scripts/           release bundler
deploy/            Nginx download endpoint config
.github/workflows/ GitHub Release automation
```
