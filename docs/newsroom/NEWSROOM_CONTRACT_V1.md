# Banglar Voice Newsroom Contract v1

## Mission

Banglar Voice is a Bengali, AI-assisted, source-transparent newsroom.
AI may collect, structure, translate, summarize, classify, and draft.
AI may not invent facts, conceal sources, or independently verify high-risk claims.

## Canonical data store

Supabase Postgres is the only canonical production database for article state.

## Article types

- official_brief
- attributed_brief
- multi_source_brief
- original_report
- explainer
- fact_check
- live_update
- opinion

## Required source data

Every article must include:
- source_name
- source_url
- source_type
- source_published_at when available
- public attribution

Only enabled source_registry records may be ingested.

## Risk policy

### Low
Examples: weather, verified utility notice, public event schedule, official timetable.

### Medium
Examples: jobs, education, business, sports, entertainment.

### High
Examples: death, injury, violence, crime, arrest, court, health claim, financial/policy claim, political allegation.

### Critical
Examples: child safety, sexual violence, communal tension, war, election, self-harm, emergency public-safety information.

## Publication rules

Low-risk content may be auto-published only with complete provenance.

Medium-risk content requires source attribution and editorial spot-check.

High-risk content must enter pending review and requires human approval before publication.

Critical-risk content requires senior editorial approval plus official-primary or multi-source corroboration.

## Publication states

status:
- draft
- pending
- published
- rejected
- archived

editorial_status:
- draft
- pending_review
- auto_published
- human_published
- rejected

verification_status:
- pending
- ai_processing
- reviewed
- verified
- corrected
- disputed
- rejected

## Auto-publication requirements

- enabled source_registry record
- source_name and source_url
- canonical URL deduplication
- valid category
- meaningful source-bound content
- fact_sources with at least one source
- no high/critical risk condition
- image credit when image exists
- representative-image label when applicable
- AI audit event

## High-risk publication requirements

- human approval
- verification note
- verified_by and verified_at
- public source attribution
- official or independent corroborating source
- sensitive details minimised
- correction/update path enabled

## Media policy

- Use licensed, source-provided, official, reporter-owned, or clearly labelled representative media.
- Never present stock media as event media.
- Display photographer/provider credit.
- Do not re-upload third-party video without permission.

## Reader trust

Every article should show:
- source attribution
- AI-assistance disclosure
- verification state
- last-updated time
- correction/change log
- error-report option

## Engineering workflow

Read-only inspection -> backup -> minimal change -> test -> deploy -> verify.
No production deploy from a dirty working tree.
