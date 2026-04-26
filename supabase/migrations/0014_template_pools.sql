-- Template question pools + shuffle support
-- Adds default_count to templates, updates apply_template to handle shuffle/count,
-- expands key template pools with extra questions, and adds the Team Pulse template.

-- 1. Add default_count column
alter table templates add column if not exists default_count int;

-- 2. Update apply_template to support count + shuffle
create or replace function apply_template(
  p_template_id uuid,
  p_owner_id uuid,
  p_title text,
  p_code text,
  p_count int default null,
  p_shuffle boolean default false
)
returns uuid
language plpgsql security definer as $$
declare
  v_pres_id uuid;
  v_count int;
begin
  select coalesce(
    p_count,
    t.default_count,
    (select count(*) from template_slides where template_id = p_template_id)
  )
  into v_count
  from templates t
  where t.id = p_template_id;

  insert into presentations (owner_id, title, code, source_template_id)
  values (p_owner_id, p_title, p_code, p_template_id)
  returning id into v_pres_id;

  insert into slides (presentation_id, position, type, question, config, image_url, kahoot_mode)
  select
    v_pres_id,
    (row_number() over ()) - 1,
    ts.type, ts.question, ts.config, ts.image_url, ts.kahoot_mode
  from (
    select *
    from template_slides
    where template_id = p_template_id
    order by case when p_shuffle then random() else position end
    limit v_count
  ) ts;

  update templates set usage_count = usage_count + 1 where id = p_template_id;
  return v_pres_id;
end $$;

-- 3. Expand pools for key templates (delete + re-seed pattern, safe for seed data)

do $$
declare v_id uuid;
begin

-- ======== TEAM PULSE (new) — 15 questions, default 5 ========
insert into templates (slug, title, description, category, tags, is_seed, visibility, default_count)
values ('team-pulse', 'Team Pulse',
  'A configurable check-in with 15 questions covering energy, clarity, collaboration, and wellbeing. Pick 5, shuffle for variety.',
  'Surveys', array['pulse','wellbeing','team','check-in'], true, 'public', 5)
on conflict (slug) do update set title=excluded.title, default_count=excluded.default_count returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0,  'rating', 'How are you feeling today?',                              '{"scale":10,"min_label":"Rough","max_label":"Great"}'::jsonb),
  (v_id, 1,  'rating', 'How sustainable is your current workload?',               '{"scale":5,"min_label":"Overwhelming","max_label":"Healthy"}'::jsonb),
  (v_id, 2,  'rating', 'How clear are your priorities this week?',                '{"scale":5,"min_label":"Confused","max_label":"Crystal clear"}'::jsonb),
  (v_id, 3,  'rating', 'Do you feel recognised for your contributions?',          '{"scale":5,"min_label":"Not at all","max_label":"Absolutely"}'::jsonb),
  (v_id, 4,  'rating', 'How connected do you feel to your teammates?',            '{"scale":5,"min_label":"Isolated","max_label":"Tight-knit"}'::jsonb),
  (v_id, 5,  'rating', 'How confident are you in the team''s direction?',         '{"scale":5,"min_label":"Lost","max_label":"Aligned"}'::jsonb),
  (v_id, 6,  'rating', 'How is your energy compared to last week?',               '{"scale":5,"min_label":"Lower","max_label":"Higher"}'::jsonb),
  (v_id, 7,  'rating', 'Are you getting enough support to do your best work?',    '{"scale":5,"min_label":"Not enough","max_label":"Fully supported"}'::jsonb),
  (v_id, 8,  'rating', 'How safe do you feel sharing ideas or concerns?',         '{"scale":5,"min_label":"Not safe","max_label":"Very safe"}'::jsonb),
  (v_id, 9,  'rating', 'How satisfied are you with your work-life balance?',      '{"scale":5,"min_label":"Poor","max_label":"Great"}'::jsonb),
  (v_id, 10, 'rating', 'How proud are you of the work your team is doing?',       '{"scale":5,"min_label":"Not proud","max_label":"Very proud"}'::jsonb),
  (v_id, 11, 'rating', 'How aligned do you feel with our team goals?',            '{"scale":5,"min_label":"Misaligned","max_label":"Fully aligned"}'::jsonb),
  (v_id, 12, 'open',   'What''s one thing the team could do differently this week?',  '{}'::jsonb),
  (v_id, 13, 'open',   'What would make this week a 10/10 for you?',              '{}'::jsonb),
  (v_id, 14, 'wordcloud', 'One word to describe your mood right now.',            '{"max_words_per_participant":1}'::jsonb);

