-- Security hardening report sink.
-- Every hardening migration (search_path / policies / extensions) records what it
-- did here so the CI workflow can publish machine-readable evidence.
-- Idempotent and re-runnable.

begin;

create schema if not exists maintenance;

create table if not exists maintenance.security_hardening_report (
  id      bigserial primary key,
  run_at  timestamptz not null default now(),
  task    text not null,
  item    text not null,
  action  text not null,
  detail  text
);

create index if not exists security_hardening_report_run_idx
  on maintenance.security_hardening_report (run_at desc, task);

-- maintenance schema is internal: never exposed through the Data API.
revoke all on schema maintenance from anon, authenticated;
alter table maintenance.security_hardening_report enable row level security;
grant usage on schema maintenance to service_role;
grant all on maintenance.security_hardening_report to service_role;
grant usage, select on sequence maintenance.security_hardening_report_id_seq to service_role;

-- reset the section produced by this run (older rows are kept as history)
delete from maintenance.security_hardening_report where task in ('TASK2', 'TASK3', 'TASK4');

commit;
