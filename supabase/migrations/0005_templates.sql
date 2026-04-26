-- Templates library: public seed templates + user-saved templates

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  category text not null,
  tags text[] not null default '{}',
  cover_image_url text,
  is_seed boolean not null default false,
  owner_id uuid references auth.users(id) on delete cascade,
  visibility text not null default 'public' check (visibility in ('public','team','private')),
  usage_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists templates_category_idx on templates (category);
create index if not exists templates_owner_idx on templates (owner_id);

create table if not exists template_slides (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references templates(id) on delete cascade,
  position int not null,
  type text not null check (type in ('mcq','wordcloud','open','quiz','qa','rating','embed')),
  question text not null default '',
  config jsonb not null default '{}'::jsonb,
  image_url text,
  kahoot_mode boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists template_slides_tpl_idx on template_slides (template_id, position);

alter table templates enable row level security;
alter table template_slides enable row level security;

drop policy if exists "public read templates" on templates;
drop policy if exists "owner read private templates" on templates;
drop policy if exists "owner write templates" on templates;
create policy "public read templates" on templates for select using (visibility = 'public');
create policy "owner read private templates" on templates for select using (auth.uid() = owner_id);
create policy "owner write templates" on templates for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "read template slides" on template_slides;
drop policy if exists "owner write template slides" on template_slides;
create policy "read template slides" on template_slides for select using (
  exists (select 1 from templates t where t.id = template_slides.template_id and (t.visibility = 'public' or t.owner_id = auth.uid()))
);
create policy "owner write template slides" on template_slides for all using (
  exists (select 1 from templates t where t.id = template_slides.template_id and t.owner_id = auth.uid())
) with check (
  exists (select 1 from templates t where t.id = template_slides.template_id and t.owner_id = auth.uid())
);

-- apply_template: clone template + slides into a new presentation
create or replace function apply_template(p_template_id uuid, p_owner_id uuid, p_title text, p_code text)
returns uuid
language plpgsql security definer as $$
declare
  v_pres_id uuid;
begin
  insert into presentations (owner_id, title, code, source_template_id)
  values (p_owner_id, p_title, p_code, p_template_id)
  returning id into v_pres_id;

  insert into slides (presentation_id, position, type, question, config, image_url, kahoot_mode)
  select v_pres_id, ts.position, ts.type, ts.question, ts.config, ts.image_url, ts.kahoot_mode
  from template_slides ts
  where ts.template_id = p_template_id
  order by ts.position;

  update templates set usage_count = usage_count + 1 where id = p_template_id;
  return v_pres_id;
end $$;

-- save_as_template: clone an existing presentation into a template
create or replace function save_as_template(
  p_presentation_id uuid,
  p_owner_id uuid,
  p_slug text,
  p_title text,
  p_description text,
  p_category text,
  p_tags text[],
  p_visibility text
) returns uuid
language plpgsql security definer as $$
declare
  v_tpl_id uuid;
begin
  if not exists (select 1 from presentations where id = p_presentation_id and owner_id = p_owner_id) then
    raise exception 'not owner of presentation';
  end if;

  insert into templates (slug, title, description, category, tags, owner_id, visibility, is_seed)
  values (p_slug, p_title, p_description, p_category, coalesce(p_tags, '{}'), p_owner_id, p_visibility, false)
  returning id into v_tpl_id;

  insert into template_slides (template_id, position, type, question, config, image_url, kahoot_mode)
  select v_tpl_id, s.position, s.type, s.question, s.config, s.image_url, s.kahoot_mode
  from slides s where s.presentation_id = p_presentation_id
  order by s.position;

  return v_tpl_id;
end $$;