-- ======== BIG MEETING ICEBREAKER — pool 8, default 3 ========
update templates set default_count = 3 where slug = 'big-meeting-icebreaker';
select id into v_id from templates where slug = 'big-meeting-icebreaker';
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'mcq',      'How are you feeling right now?',                                    '{"options":["Energized","Curious","Tired","Skeptical"]}'::jsonb),
  (v_id, 1, 'wordcloud','Describe your week in one word.',                                   '{"max_words_per_participant":1}'::jsonb),
  (v_id, 2, 'open',     'What''s one thing you hope we cover today?',                        '{}'::jsonb),
  (v_id, 3, 'mcq',      'Coffee, tea, or something else?',                                   '{"options":["Coffee","Tea","Water","Energy drink","Nothing"]}'::jsonb),
  (v_id, 4, 'rating',   'How much do you enjoy this type of meeting?',                       '{"scale":5,"min_label":"Dreading it","max_label":"Love it"}'::jsonb),
  (v_id, 5, 'open',     'What would make today a great day?',                                '{}'::jsonb),
  (v_id, 6, 'mcq',      'Where are you joining from?',                                       '{"options":["Office","Home","Coffee shop","Somewhere wild"]}'::jsonb),
  (v_id, 7, 'wordcloud','What word describes your current focus?',                           '{"max_words_per_participant":1}'::jsonb);

-- ======== CONVERSATION STARTERS — pool 8, default 3 ========
update templates set default_count = 3 where slug = 'conversation-starters';
select id into v_id from templates where slug = 'conversation-starters';
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'mcq',   'Beach or mountains?',                                                '{"options":["Beach","Mountains","Both","Neither"]}'::jsonb),
  (v_id, 1, 'open',  'Best meal you''ve had this month?',                                  '{}'::jsonb),
  (v_id, 2, 'rating','How adventurous are you? (1=couch, 10=skydiver)',                    '{"scale":10,"min_label":"Couch","max_label":"Skydive"}'::jsonb),
  (v_id, 3, 'mcq',   'Early bird or night owl?',                                           '{"options":["Early bird","Night owl","Depends","Neither"]}'::jsonb),
  (v_id, 4, 'mcq',   'Books, podcasts, or videos?',                                        '{"options":["Books","Podcasts","Videos","None of the above"]}'::jsonb),
  (v_id, 5, 'open',  'What hobby would you pick up if time was no problem?',               '{}'::jsonb),
  (v_id, 6, 'mcq',   'Prefer cities or nature?',                                           '{"options":["City life","Nature","Both equally","Depends on the day"]}'::jsonb),
  (v_id, 7, 'open',  'What''s a skill you''re quietly proud of?',                          '{}'::jsonb);

-- ======== FRIDAY CHECK-IN — pool 7, default 3 ========
update templates set default_count = 3 where slug = 'friday-check-in';
select id into v_id from templates where slug = 'friday-check-in';
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating',   'How energised do you feel heading into the weekend?',             '{"scale":5,"min_label":"Drained","max_label":"Charged"}'::jsonb),
  (v_id, 1, 'open',     'One thing you are proud of from this week?',                      '{}'::jsonb),
  (v_id, 2, 'wordcloud','One word for this week?',                                         '{"max_words_per_participant":1}'::jsonb),
  (v_id, 3, 'rating',   'How well did the team collaborate this week?',                    '{"scale":5,"min_label":"Siloed","max_label":"Seamless"}'::jsonb),
  (v_id, 4, 'open',     'What do you wish you''d had more time for?',                      '{}'::jsonb),
  (v_id, 5, 'mcq',      'Weekend plans vibe?',                                             '{"options":["Full rest","Social plans","Catching up on things","Spontaneous"]}'::jsonb),
  (v_id, 6, 'open',     'One thing to tackle first thing Monday?',                         '{}'::jsonb);

