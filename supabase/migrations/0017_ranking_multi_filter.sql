-- Adds ranking slide type, content-filter flag column.
-- Multi-select MCQ doesn't need a column: ordered/multiple indices ride in value_text.

alter table slides drop constraint if exists slides_type_check;
alter table slides add constraint slides_type_check
  check (type in ('mcq','wordcloud','open','quiz','qa','rating','embed','ranking'));

alter table responses
  add column if not exists flagged boolean not null default false;
