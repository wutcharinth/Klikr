-- Co-edit: presentation editors table + RLS update so editors can manage slides too

create table if not exists presentation_editors (
  presentation_id uuid not null references presentations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_by uuid references auth.users(id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (presentation_id, user_id)
);
create index if not exists pres_editors_user_idx on presentation_editors (user_id);

alter table presentation_editors enable row level security;
drop policy if exists "owner manage editors" on presentation_editors;
drop policy if exists "self read editor rows" on presentation_editors;
create policy "owner manage editors" on presentation_editors for all using (
  exists (select 1 from presentations p where p.id = presentation_editors.presentation_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from presentations p where p.id = presentation_editors.presentation_id and p.owner_id = auth.uid())
);
create policy "self read editor rows" on presentation_editors for select using (auth.uid() = user_id);

-- Extend presentations + slides RLS so editors can update slides (but not delete the presentation)
drop policy if exists "editors update slides" on slides;
create policy "editors update slides" on slides for all using (
  exists (
    select 1 from presentation_editors e
    where e.presentation_id = slides.presentation_id and e.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from presentation_editors e
    where e.presentation_id = slides.presentation_id and e.user_id = auth.uid()
  )
);

drop policy if exists "editors update presentation" on presentations;
create policy "editors update presentation" on presentations for update using (
  exists (
    select 1 from presentation_editors e
    where e.presentation_id = presentations.id and e.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from presentation_editors e
    where e.presentation_id = presentations.id and e.user_id = auth.uid()
  )
);

-- View helper: list presentations user can edit (owner OR editor)
create or replace view editable_presentations as
select p.*, (p.owner_id = auth.uid()) as is_owner
from presentations p
where p.owner_id = auth.uid()
   or exists (select 1 from presentation_editors e where e.presentation_id = p.id and e.user_id = auth.uid());