-- ======== SPRINT RETRO — pool 9, default 5 ========
update templates set default_count = 5 where slug = 'sprint-retro';
select id into v_id from templates where slug = 'sprint-retro';
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating',  'How was this sprint overall?',                                     '{"scale":5,"min_label":"Rough","max_label":"Smooth"}'::jsonb),
  (v_id, 1, 'wordcloud','One word for this sprint?',                                       '{"max_words_per_participant":1}'::jsonb),
  (v_id, 2, 'open',    'What went well?',                                                  '{}'::jsonb),
  (v_id, 3, 'open',    'What didn''t go well?',                                            '{}'::jsonb),
  (v_id, 4, 'open',    'What should we try next sprint?',                                  '{}'::jsonb),
  (v_id, 5, 'rating',  'How well did we hit the sprint goal?',                             '{"scale":5,"min_label":"Missed","max_label":"Nailed it"}'::jsonb),
  (v_id, 6, 'open',    'What was the most impactful thing we shipped?',                    '{}'::jsonb),
  (v_id, 7, 'mcq',     'What slowed us down most?',                                        '{"options":["Unclear requirements","Unplanned work","Tech debt","Dependencies","Team capacity"]}'::jsonb),
  (v_id, 8, 'open',    'One thing you''ll personally commit to next sprint?',              '{}'::jsonb);

-- ======== TEAM HEALTH CHECK — pool 10, default 6 ========
update templates set default_count = 6 where slug = 'team-health-check';
select id into v_id from templates where slug = 'team-health-check';
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating', 'Clarity of mission',                                               '{"scale":5}'::jsonb),
  (v_id, 1, 'rating', 'Pace of delivery',                                                 '{"scale":5}'::jsonb),
  (v_id, 2, 'rating', 'Quality of work',                                                  '{"scale":5}'::jsonb),
  (v_id, 3, 'rating', 'Energy levels',                                                    '{"scale":5}'::jsonb),
  (v_id, 4, 'rating', 'Trust within the team',                                            '{"scale":5}'::jsonb),
  (v_id, 5, 'open',   'One thing you''d change tomorrow?',                                '{}'::jsonb),
  (v_id, 6, 'rating', 'Cross-team collaboration',                                         '{"scale":5}'::jsonb),
  (v_id, 7, 'rating', 'Psychological safety',                                             '{"scale":5}'::jsonb),
  (v_id, 8, 'rating', 'Processes and tooling',                                            '{"scale":5}'::jsonb),
  (v_id, 9, 'open',   'What would make the team significantly better?',                   '{}'::jsonb);

-- ======== ANONYMOUS PULSE — pool 8, default 4 ========
update templates set default_count = 4 where slug = 'anonymous-pulse';
select id into v_id from templates where slug = 'anonymous-pulse';
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating', 'How are you feeling this week?',                                   '{"scale":10}'::jsonb),
  (v_id, 1, 'rating', 'How sustainable does your workload feel?',                         '{"scale":5,"min_label":"Crushing","max_label":"Healthy"}'::jsonb),
  (v_id, 2, 'open',   'Anything you wish leadership knew?',                               '{}'::jsonb),
  (v_id, 3, 'rating', 'How clear is your direction this week?',                           '{"scale":5,"min_label":"Confused","max_label":"Clear"}'::jsonb),
  (v_id, 4, 'rating', 'How motivated do you feel?',                                       '{"scale":5,"min_label":"Not motivated","max_label":"Very motivated"}'::jsonb),
  (v_id, 5, 'mcq',    'How are you mainly feeling right now?',                            '{"options":["Energised","Productive","Stressed","Overwhelmed","Disconnected","Good"]}'::jsonb),
  (v_id, 6, 'open',   'What would make next week better?',                                '{}'::jsonb),
  (v_id, 7, 'rating', 'How proud are you of the work you did this week?',                '{"scale":5,"min_label":"Not proud","max_label":"Very proud"}'::jsonb);

