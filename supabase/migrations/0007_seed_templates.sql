-- Seed curated templates. Idempotent on slug.

do $$
declare v_id uuid;
begin

-- =========================== ICEBREAKERS ===========================

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('idea-creation', 'Idea Creation Word Cloud',
  'A single-slide word cloud for fast group brainstorming. Drop a question, watch ideas land in real time.',
  'Brainstorming', array['brainstorm','wordcloud','workshop'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'wordcloud', 'In one word — what comes to mind?', '{"max_words_per_participant":3}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('big-meeting-icebreaker', 'Big Meeting Icebreaker',
  'Three quick questions to warm up a large group before the real agenda begins.',
  'Icebreakers', array['icebreaker','meeting','large-group'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'mcq', 'How are you feeling right now?', '{"options":["Energized","Curious","Tired","Skeptical"]}'::jsonb),
  (v_id, 1, 'wordcloud', 'Describe your week in one word.', '{"max_words_per_participant":1}'::jsonb),
  (v_id, 2, 'open', 'What''s one thing you hope we cover today?', '{}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('conversation-starters', 'Conversation Starters',
  'Light, fun prompts to kick off a small-team meeting or class.',
  'Icebreakers', array['icebreaker','small-group'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'mcq', 'Beach or mountains?', '{"options":["Beach","Mountains","Both","Neither"]}'::jsonb),
  (v_id, 1, 'open', 'Best meal you''ve had this month?', '{}'::jsonb),
  (v_id, 2, 'rating', 'How adventurous are you (1 = couch potato, 10 = skydiver)?', '{"scale":10,"min_label":"Couch","max_label":"Skydive"}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('two-truths-and-a-lie', 'Two Truths and a Lie',
  'Classic team-building game adapted for live voting. The host shares three statements, the room votes which is the lie.',
  'Icebreakers', array['icebreaker','game','team-building'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'mcq', 'Which of these is the lie?', '{"options":["Statement 1","Statement 2","Statement 3"]}'::jsonb);

-- =========================== BRAINSTORMING ===========================

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('brand-positioning', 'Brand Positioning Workshop',
  'Five slides to align your team on what your brand stands for and where it sits in the market.',
  'Workshops', array['workshop','brand','strategy'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'wordcloud', 'When you hear our brand name, what comes to mind?', '{"max_words_per_participant":3}'::jsonb),
  (v_id, 1, 'open', 'Who is our ideal customer in one sentence?', '{}'::jsonb),
  (v_id, 2, 'mcq', 'Which value should we lead with?', '{"options":["Trust","Speed","Craft","Care","Boldness"]}'::jsonb),
  (v_id, 3, 'rating', 'How distinct does our positioning feel today?', '{"scale":5,"min_label":"Generic","max_label":"Distinct"}'::jsonb),
  (v_id, 4, 'qa', 'Open questions for the marketing lead', '{"upvotes":true}'::jsonb);

-- =========================== CLASSROOM ===========================

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('comprehension-quiz', 'Quick Comprehension Quiz',
  'A four-question quiz template to check what stuck after a short lesson. Kahoot-style timing.',
  'Classroom', array['quiz','classroom','assessment'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config, kahoot_mode) values
  (v_id, 0, 'quiz', 'Replace with your question 1', '{"options":["Option A","Option B","Option C","Option D"],"correct_index":0,"time_limit_s":20}'::jsonb, true),
  (v_id, 1, 'quiz', 'Replace with your question 2', '{"options":["Option A","Option B","Option C","Option D"],"correct_index":1,"time_limit_s":20}'::jsonb, true),
  (v_id, 2, 'quiz', 'Replace with your question 3', '{"options":["Option A","Option B","Option C","Option D"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 3, 'quiz', 'Replace with your question 4', '{"options":["Option A","Option B","Option C","Option D"],"correct_index":3,"time_limit_s":20}'::jsonb, true);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('end-of-class-reflection', 'End-of-class Reflection',
  'Three slides to wrap up a lesson and gather feedback before students leave.',
  'Classroom', array['reflection','classroom','feedback'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'wordcloud', 'One word that captures today''s lesson?', '{"max_words_per_participant":1}'::jsonb),
  (v_id, 1, 'open', 'What still feels unclear?', '{}'::jsonb),
  (v_id, 2, 'rating', 'How confident do you feel about the topic now?', '{"scale":5,"min_label":"Lost","max_label":"Got it"}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('pop-quiz', 'Pop Quiz Template',
  'Five fast quiz questions in Kahoot mode. Replace the placeholders with your subject content.',
  'Classroom', array['quiz','kahoot','classroom'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config, kahoot_mode) values
  (v_id, 0, 'quiz', 'Question 1', '{"options":["A","B","C","D"],"correct_index":0,"time_limit_s":15}'::jsonb, true),
  (v_id, 1, 'quiz', 'Question 2', '{"options":["A","B","C","D"],"correct_index":1,"time_limit_s":15}'::jsonb, true),
  (v_id, 2, 'quiz', 'Question 3', '{"options":["A","B","C","D"],"correct_index":2,"time_limit_s":15}'::jsonb, true),
  (v_id, 3, 'quiz', 'Question 4', '{"options":["A","B","C","D"],"correct_index":3,"time_limit_s":15}'::jsonb, true),
  (v_id, 4, 'quiz', 'Question 5', '{"options":["A","B","C","D"],"correct_index":0,"time_limit_s":15}'::jsonb, true);

-- =========================== BUSINESS ===========================

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('all-hands-qa', 'All-Hands Q&A',
  'A two-slide setup: collect questions ahead, then live-vote which to answer. Upvotes enabled.',
  'Business', array['qa','meeting','allhands'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'qa', 'Ask leadership anything', '{"upvotes":true}'::jsonb),
  (v_id, 1, 'rating', 'How clear was today''s update?', '{"scale":5,"min_label":"Foggy","max_label":"Crystal"}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('sprint-retro', 'Sprint Retro',
  'Run a full sprint retrospective in five slides. What went well, what didn''t, what to try.',
  'Business', array['retro','agile','sprint'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating', 'How was this sprint overall?', '{"scale":5,"min_label":"Rough","max_label":"Smooth"}'::jsonb),
  (v_id, 1, 'wordcloud', 'One word for this sprint?', '{"max_words_per_participant":1}'::jsonb),
  (v_id, 2, 'open', 'What went well?', '{}'::jsonb),
  (v_id, 3, 'open', 'What didn''t go well?', '{}'::jsonb),
  (v_id, 4, 'open', 'What should we try next sprint?', '{}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('okr-checkin', 'OKR Check-in',
  'Quarterly OKR pulse: rate confidence, surface blockers, gather actions.',
  'Business', array['okr','quarterly','strategy'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating', 'Confidence we''ll hit our top OKR this quarter?', '{"scale":10,"min_label":"No way","max_label":"Locked in"}'::jsonb),
  (v_id, 1, 'open', 'Biggest blocker right now?', '{}'::jsonb),
  (v_id, 2, 'qa', 'Questions for the leadership team', '{"upvotes":true}'::jsonb);

-- =========================== WORKSHOPS ===========================

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('team-health-check', 'Team Health Check',
  'Six dimensions of team health rated 1–5, plus one open reflection.',
  'Workshops', array['health-check','team','culture'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating', 'Clarity of mission', '{"scale":5}'::jsonb),
  (v_id, 1, 'rating', 'Pace of delivery', '{"scale":5}'::jsonb),
  (v_id, 2, 'rating', 'Quality of work', '{"scale":5}'::jsonb),
  (v_id, 3, 'rating', 'Energy levels', '{"scale":5}'::jsonb),
  (v_id, 4, 'rating', 'Trust within the team', '{"scale":5}'::jsonb),
  (v_id, 5, 'open', 'One thing you''d change tomorrow?', '{}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('sustainability-workshop', 'Sustainability Workshop',
  'Surface ideas and rank them. Designed for cross-team sustainability planning.',
  'Workshops', array['sustainability','workshop','planning'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'wordcloud', 'What does sustainability mean for our team?', '{"max_words_per_participant":3}'::jsonb),
  (v_id, 1, 'open', 'One small change we could ship this quarter?', '{}'::jsonb),
  (v_id, 2, 'mcq', 'Where should we focus first?', '{"options":["Energy","Travel","Materials","Suppliers","Other"]}'::jsonb);

-- =========================== SURVEYS ===========================

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('event-feedback', 'Event Feedback NPS',
  'Three-slide event close-out: NPS, what to keep, what to improve.',
  'Surveys', array['nps','feedback','event'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating', 'How likely are you to recommend this event to a friend?', '{"scale":10,"min_label":"Not at all","max_label":"Definitely"}'::jsonb),
  (v_id, 1, 'open', 'What should we keep doing?', '{}'::jsonb),
  (v_id, 2, 'open', 'What should we change next time?', '{}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('anonymous-pulse', 'Anonymous Pulse',
  'A quick anonymous read of how the room is doing. Two ratings and one open prompt.',
  'Surveys', array['pulse','anonymous','wellbeing'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating', 'How are you feeling this week?', '{"scale":10}'::jsonb),
  (v_id, 1, 'rating', 'How sustainable does your workload feel?', '{"scale":5,"min_label":"Crushing","max_label":"Healthy"}'::jsonb),
  (v_id, 2, 'open', 'Anything you wish leadership knew?', '{}'::jsonb);

end $$;
