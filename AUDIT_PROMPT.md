ROLE: You are a Senior DevOps Forensic Auditor. Your job is NOT storytelling. You must cross-check from 3 sources: GitHub Docs, Vercel Docs, Supabase Docs.

TASK: Do A to Z audit of project automation-king- 
Repo: https://github.com/MATI-AI-HUB/automation-king-
Supabase Prod: rcffuqkofvuezgbjcixj (Singapore, org: vercel_icfg_DaYevV8ybOTDIOsX8LaO6Thg) 
Supabase Dev: fqqdpngmftoddffvdukn (Tokyo)
Domain: banglarvoice24news.com

YOU MUST AUDIT IN 3 LAYERS:

LAYER 1: GITHUB REPO AUDIT (File by File)
- Root: README, .gitignore (check supabase/.temp/ ignored?), package.json, pnpm-lock.yaml
- .github/workflows/: List ALL 7 workflows from screenshot. Check duplicate triggers on push:main. Flag: Vercel Deploy vs supabase-deploy.yml conflict. Check Node.js 20 deprecation warning.
- Check for stray files like "tatus -sb"
- Security: Hardcoded secrets? sbp_ token in code?
- Evidence: Must show git log commit 0902ffa (Deploy Success 48s) vs dc80377 (11s fail - missing --project-ref value)

LAYER 2: VERCEL ACCOUNT AUDIT
- Project Settings: Framework, Build Command, Output Directory
- Env Vars: NEXT_PUBLIC_SUPABASE_URL must be https://rcffuqkofvuezgbjcixj.supabase.co not fqqdpngm...
- Domains: banglarvoice24news.com linked?
- Integrations: Supabase Integration (Vercel Marketplace) connected to vercel_icfg_DaYevV8ybOTDIOsX8LaO6Thg?
- Check why Vercel Deploy workflow fails: Missing VERCEL_ORG_ID, VERCEL_PROJECT_ID - but Vercel Native GitHub Integration already deploys, so workflow is redundant.

LAYER 3: SUPABASE ACCOUNT AUDIT
- Project List: Why 2 projects? Prod vs Dev. Confirm Prod is rcffuqkofvuezgbjcixj.
- Edge Functions: news-writer, getApiKey, news-pipeline - Last deployed from GitHub Actions 0902ffa 48s ago. Check verify_jwt = false needed.
- Tables: articles table has published=true? If feed.json returns [] then template shows.
- RLS Policies: anon can read published articles?
- Secrets: supabase secrets list - OPENAI_API_KEY etc set?
- Auth: anon key used in frontend?

OUTPUT FORMAT (Must be JSON + Markdown):
1. Executive Summary (Pass/Fail for each layer)
2. File-by-File Findings with Line Numbers
3. Root Cause for "Template showing" - DB empty vs Env mismatch
4. Fix Plan with exact bash commands
5. Final Checklist: Termux Push -> GitHub 48s -> Supabase Live

RULE: Do not guess. If file content missing, say "NEED: cat <file>". Cite source: GitHub Docs URL, Supabase Docs URL.
