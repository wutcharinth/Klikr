-- Kahoot-style trivia template, ready to play out of the box.
-- Idempotent on slug.

do $$
declare v_id uuid;
begin

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('trivia-showdown', 'Trivia Showdown — Kahoot Style',
  'Eight fast-paced trivia questions in Kahoot mode. Mixed topics, real answers — drop into any meeting and play in two minutes.',
  'Classroom', array['quiz','kahoot','trivia','game','fun'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config, kahoot_mode) values
  (v_id, 0, 'quiz', 'Which planet has the most moons?',
    '{"options":["Jupiter","Saturn","Uranus","Neptune"],"correct_index":1,"time_limit_s":15}'::jsonb, true),
  (v_id, 1, 'quiz', 'What does "HTTP" stand for?',
    '{"options":["HyperText Transfer Protocol","High Transfer Text Protocol","HyperTool Transfer Process","Hyperlink Type Transfer Protocol"],"correct_index":0,"time_limit_s":15}'::jsonb, true),
  (v_id, 2, 'quiz', 'Which country invented pizza?',
    '{"options":["France","Italy","Greece","Spain"],"correct_index":1,"time_limit_s":12}'::jsonb, true),
  (v_id, 3, 'quiz', 'In what year did the first iPhone launch?',
    '{"options":["2005","2006","2007","2008"],"correct_index":2,"time_limit_s":15}'::jsonb, true),
  (v_id, 4, 'quiz', 'What is the largest ocean on Earth?',
    '{"options":["Atlantic","Indian","Arctic","Pacific"],"correct_index":3,"time_limit_s":12}'::jsonb, true),
  (v_id, 5, 'quiz', 'Who painted the Mona Lisa?',
    '{"options":["Vincent van Gogh","Leonardo da Vinci","Pablo Picasso","Claude Monet"],"correct_index":1,"time_limit_s":12}'::jsonb, true),
  (v_id, 6, 'quiz', 'What is the smallest prime number?',
    '{"options":["0","1","2","3"],"correct_index":2,"time_limit_s":15}'::jsonb, true),
  (v_id, 7, 'quiz', 'Which language has the most native speakers worldwide?',
    '{"options":["English","Spanish","Mandarin Chinese","Hindi"],"correct_index":2,"time_limit_s":15}'::jsonb, true);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('office-trivia-kahoot', 'Office Trivia — Kahoot Style',
  'Workplace-flavoured Kahoot quiz: brand history, productivity, and tech trivia. Great for team offsites and onboarding.',
  'Icebreakers', array['quiz','kahoot','trivia','team-building','offsite'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config, kahoot_mode) values
  (v_id, 0, 'quiz', 'Which company was originally called "BackRub"?',
    '{"options":["Apple","Google","Amazon","Microsoft"],"correct_index":1,"time_limit_s":15}'::jsonb, true),
  (v_id, 1, 'quiz', 'What does the "S" in HTTPS stand for?',
    '{"options":["Secure","Standard","System","Server"],"correct_index":0,"time_limit_s":12}'::jsonb, true),
  (v_id, 2, 'quiz', 'Which keyboard shortcut undoes the last action on macOS?',
    '{"options":["Cmd + Z","Cmd + U","Cmd + Y","Cmd + R"],"correct_index":0,"time_limit_s":10}'::jsonb, true),
  (v_id, 3, 'quiz', 'What productivity method uses 25-minute work intervals?',
    '{"options":["Eisenhower Matrix","Pomodoro Technique","Getting Things Done","Time Blocking"],"correct_index":1,"time_limit_s":15}'::jsonb, true),
  (v_id, 4, 'quiz', 'Which of these is NOT a programming language?',
    '{"options":["Rust","Kotlin","Cobra","Husk"],"correct_index":3,"time_limit_s":15}'::jsonb, true),
  (v_id, 5, 'quiz', 'Slack was originally built as a tool for what?',
    '{"options":["Email replacement","An internal game-development chat","A CRM","Customer support"],"correct_index":1,"time_limit_s":18}'::jsonb, true),
  (v_id, 6, 'quiz', 'What year was the World Wide Web made publicly available?',
    '{"options":["1989","1991","1993","1995"],"correct_index":1,"time_limit_s":15}'::jsonb, true);

end$$;
