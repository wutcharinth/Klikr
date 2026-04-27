-- Seed peer-recognition templates. Idempotent on slug.

do $$
declare v_id uuid;
begin

-- =========================== RECOGNITION ===========================

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('team-shoutouts', 'Team Shoutouts',
  'Celebrate each other. Collect and amplify the wins, helps, and small acts of kindness from the past week.',
  'Recognition', array['recognition','culture','kudos','team-building'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'open', 'Who deserves a shoutout this week and why?', '{}'::jsonb),
  (v_id, 1, 'wordcloud', 'In one word, what makes our team great?', '{"max_words_per_participant":2}'::jsonb),
  (v_id, 2, 'qa', 'Drop a thank-you note. The group can upvote the ones that resonate.', '{"upvotes":true}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('peer-kudos', 'Peer Kudos',
  'Lightweight recognition round. Everyone names a teammate who made their work better — fast, sincere, sticky.',
  'Recognition', array['recognition','kudos','culture'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'open', 'Name a teammate who made your work better recently — and what they did.', '{}'::jsonb),
  (v_id, 1, 'mcq', 'What kind of help mattered most to you this week?',
    '{"options":["A timely review","A clear explanation","Picking up slack","Emotional support","A push to do better"]}'::jsonb),
  (v_id, 2, 'wordcloud', 'Three words you would use to describe this team.', '{"max_words_per_participant":3}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('values-in-action', 'Values in Action',
  'Spot teammates living the company values. Surfaces concrete behaviour you actually want to repeat.',
  'Recognition', array['recognition','values','culture','behaviour'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'open', 'Who did you see live one of our values this week? Tell us the story.', '{}'::jsonb),
  (v_id, 1, 'mcq', 'Which value showed up the most across the team this sprint?',
    '{"options":["Customer obsession","Bias for action","Craft & quality","Trust & candour","Long-term thinking"]}'::jsonb),
  (v_id, 2, 'rating', 'How recognised did you feel this sprint?',
    '{"scale":5,"min_label":"Invisible","max_label":"Truly seen"}'::jsonb),
  (v_id, 3, 'qa', 'Open thank-yous — write one, and upvote the ones that land.', '{"upvotes":true}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('moments-of-impact', 'Moments of Impact',
  'Year-end or quarter-close recognition. Surfaces the contributions worth remembering and the people behind them.',
  'Recognition', array['recognition','quarterly','milestones'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'open', 'What is one moment from this quarter you want the team to remember?', '{}'::jsonb),
  (v_id, 1, 'open', 'Who delivered something this quarter that quietly made everything better?', '{}'::jsonb),
  (v_id, 2, 'wordcloud', 'In one word — how did this quarter feel?', '{"max_words_per_participant":1}'::jsonb),
  (v_id, 3, 'rating', 'Pride in our work this quarter, on a scale of 1–10.',
    '{"scale":10,"min_label":"Low","max_label":"Through the roof"}'::jsonb);

end$$;
