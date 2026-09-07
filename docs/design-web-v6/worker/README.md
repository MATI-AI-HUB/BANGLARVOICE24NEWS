# Banglar Voice — Autonomous 24/7 Newsroom Pipeline (v3)

A fully independent, production-grade automation pipeline for **Banglar Voice**
(a standalone TanStack/React + Supabase media outlet, no Lovable, no third-party
news API). It collects news from public RSS feeds, **rewrites each story into
original, copyright-free Bangla**, sources **CC0/free media with attribution**,
and — after an editorial gate — **publishes to the website and broadcasts to
Facebook / X / Instagram / LinkedIn / Telegram**. A **Telegram bot is the
editorial control plane**: editors approve, reject, rewrite, re-media and pause
the whole pipeline from the channel.

```
collect ──▶ rewrite ──▶ media ──▶ pending_approval ──▶ approved ──▶ published ──▶ broadcast
(RSS)     (AI or       (CC0)        (human gate —        (Admin or     (website)   (FB, X, IG,
          fallback)                 Telegram /approve)   Telegram)                  LinkedIn, Telegram)
```

Nothing publishes automatically unless you set `AUTO_PUBLISH=true`.

---

## 1. Quick start

```bash
cd worker
npm install
cp .env.example .env        # then fill in values (see §3)
npm run typecheck           # zero errors expected
npm run build               # compiles to dist/
npm run worker:dry          # end-to-end demo of the WHOLE graph, no network writes
npm run worker:once         # one live cycle (collect → rewrite → media → queue)
npm run worker              # endless 24/7 loop (default 15-min interval)
```

### What `npm run worker:dry` proves (no credentials needed)

1. **Collect** — prints a sample news item.
2. **Rewrite** — produces an original Bangla headline + paragraphs. With no
   `CHAT_AI_KEY` it uses the deterministic fallback; with a key it calls the
   OpenAI-compatible endpoint.
3. **Media** — returns CC0 media (Wikimedia/Openverse schema or built-in CC0
   fallbacks) with author + license + source URL.
4. **Telegram parser** — parses `/publish`, `/approve`, `/status`, `/pause`,
   `/media`, unknown → JSON.
5. **Publish + broadcast** — every adapter reports a simulated skip; no network
   write happens.

---

## 2. Architecture

| Module | File | Responsibility |
|---|---|---|
| Collector | `src/lib/collector.ts` | Public RSS/Atom fetch + normalize (existing) |
| Ingest | `src/lib/ingest.ts` | Push drafts to app `POST /api/public/ingest` (existing) |
| Types | `src/lib/types.ts` | Pipeline state machine + shared interfaces |
| **Rewriter** | `src/lib/rewriter.ts` | Copyright-free original Bangla rewrite (AI, fallback) |
| **Media sourcer** | `src/lib/media.ts` | CC0/free images + videos w/ attribution |
| **Publisher** | `src/lib/publisher.ts` | Social adapters behind one interface |
| — Facebook | `publisher.ts` `FacebookAdapter` | Graph API page feed |
| — X/Twitter | `publisher.ts` `TwitterAdapter` + `oauth1.ts` | API v2 tweets (OAuth 1.0a) |
| — Instagram | `publisher.ts` `InstagramAdapter` | Graph API container → publish |
| — LinkedIn | `publisher.ts` `LinkedInAdapter` | Shares API |
| — Telegram | `publisher.ts` `TelegramAdapter` + `telegram.ts` | Channel broadcast + command control |
| **Telegram controller** | `src/lib/telegram.ts` | Command parsing + long-polling loop |
| **Orchestrator** | `src/lib/orchestrator.ts` | State machine + wires everything |
| Entrypoint | `src/main.ts` | Endless loop / dry-run / once |
| DB migration | `supabase/pipeline_migration.sql` | New columns + media/broadcast tables |

### State machine

`collected → rewritten → media_attached → pending_approval → approved → published → broadcast`
(plus `rejected` / `failed`).

The orchestrator keeps a restart-safe **local JSON state file**
(`PIPELINE_STATE_FILE`, default `pipeline-state.json`) with rewritten text,
media and the broadcast log; Supabase `newsroom_queue` remains the editorial
queue the app's Admin Console reads.

---

## 3. Environment variables (worker/.env)

See `.env.example` for the full annotated list. Key groups:

| Group | Variables |
|---|---|
| Supabase | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| App ingest | `NEWSROOM_INGEST_KEY`, `BV_BASE_URL` |
| Collection | `NEWS_RSS_URLS` (empty = built-ins), `INTERVAL_MINUTES` |
| AI rewrite | `CHAT_AI_KEY`, `CHAT_AI_BASE_URL`, `CHAT_AI_MODEL` |
| Media | `PEXELS_API_KEY` (optional) |
| Social | `FACEBOOK_PAGE_ID/_TOKEN`, `TWITTER_APP_KEY/_SECRET/_ACCESS_TOKEN/_ACCESS_SECRET`, `INSTAGRAM_PAGE_ID/_BUSINESS_ID/_TOKEN`, `LINKEDIN_ACCESS_TOKEN/_PERSON_URN`, `TELEGRAM_BOT_TOKEN/_CHAT_ID` |
| Gate | `AUTO_PUBLISH` (`false` default), `PIPELINE_STATE_FILE` |

