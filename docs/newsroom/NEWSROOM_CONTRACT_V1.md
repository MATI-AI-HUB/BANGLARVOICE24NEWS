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

## Source policy

Every article must include:
- source_name
- source_url
- source_type
- source_published_at when available
- public attribution

No source may be ingested unless enabled in source_registry.

## Risk policy

### Low risk

Examples:
- weather
- verified utility notice
- public event schedule
- official appointment timetable

May be auto-published only when all required source and provenance data is present.

### Medium risk

Examples:
- business updates
- jobs
- education
- sports
- entertainment

Must be source-attributed. Editorial spot-check is preferred.

### High risk

Examples:
- death
- injury
- violence
- crime
- arrest
- court
- health claim
- financial/policy claim
- political allegation

Must enter pending review. Human approval is required before publication.

### Critical risk

Examples:
- child safety
- sexual violence
- communal tension
- war
- election
- self-harm
- emergency public safety information

Requires senior editorial approval and primary or multi-source corroboration.

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

## Minimum auto-publication requirements

- enabled source_registry record
- source_name and source_url
- canonical URL deduplication
- valid category
- meaningful source-bound content
- fact_sources includes at least one source
- no high or critical risk condition
- image credit when an image is used
- representative image label when applicable
- audit log event

## High-risk publication requirements

- human approval
- verification note
- verified_by and verified_at
- public source attribution
- source corroboration or official primary source
- sensitive details minimised
- correction/update path enabled

## Media policy

- Use licensed, source-provided, official, reporter-owned, or clearly labelled representative media.
- Never imply a stock/representative image depicts the event.
- Show photographer/provider credit.
- Embed third-party video only when embedding and attribution are permitted.
- Do not download or re-upload video without rights.

## Reader trust

Every article should provide:
- source attribution
- AI assistance disclosure when applicable
- verification state
- last updated time
- correction/change log
- error-report option

## Engineering rule

Read-only inspection -> backup -> minimal change -> test -> deploy -> verify.
No production deploy from a dirty working tree.
