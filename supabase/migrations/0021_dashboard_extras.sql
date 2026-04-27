-- Dashboard quality-of-life: pin, last presented timestamp.
-- Idempotent.

alter table presentations
  add column if not exists pinned boolean not null default false,
  add column if not exists last_started_at timestamptz;

create index if not exists presentations_pinned_idx on presentations (pinned);

-- Backfill: rough estimate so existing rows aren't blank.
-- current_slide_started_at is the closest signal we have for "host pressed Start
-- at some point" — copy it over for rows that ever went past lobby.
update presentations
   set last_started_at = current_slide_started_at
 where last_started_at is null
   and current_slide_started_at is not null;
