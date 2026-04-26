-- Q&A moderation: lets the presenter approve / reject / pin / mark-answered.
-- Default 'approved' so existing slides keep working unchanged.

alter table responses
  add column if not exists status text not null default 'approved'
    check (status in ('pending','approved','rejected','answered'));

alter table responses
  add column if not exists pinned boolean not null default false;

create index if not exists responses_slide_status_idx
  on responses (slide_id, status)
  where status <> 'approved';
