-- Make template application fail loudly if the source template is incomplete.

create or replace function apply_template(p_template_id uuid, p_owner_id uuid, p_title text, p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pres_id uuid;
  v_slide_count int;
begin
  select count(*) into v_slide_count
  from template_slides
  where template_id = p_template_id;

  if v_slide_count = 0 then
    raise exception 'template has no slides';
  end if;

  insert into presentations (owner_id, title, code, source_template_id)
  values (p_owner_id, p_title, p_code, p_template_id)
  returning id into v_pres_id;

  insert into slides (presentation_id, position, type, question, config, image_url, kahoot_mode)
  select v_pres_id, ts.position, ts.type, ts.question, ts.config, ts.image_url, ts.kahoot_mode
  from template_slides ts
  where ts.template_id = p_template_id
  order by ts.position;

  if (select count(*) from slides where presentation_id = v_pres_id) <> v_slide_count then
    raise exception 'template copy incomplete';
  end if;

  update templates set usage_count = usage_count + 1 where id = p_template_id;
  return v_pres_id;
end $$;