-- ======== SCIENCE QUIZ — pool 10, default 5 ========
update templates set default_count = 5 where slug = 'science-trivia-quiz';
select id into v_id from templates where slug = 'science-trivia-quiz';
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config, kahoot_mode) values
  (v_id, 0, 'quiz', 'What is the chemical symbol for gold?',                               '{"options":["Go","Au","Ag","Gd"],"correct_index":1,"time_limit_s":20}'::jsonb, true),
  (v_id, 1, 'quiz', 'How many bones are in the adult human body?',                         '{"options":["196","206","216","226"],"correct_index":1,"time_limit_s":20}'::jsonb, true),
  (v_id, 2, 'quiz', 'What is the powerhouse of the cell?',                                 '{"options":["Nucleus","Ribosome","Mitochondria","Vacuole"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 3, 'quiz', 'Which planet has the most moons?',                                   '{"options":["Jupiter","Saturn","Uranus","Neptune"],"correct_index":1,"time_limit_s":20}'::jsonb, true),
  (v_id, 4, 'quiz', 'At what temperature (°C) does water boil at sea level?',             '{"options":["90","95","100","105"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 5, 'quiz', 'What is the speed of light (approx.) in km/s?',                     '{"options":["200,000","300,000","400,000","150,000"],"correct_index":1,"time_limit_s":20}'::jsonb, true),
  (v_id, 6, 'quiz', 'Which element has the atomic number 1?',                             '{"options":["Helium","Oxygen","Hydrogen","Carbon"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 7, 'quiz', 'What gas do plants absorb from the atmosphere?',                     '{"options":["Oxygen","Nitrogen","Carbon dioxide","Argon"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 8, 'quiz', 'How many chromosomes do humans have?',                               '{"options":["23","44","46","48"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 9, 'quiz', 'What force keeps planets in orbit around the sun?',                  '{"options":["Magnetism","Gravity","Friction","Electrostatics"],"correct_index":1,"time_limit_s":20}'::jsonb, true);

-- ======== HISTORY QUIZ — pool 10, default 5 ========
update templates set default_count = 5 where slug = 'history-trivia-quiz';
select id into v_id from templates where slug = 'history-trivia-quiz';
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config, kahoot_mode) values
  (v_id, 0, 'quiz', 'In which year did World War II end?',                                '{"options":["1943","1944","1945","1946"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 1, 'quiz', 'Which civilisation built Machu Picchu?',                            '{"options":["Aztec","Maya","Inca","Olmec"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 2, 'quiz', 'Who was the first person to walk on the moon?',                     '{"options":["Buzz Aldrin","Yuri Gagarin","Neil Armstrong","John Glenn"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 3, 'quiz', 'The Magna Carta was signed in which year?',                         '{"options":["1015","1115","1215","1315"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 4, 'quiz', 'Which empire was ruled by Julius Caesar?',                          '{"options":["Greek","Persian","Ottoman","Roman"],"correct_index":3,"time_limit_s":20}'::jsonb, true),
  (v_id, 5, 'quiz', 'Who wrote the Declaration of Independence?',                        '{"options":["George Washington","John Adams","Thomas Jefferson","Benjamin Franklin"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 6, 'quiz', 'The Berlin Wall fell in which year?',                               '{"options":["1987","1988","1989","1990"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 7, 'quiz', 'Which country was the first to grant women the right to vote?',    '{"options":["USA","New Zealand","UK","Australia"],"correct_index":1,"time_limit_s":20}'::jsonb, true),
  (v_id, 8, 'quiz', 'Who was the first female Prime Minister of the UK?',               '{"options":["Theresa May","Margaret Thatcher","Angela Merkel","Indira Gandhi"],"correct_index":1,"time_limit_s":20}'::jsonb, true),
  (v_id, 9, 'quiz', 'In what year did the first iPhone launch?',                        '{"options":["2005","2006","2007","2008"],"correct_index":2,"time_limit_s":20}'::jsonb, true);

-- ======== MATH QUIZ — pool 10, default 5 ========
update templates set default_count = 5 where slug = 'math-warmup-quiz';
select id into v_id from templates where slug = 'math-warmup-quiz';
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config, kahoot_mode) values
  (v_id, 0, 'quiz', 'What is 17 × 6?',                                                   '{"options":["92","98","102","112"],"correct_index":2,"time_limit_s":15}'::jsonb, true),
  (v_id, 1, 'quiz', 'What is the square root of 144?',                                   '{"options":["10","11","12","13"],"correct_index":2,"time_limit_s":15}'::jsonb, true),
  (v_id, 2, 'quiz', 'A pizza has 8 slices, you eat 3 — what fraction remains?',         '{"options":["3/8","5/8","1/2","3/5"],"correct_index":1,"time_limit_s":15}'::jsonb, true),
  (v_id, 3, 'quiz', 'What is 15% of 200?',                                               '{"options":["25","30","35","40"],"correct_index":1,"time_limit_s":15}'::jsonb, true),
  (v_id, 4, 'quiz', 'Which of these is a prime number?',                                 '{"options":["21","27","29","33"],"correct_index":2,"time_limit_s":15}'::jsonb, true),
  (v_id, 5, 'quiz', 'What is 2 to the power of 8?',                                     '{"options":["128","256","512","64"],"correct_index":1,"time_limit_s":15}'::jsonb, true),
  (v_id, 6, 'quiz', 'Solve: 3x + 7 = 22. What is x?',                                  '{"options":["4","5","6","7"],"correct_index":1,"time_limit_s":15}'::jsonb, true),
  (v_id, 7, 'quiz', 'What is the area of a circle with radius 5? (use π ≈ 3.14)',       '{"options":["78.5","62.8","31.4","15.7"],"correct_index":0,"time_limit_s":15}'::jsonb, true),
  (v_id, 8, 'quiz', 'What is 9! (9 factorial)?',                                         '{"options":["362880","40320","3628800","72576"],"correct_index":0,"time_limit_s":15}'::jsonb, true),
  (v_id, 9, 'quiz', 'What is 0.25 as a percentage?',                                    '{"options":["2.5%","25%","0.25%","250%"],"correct_index":1,"time_limit_s":15}'::jsonb, true);

-- ======== GEOGRAPHY QUIZ — pool 10, default 5 ========
update templates set default_count = 5 where slug = 'geography-quiz';
select id into v_id from templates where slug = 'geography-quiz';
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config, kahoot_mode) values
  (v_id, 0, 'quiz', 'What is the capital of Australia?',                                 '{"options":["Sydney","Melbourne","Canberra","Brisbane"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 1, 'quiz', 'Which is the longest river in the world?',                          '{"options":["Amazon","Congo","Nile","Yangtze"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 2, 'quiz', 'Which continent is the Sahara Desert on?',                          '{"options":["Asia","South America","Africa","Australia"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 3, 'quiz', 'How many countries are in the EU (2025)?',                          '{"options":["25","27","29","31"],"correct_index":1,"time_limit_s":20}'::jsonb, true),
  (v_id, 4, 'quiz', 'What is the smallest country in the world by area?',               '{"options":["Monaco","Vatican City","San Marino","Liechtenstein"],"correct_index":1,"time_limit_s":20}'::jsonb, true),
  (v_id, 5, 'quiz', 'Which country has the most natural lakes?',                         '{"options":["Russia","USA","Canada","Brazil"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 6, 'quiz', 'What is the capital of Japan?',                                    '{"options":["Osaka","Kyoto","Tokyo","Hiroshima"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 7, 'quiz', 'Which ocean is the largest?',                                      '{"options":["Atlantic","Indian","Arctic","Pacific"],"correct_index":3,"time_limit_s":20}'::jsonb, true),
  (v_id, 8, 'quiz', 'Mount Everest is on the border of which two countries?',           '{"options":["India & China","Nepal & China","Nepal & India","Tibet & Bhutan"],"correct_index":1,"time_limit_s":20}'::jsonb, true),
  (v_id, 9, 'quiz', 'The Amazon rainforest is primarily in which country?',             '{"options":["Colombia","Peru","Venezuela","Brazil"],"correct_index":3,"time_limit_s":20}'::jsonb, true);

-- ======== CULTURE PULSE — pool 8, default 5 ========
update templates set default_count = 5 where slug = 'culture-pulse';
select id into v_id from templates where slug = 'culture-pulse';
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating', 'I feel like I belong here.',                                      '{"scale":5,"min_label":"Disagree","max_label":"Strongly agree"}'::jsonb),
  (v_id, 1, 'rating', 'I feel recognised for the work I do.',                            '{"scale":5,"min_label":"Disagree","max_label":"Strongly agree"}'::jsonb),
  (v_id, 2, 'rating', 'I would recommend this as a great place to work.',               '{"scale":10,"min_label":"Never","max_label":"Definitely"}'::jsonb),
  (v_id, 3, 'wordcloud', 'Describe our culture in one word.',                            '{"max_words_per_participant":1}'::jsonb),
  (v_id, 4, 'open',   'What is one thing leadership could do to improve the culture?',  '{}'::jsonb),
  (v_id, 5, 'rating', 'I feel empowered to make decisions in my role.',                 '{"scale":5,"min_label":"Disagree","max_label":"Strongly agree"}'::jsonb),
  (v_id, 6, 'rating', 'Collaboration between teams works well here.',                   '{"scale":5,"min_label":"Disagree","max_label":"Strongly agree"}'::jsonb),
  (v_id, 7, 'open',   'What is one cultural strength we should protect as we grow?',   '{}'::jsonb);

-- 4. Set default_count for all remaining templates that still have it null
update templates
set default_count = (
  select count(*) from template_slides ts where ts.template_id = templates.id
)
where default_count is null;

end $$;
