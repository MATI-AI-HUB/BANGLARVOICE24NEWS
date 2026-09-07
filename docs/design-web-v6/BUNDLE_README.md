# Banglar Voice — Release Bundle & Secure Download Guide

Production DevOps kit for the **Banglar Voice** platform (TanStack Start / React 19 / Vite /
Tailwind v4 / Supabase — single-package web app). One command produces a clean, deterministic,
checksummed source archive, plus two ways to host a **secure download link** for it.

```
banglar-voice-app/
├── scripts/
│   └── bundle_project.sh              # the bundler (star of the show)
├── deploy/
│   └── nginx-download.conf            # Option A: Nginx/VPS download endpoint
├── .github/
│   └── workflows/
│       └── release-bundle.yml         # Option B: GitHub Release automation
└── BUNDLE_README.md                   # this file
```

---

## 1. Run the bundle script

```bash
chmod +x scripts/bundle_project.sh
./scripts/bundle_project.sh
```

**What you get** (in `./releases/` by default):

| Artifact | Purpose |
|---|---|
| `banglar-voice-app-v1.0.0.zip` | the release archive |
| `banglar-voice-app-v1.0.0.zip.sha256` | integrity checksum |
| `banglar-voice-app.zip` → `banglar-voice-app-v1.0.0.zip` | **stable name** for a fixed Nginx URL |
| `banglar-voice-app.zip.sha256` | checksum for the stable name |

**Inside the archive:** full clean source — `src/` (routes, components, ui kit, lib, supabase
integration), `public/`, `supabase/migrations`, `package.json` + `bun.lock`, all configs, and
docs (`README.md`, `AGENTS.md`, `DEPLOY.md`), plus a generated `.env.example`.

**Guaranteed excluded:** `node_modules`, `.git`, `.workspace` (original author's private git
storage + token — never part of a public release), `.tanstack`, `dist`, `.output`, editor dirs,
`*.log`, `*.pem`, real `.env*` secrets, and the `releases/` dir itself. The script stages a throwaway copy, so **your working
tree is never touched**, and it is idempotent + deterministic (identical source ⇒ identical
SHA-256).

**AI Learning Hub chat is bring-your-own-key** (no platform gateway): set `CHAT_AI_KEY`,
`CHAT_AI_BASE_URL` (any OpenAI-compatible endpoint) and `CHAT_AI_MODEL` — full table in DEPLOY.md.

**Useful env overrides:**

```bash
VERSION=1.1.0 ./scripts/bundle_project.sh                 # custom version
RELEASE_DIR=/var/www/banglar-voice/downloads ./scripts/bundle_project.sh
DETERMINISTIC=0 ./scripts/bundle_project.sh               # keep real mtimes
```

---

## 2. Trigger the GitHub Release (Option B)

```bash
git add -A
git commit -m "chore: release v1.0.0"
git tag v1.0.0
git push origin v1.0.0
```

The `release-bundle.yml` workflow runs on any `v*` tag push: it builds the archive, verifies
`sha256sum -c` + `unzip -t`, runs a secret/junk scan, creates the GitHub Release, uploads both
assets, and prints the public URL:

```
https://github.com/<owner>/banglar-voice-app/releases/download/v1.0.0/banglar-voice-app-v1.0.0.zip
```

(You can also run the workflow manually from **Actions → Release Bundle → Run workflow** — the
zip is then uploaded as a run artifact instead of a Release.)

---

## 3. Set up the Nginx download endpoint (Option A)

See the full annotated config at `deploy/nginx-download.conf`. Quick path:

```bash
# 1) Install the auth helper + create directories
sudo apt install -y apache2-utils
sudo mkdir -p /var/www/banglar-voice/downloads /etc/nginx/banglar-voice

# 2) Generate the bundle straight into the web dir (as your deploy user)
RELEASE_DIR=/var/www/banglar-voice/downloads VERSION=1.0.0 ./scripts/bundle_project.sh

# 3) Create the Basic Auth user
sudo htpasswd -c /etc/nginx/banglar-voice/.htpasswd devdownload

# 4) Enable the vhost
sudo cp deploy/nginx-download.conf /etc/nginx/sites-available/banglar-voice-download
sudo ln -s /etc/nginx/sites-available/banglar-voice-download /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

The config enforces HTTPS, rate-limiting, Basic Auth (or an optional `secure_link` HMAC
expiring-token variant — documented at the bottom of the file), `Content-Disposition:
attachment`, correct zip MIME, and a dedicated access log.

---

## 4. Retrieve the final secure download link

**Option A — Nginx:**

```
https://banglar-voice-app.yourdomain.com/download/banglar-voice-app.zip
```

* Basic Auth credentials are the `devdownload` user you created with `htpasswd`.
* For the versioned URL use `.../download/banglar-voice-app-v1.0.0.zip`.
* The `.sha256` is served at the matching `.sha256` path.

**Option B — GitHub Release:** after the workflow finishes, the asset URL is stable:

```
https://github.com/<owner>/banglar-voice-app/releases/download/v1.0.0/banglar-voice-app-v1.0.0.zip
```

---

## 5. Verify the download

```bash
# Linux / macOS
sha256sum -c banglar-voice-app-v1.0.0.zip.sha256        # expect: ...: OK
unzip -t banglar-voice-app-v1.0.0.zip                    # expect: no errors

# Windows PowerShell (download both files first)
Get-FileHash banglar-voice-app-v1.0.0.zip -Algorithm SHA256
Get-Content banglar-voice-app-v1.0.0.zip.sha256          # compare hashes
```

**Recipient quick start**

```bash
unzip banglar-voice-app-v1.0.0.zip
cd banglar-voice-app
cp .env.example .env      # fill values — see DEPLOY.md "Environment variables"
bun install               # or: npm install
bun run dev               # http://localhost:8080
```

---

## Security notes

- Real `.env*` files, `*.pem`, service-account JSON, and the `.workspace/` private storage
  (which embeds a git remote token) are stripped **before** zipping — verified by an automated
  scan in CI.
- The generated `.env.example` contains placeholders only; it is **safe** to commit and ship.
- Never commit a real `.env`. The repo's `.gitignore` already excludes it.
- Nginx endpoint is HTTPS-only, rate-limited, and auth-gated (Basic Auth or secure_link).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `required tool not found` | `sudo apt install -y zip unzip rsync` (or brew on macOS) |
| `not a Banglar Voice project root` | run from the repo root (script auto-detects its own repo) |
| Preflight missing items | run from the correct repo; `src/`, `public/`, `supabase/` must exist |
| `sha256sum -c` mismatch | re-download; check for a truncated transfer |
| Nginx 404 | confirm artifacts exist under `/var/www/banglar-voice/downloads/` and the symlink points at the versioned zip |
| Nginx 403 | auth failed, or the file name is not whitelisted by the regex |