---

## 4. Setting up each platform (manual, one-time)

| Platform | What you must create | Credentials you get | Adapter needs |
|---|---|---|---|
| **Website** | — (app already has `/api/public/ingest` + Admin Console) | `NEWSROOM_INGEST_KEY` | ingest key |
| **Facebook Page** | [developers.facebook.com/apps](https://developers.facebook.com/apps) → app → add *Facebook Login for Business* → generate a **Page Access Token** (long-lived) | Page ID + token | `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_TOKEN` |
| **X/Twitter** | [developer.x.com](https://developer.x.com) → project → app → *User authentication* with **Read+Write** → generate keys; use a user who follows/owns the posting account | API key/secret + access token/secret | `TWITTER_APP_KEY/_SECRET/_ACCESS_TOKEN/_ACCESS_SECRET` |
| **Instagram** | A Facebook **professional (Business/Creator) account** linked to the page; Instagram API access via the same FB app (requires Instagram *professional* + page linked, then `GET /me/accounts` → `instagram_business_account`) | IG business id + page token | `INSTAGRAM_BUSINESS_ID`, `INSTAGRAM_TOKEN` (+`INSTAGRAM_PAGE_ID`) |
| **LinkedIn** | [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) → app → *Share on LinkedIn* product → OAuth (scopes `w_member_social`) → get a user access token + person URN | token + `urn:li:person:…` | `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_PERSON_URN` |
| **Telegram** | [@BotFather](https://t.me/BotFather) → `/newbot` → token; create your channel and add the bot as admin; get chat id (e.g. `@YourChannel` or numeric via `getUpdates`) | bot token + chat id | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |

> Missing credentials never crash the pipeline — that platform is simply
> skipped with a logged reason (`skipped_reason`).

---

## 5. Telegram — the editorial control plane

Start the worker with `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` set (the
channel the bot is admin of). Then send commands from that channel (or from
chats listed in `TELEGRAM_ALLOWED_CHAT_IDS` — strongly recommended so random
chats can't command the bot):

| Command | Effect |
|---|---|
| `/status` | Queue summary: counts by state + the most recent items (short id, state, headline) |
| `/publish q_abc12345` | Approve **and** publish + broadcast immediately |
| `/approve q_abc12345` | Approve only (goes to the website publish path) |
| `/reject q_abc12345` | Mark rejected (removed from the active queue) |
| `/rewrite q_abc12345` | Re-run the copyright-free rewriter for that item |
| `/media q_abc12345` | Re-source CC0 media for that item |
| `/sources` | List the RSS sources currently monitored |
| `/pause` / `/resume` | Pause / resume the whole collection loop |
| `/help` | Command list |

Item ids are printed in worker logs; the Admin Console shows the same items in
`newsroom_queue` (column `pipeline_state` + `rewritten_headline` after you run
the SQL migration).

---

## 6. Supabase migration

Run `supabase/pipeline_migration.sql` once (SQL editor). It adds
`pipeline_state`, `rewritten_*`, `approved_*` columns to `newsroom_queue`, and
creates `media_attachments`, `publish_log`, `broadcast_status` tables + the
`pipeline_queue` admin view, all RLS-locked to the service role (anon may read
media only).

The pipeline also works *without* the migration: the worker keeps its own JSON
state file and only ever talks to the app's existing ingest API. The migration
adds cross-restart visibility + SQL querying for editors.

---

## 7. Verification checklist

```bash
npm run typecheck          # TS strict, no errors
npm run build              # tsc emits dist/
npm run worker:dry         # full-graph demo: rewrite + media + telegram parse + simulated broadcast
# live (once):
NEWS_RSS_URLS=https://news.google.com/rss/search?q=bangladesh&hl=bn&gl=BD&ceid=BD:bn npm run worker:once
```

### Copyright-free guarantee

- **Rewriter** system prompt forbids verbatim copying; output is a fresh
  headline + restructured body preserving only facts. No key → deterministic
  Bangla paraphrase engine (also original wording).
- **Media** comes only from CC0/CC-BY/CC-BY-SA/free-license indexes
  (Wikimedia Commons, Openverse, Pexels) or built-in CC0 fallbacks — never the
  source outlet's own images. Every attachment carries
  `author + license + source URL` for correct attribution.
- **Nothing is auto-published** unless `AUTO_PUBLISH=true` — the editorial gate
  (human or Telegram) stays in control.

---

## 8. Operations notes

- Run under **systemd** (`Restart=always`) or a container for true 24/7.
- Each cycle: Telegram command poll → collect → dedupe → rewrite → media →
  gate/broadcast → sleep.
- Logs print one line per item with its short id — use that id in Telegram
  commands.
- Rate limiting: adapters retry once on 429/5xx with a 2s backoff; Telegram
  long-polling uses `timeout=5` and never spins hot.

> Independent outlet note: all code is self-hostable, keys are bring-your-own,
> and no traffic or content flows through any third-party news API.
