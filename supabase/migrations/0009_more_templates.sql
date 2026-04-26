-- Seed additional curated templates. Idempotent on slug.

do $$
declare v_id uuid;
begin

-- =========================== ICEBREAKERS ===========================

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('emoji-check-in', 'Emoji Check-in',
  'Pick an emoji that captures your current mood. Fast, fun, and always gets a laugh.',
  'Icebreakers', array['icebreaker','mood','quick'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'mcq', 'Which emoji best describes your mood right now?', '{"options":["😄 Pumped","😌 Chill","😤 Focused","😴 Tired","🤔 Deep in thought"]}'::jsonb),
  (v_id, 1, 'open', 'What would make today a win for you?', '{}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('would-you-rather', 'Would You Rather?',
  'Five playful dilemmas to loosen up any group before diving into work.',
  'Icebreakers', array['icebreaker','game','fun'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'mcq', 'Would you rather: work fully remote or always in-person?', '{"options":["Fully remote","Always in-person","Hybrid forever"]}'::jsonb),
  (v_id, 1, 'mcq', 'Would you rather: know the future or change the past?', '{"options":["Know the future","Change the past"]}'::jsonb),
  (v_id, 2, 'mcq', 'Would you rather: have no meetings for a month or unlimited budget?', '{"options":["No meetings","Unlimited budget"]}'::jsonb),
  (v_id, 3, 'mcq', 'Would you rather: be the smartest or the luckiest person in the room?', '{"options":["Smartest","Luckiest","Both (not an option)"]}'::jsonb),
  (v_id, 4, 'wordcloud', 'Describe your perfect Friday afternoon in one word.', '{"max_words_per_participant":1}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('friday-check-in', 'Friday Check-in',
  'End the week with a quick pulse on how people are feeling before signing off.',
  'Icebreakers', array['icebreaker','wellbeing','friday'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating', 'How energised do you feel heading into the weekend?', '{"scale":5,"min_label":"Drained","max_label":"Charged"}'::jsonb),
  (v_id, 1, 'open', 'One thing you are proud of from this week?', '{}'::jsonb),
  (v_id, 2, 'wordcloud', 'One word for this week?', '{"max_words_per_participant":1}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('new-hire-welcome', 'New Hire Welcome',
  'Welcome new teammates with a light intro session. Works brilliantly in person and remote.',
  'Icebreakers', array['icebreaker','onboarding','welcome'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'mcq', 'Where are you joining us from today?', '{"options":["Office","Home","Coffee shop","Somewhere wild"]}'::jsonb),
  (v_id, 1, 'open', 'Share one fun fact about yourself.', '{}'::jsonb),
  (v_id, 2, 'wordcloud', 'In one word — what made you excited to join?', '{"max_words_per_participant":2}'::jsonb),
  (v_id, 3, 'rating', 'How clear does your first week feel so far?', '{"scale":5,"min_label":"Very foggy","max_label":"Crystal clear"}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('this-or-that-culture', 'This or That: Work Edition',
  'Quick culture-revealing choices. Great for new teams getting to know each other.',
  'Icebreakers', array['icebreaker','culture','team-building'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'mcq', 'Async or sync?', '{"options":["Async (write it down)","Sync (just call)","Depends"]}'::jsonb),
  (v_id, 1, 'mcq', 'Detailed plan or figure it out as we go?', '{"options":["Detailed plan","Figure it out","A bit of both"]}'::jsonb),
  (v_id, 2, 'mcq', 'Celebrate wins big or move straight to the next thing?', '{"options":["Celebrate big","Move fast","Both!"]}'::jsonb),
  (v_id, 3, 'open', 'What is one work habit you swear by?', '{}'::jsonb);

-- =========================== BRAINSTORMING ===========================

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('how-might-we', 'How Might We',
  'Gather and upvote HMW questions to frame your design challenge before generating solutions.',
  'Brainstorming', array['brainstorm','design','hmw'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'open', 'What is the core problem we are trying to solve?', '{}'::jsonb),
  (v_id, 1, 'qa', 'Share your "How might we…" questions for the group to upvote.', '{"upvotes":true}'::jsonb),
  (v_id, 2, 'wordcloud', 'What words describe our ideal solution?', '{"max_words_per_participant":3}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('start-stop-continue', 'Start · Stop · Continue',
  'Classic retrospective format extended with word clouds for richer context.',
  'Brainstorming', array['retro','brainstorm','team'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'open', 'What should we START doing?', '{}'::jsonb),
  (v_id, 1, 'open', 'What should we STOP doing?', '{}'::jsonb),
  (v_id, 2, 'open', 'What should we CONTINUE doing?', '{}'::jsonb),
  (v_id, 3, 'rating', 'How effective is the team right now?', '{"scale":10,"min_label":"Blocked","max_label":"In flow"}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('reverse-brainstorm', 'Reverse Brainstorm',
  'Ask "how could we make this WORSE?" to surface hidden problems and then flip them into solutions.',
  'Brainstorming', array['brainstorm','creative','workshop'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'wordcloud', 'How could we make this experience as bad as possible?', '{"max_words_per_participant":3}'::jsonb),
  (v_id, 1, 'open', 'Pick one "bad" idea and flip it — what is the opposite?', '{}'::jsonb),
  (v_id, 2, 'mcq', 'Which reverse insight is most actionable?', '{"options":["Insight 1","Insight 2","Insight 3","Insight 4"]}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('dot-voting', 'Idea Dot-Voting',
  'Surface the best ideas from the room with a structured vote. Great for end-of-ideation sessions.',
  'Brainstorming', array['brainstorm','vote','decision'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'open', 'Describe your top idea in one sentence.', '{}'::jsonb),
  (v_id, 1, 'mcq', 'Which idea cluster excites you most?', '{"options":["Quick wins","Big bets","Fix the foundation","Delight users"]}'::jsonb),
  (v_id, 2, 'rating', 'How bold should our next move be?', '{"scale":5,"min_label":"Safe","max_label":"Moonshot"}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('problem-definition', 'Problem Definition',
  'Align the room on the exact problem before anyone jumps to solutions.',
  'Brainstorming', array['brainstorm','problem','alignment'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'open', 'In one sentence: what is the problem we are solving?', '{}'::jsonb),
  (v_id, 1, 'wordcloud', 'Who is most affected by this problem?', '{"max_words_per_participant":2}'::jsonb),
  (v_id, 2, 'rating', 'How urgent is this problem to solve right now?', '{"scale":5,"min_label":"Can wait","max_label":"On fire"}'::jsonb),
  (v_id, 3, 'mcq', 'Do we agree on the problem statement?', '{"options":["Yes, fully aligned","Mostly, small tweaks needed","No, we need more discussion"]}'::jsonb);

-- =========================== CLASSROOM ===========================

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('pre-lesson-knowledge-check', 'Pre-lesson Knowledge Check',
  'Find out what students already know before you start. Adjust your delivery on the fly.',
  'Classroom', array['classroom','assessment','pre-test'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating', 'How much do you already know about today''s topic?', '{"scale":5,"min_label":"Nothing","max_label":"Expert"}'::jsonb),
  (v_id, 1, 'wordcloud', 'What words come to mind when you hear today''s topic?', '{"max_words_per_participant":3}'::jsonb),
  (v_id, 2, 'open', 'What burning question do you want answered today?', '{}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('science-trivia-quiz', 'Science Trivia Quiz',
  'Five general science questions in fast Kahoot mode. Swap in your own curriculum questions.',
  'Classroom', array['quiz','science','kahoot','classroom'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config, kahoot_mode) values
  (v_id, 0, 'quiz', 'What is the chemical symbol for gold?', '{"options":["Go","Au","Ag","Gd"],"correct_index":1,"time_limit_s":20}'::jsonb, true),
  (v_id, 1, 'quiz', 'How many bones are in the adult human body?', '{"options":["196","206","216","226"],"correct_index":1,"time_limit_s":20}'::jsonb, true),
  (v_id, 2, 'quiz', 'What is the powerhouse of the cell?', '{"options":["Nucleus","Ribosome","Mitochondria","Vacuole"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 3, 'quiz', 'Which planet has the most moons?', '{"options":["Jupiter","Saturn","Uranus","Neptune"],"correct_index":1,"time_limit_s":20}'::jsonb, true),
  (v_id, 4, 'quiz', 'At what temperature (°C) does water boil at sea level?', '{"options":["90","95","100","105"],"correct_index":2,"time_limit_s":20}'::jsonb, true);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('history-trivia-quiz', 'History Trivia Quiz',
  'Five world history questions in Kahoot mode. Great for warm-up or end-of-unit review.',
  'Classroom', array['quiz','history','kahoot','classroom'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config, kahoot_mode) values
  (v_id, 0, 'quiz', 'In which year did World War II end?', '{"options":["1943","1944","1945","1946"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 1, 'quiz', 'Which civilisation built Machu Picchu?', '{"options":["Aztec","Maya","Inca","Olmec"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 2, 'quiz', 'Who was the first person to walk on the moon?', '{"options":["Buzz Aldrin","Yuri Gagarin","Neil Armstrong","John Glenn"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 3, 'quiz', 'The Magna Carta was signed in which year?', '{"options":["1015","1115","1215","1315"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 4, 'quiz', 'Which empire was ruled by Julius Caesar?', '{"options":["Greek","Persian","Ottoman","Roman"],"correct_index":3,"time_limit_s":20}'::jsonb, true);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('math-warmup-quiz', 'Mental Maths Warm-up',
  'Five rapid-fire mental maths questions. Perfect for the first five minutes of class.',
  'Classroom', array['quiz','math','kahoot','classroom'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config, kahoot_mode) values
  (v_id, 0, 'quiz', 'What is 17 × 6?', '{"options":["92","98","102","112"],"correct_index":2,"time_limit_s":15}'::jsonb, true),
  (v_id, 1, 'quiz', 'What is the square root of 144?', '{"options":["10","11","12","13"],"correct_index":2,"time_limit_s":15}'::jsonb, true),
  (v_id, 2, 'quiz', 'If a pizza has 8 slices and you eat 3, what fraction remains?', '{"options":["3/8","5/8","1/2","3/5"],"correct_index":1,"time_limit_s":15}'::jsonb, true),
  (v_id, 3, 'quiz', 'What is 15% of 200?', '{"options":["25","30","35","40"],"correct_index":1,"time_limit_s":15}'::jsonb, true),
  (v_id, 4, 'quiz', 'Which of these is a prime number?', '{"options":["21","27","29","33"],"correct_index":2,"time_limit_s":15}'::jsonb, true);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('socratic-seminar', 'Socratic Seminar Discussion',
  'Structured discussion starter: pose a question, gather perspectives, rate the debate quality.',
  'Classroom', array['discussion','classroom','critical-thinking'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'mcq', 'Before we discuss — what is your initial position?', '{"options":["Strongly agree","Agree","Neutral","Disagree","Strongly disagree"]}'::jsonb),
  (v_id, 1, 'open', 'Share one piece of evidence or reasoning that supports your view.', '{}'::jsonb),
  (v_id, 2, 'mcq', 'After the discussion — has your position changed?', '{"options":["Yes, I changed my mind","Somewhat shifted","No, reinforced","Not sure"]}'::jsonb),
  (v_id, 3, 'open', 'What is the strongest counterargument you heard?', '{}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('geography-quiz', 'Geography Quiz',
  'Five geography questions in Kahoot mode. Capitals, rivers, landmarks — customise to your unit.',
  'Classroom', array['quiz','geography','kahoot','classroom'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config, kahoot_mode) values
  (v_id, 0, 'quiz', 'What is the capital of Australia?', '{"options":["Sydney","Melbourne","Canberra","Brisbane"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 1, 'quiz', 'Which is the longest river in the world?', '{"options":["Amazon","Congo","Nile","Yangtze"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 2, 'quiz', 'Which continent is the Sahara Desert on?', '{"options":["Asia","South America","Africa","Australia"],"correct_index":2,"time_limit_s":20}'::jsonb, true),
  (v_id, 3, 'quiz', 'How many countries are in the European Union (2025)?', '{"options":["25","27","29","31"],"correct_index":1,"time_limit_s":20}'::jsonb, true),
  (v_id, 4, 'quiz', 'What is the smallest country in the world by area?', '{"options":["Monaco","Vatican City","San Marino","Liechtenstein"],"correct_index":1,"time_limit_s":20}'::jsonb, true);

-- =========================== BUSINESS ===========================

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('product-prioritisation', 'Feature Prioritisation',
  'Align product and engineering on what to build next using structured voting.',
  'Business', array['product','prioritisation','roadmap'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'mcq', 'What should be the team''s top priority this quarter?', '{"options":["Performance","New features","Technical debt","Growth/retention","Better onboarding"]}'::jsonb),
  (v_id, 1, 'rating', 'How confident are you in the current roadmap?', '{"scale":5,"min_label":"Not at all","max_label":"Very confident"}'::jsonb),
  (v_id, 2, 'open', 'What is the one feature customers are asking for most?', '{}'::jsonb),
  (v_id, 3, 'qa', 'Open Q&A for the product team', '{"upvotes":true}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('project-kickoff', 'Project Kickoff',
  'Align a new project team on goals, risks, and ways of working from day one.',
  'Business', array['kickoff','project','alignment'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating', 'How clear is the project goal to you right now?', '{"scale":5,"min_label":"No idea","max_label":"Crystal clear"}'::jsonb),
  (v_id, 1, 'wordcloud', 'What does success look like for this project?', '{"max_words_per_participant":3}'::jsonb),
  (v_id, 2, 'open', 'What is the biggest risk you see?', '{}'::jsonb),
  (v_id, 3, 'mcq', 'How should we communicate day-to-day?', '{"options":["Slack","Daily standups","Weekly sync","Async docs","Mix of all"]}'::jsonb),
  (v_id, 4, 'qa', 'Questions about scope, ownership, or timeline?', '{"upvotes":true}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('hiring-debrief', 'Interview Debrief',
  'Structured post-interview debrief to reach a fair hiring decision as a team.',
  'Business', array['hiring','interview','decision'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating', 'Overall, how strong was the candidate? (1 = no hire, 5 = strong hire)', '{"scale":5,"min_label":"No hire","max_label":"Strong hire"}'::jsonb),
  (v_id, 1, 'mcq', 'What was the candidate''s strongest dimension?', '{"options":["Technical skill","Communication","Culture fit","Problem-solving","Leadership"]}'::jsonb),
  (v_id, 2, 'open', 'What is your biggest concern or reservation?', '{}'::jsonb),
  (v_id, 3, 'mcq', 'Your vote?', '{"options":["Strong hire","Hire","Lean hire","Lean no hire","No hire"]}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('leadership-qa', 'Leadership Town Hall Q&A',
  'Collect and prioritise audience questions for leadership. Works for 10 or 10,000 people.',
  'Business', array['qa','leadership','townhall','allhands'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating', 'How aligned do you feel with the company direction?', '{"scale":5,"min_label":"Off-track","max_label":"Fully aligned"}'::jsonb),
  (v_id, 1, 'wordcloud', 'In one word — how would you describe company morale?', '{"max_words_per_participant":1}'::jsonb),
  (v_id, 2, 'qa', 'Ask leadership anything. Upvote the questions you want answered.', '{"upvotes":true}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('sales-standup', 'Sales Team Standup',
  'Quick daily or weekly standup for a sales team. Momentum, blockers, wins.',
  'Business', array['sales','standup','meeting'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating', 'Pipeline confidence for this week?', '{"scale":5,"min_label":"Worried","max_label":"Locked in"}'::jsonb),
  (v_id, 1, 'open', 'Top priority deal or opportunity right now?', '{}'::jsonb),
  (v_id, 2, 'open', 'Biggest blocker you need help with?', '{}'::jsonb),
  (v_id, 3, 'mcq', 'What does the team need most this week?', '{"options":["More leads","Help with a deal","Better collateral","Competitive intel","Nothing — we''re set"]}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('decision-making', 'Group Decision-Making',
  'Bring a group to a decision without the endless back-and-forth. Structured, fast, fair.',
  'Business', array['decision','meeting','alignment'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'mcq', 'Which option are you leaning toward?', '{"options":["Option A","Option B","Option C","I need more information"]}'::jsonb),
  (v_id, 1, 'open', 'What information would change your vote?', '{}'::jsonb),
  (v_id, 2, 'rating', 'How comfortable are you committing to the group decision?', '{"scale":5,"min_label":"Not at all","max_label":"Fully committed"}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('year-in-review', 'Year in Review',
  'Reflect on the past year, celebrate wins, and set intentions for the next one.',
  'Business', array['reflection','yearend','team'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'wordcloud', 'One word that captures this year for you?', '{"max_words_per_participant":1}'::jsonb),
  (v_id, 1, 'open', 'What are you most proud of from this year?', '{}'::jsonb),
  (v_id, 2, 'open', 'What is the one thing you wish we had done differently?', '{}'::jsonb),
  (v_id, 3, 'wordcloud', 'What word do you want to define next year?', '{"max_words_per_participant":1}'::jsonb),
  (v_id, 4, 'rating', 'Heading into next year — how energised do you feel?', '{"scale":5,"min_label":"Burnt out","max_label":"Fired up"}'::jsonb);

-- =========================== WORKSHOPS ===========================

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('design-sprint-vote', 'Design Sprint Lightning Vote',
  'Rapid structured voting for a design sprint. Align on the riskiest assumption in under 10 minutes.',
  'Workshops', array['design-sprint','vote','product'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'mcq', 'Which part of our solution are we least sure about?', '{"options":["The problem framing","The target user","The core feature","The business model","The technical approach"]}'::jsonb),
  (v_id, 1, 'open', 'Describe the riskiest assumption in one sentence.', '{}'::jsonb),
  (v_id, 2, 'rating', 'How confident are we in our prototype direction?', '{"scale":5,"min_label":"Guessing","max_label":"Very confident"}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('values-alignment', 'Values Alignment Workshop',
  'Help a team articulate and rank shared values before writing them on the wall.',
  'Workshops', array['values','culture','workshop'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'wordcloud', 'What values are non-negotiable for how we work?', '{"max_words_per_participant":3}'::jsonb),
  (v_id, 1, 'mcq', 'Which value matters most when things get hard?', '{"options":["Honesty","Speed","Care","Excellence","Courage","Adaptability"]}'::jsonb),
  (v_id, 2, 'open', 'Describe a moment where you saw our values in action.', '{}'::jsonb),
  (v_id, 3, 'rating', 'How well do we live our values today?', '{"scale":5,"min_label":"Aspirational only","max_label":"Every day"}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('customer-journey-workshop', 'Customer Journey Mapping',
  'Collaboratively map pain points and opportunities across the customer experience.',
  'Workshops', array['cx','journey','workshop'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'mcq', 'Which customer stage should we focus on today?', '{"options":["Awareness","Consideration","Purchase","Onboarding","Retention","Advocacy"]}'::jsonb),
  (v_id, 1, 'open', 'What is the biggest pain point in that stage?', '{}'::jsonb),
  (v_id, 2, 'wordcloud', 'What emotions does the customer feel at this stage?', '{"max_words_per_participant":3}'::jsonb),
  (v_id, 3, 'open', 'What is one opportunity to reduce friction here?', '{}'::jsonb),
  (v_id, 4, 'rating', 'How well do we understand this stage of the journey today?', '{"scale":5,"min_label":"Guessing","max_label":"Deep insight"}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('risk-identification', 'Risk Identification Workshop',
  'Identify, categorise, and prioritise project risks before they become problems.',
  'Workshops', array['risk','planning','workshop'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'open', 'What is the biggest risk that could derail this project?', '{}'::jsonb),
  (v_id, 1, 'mcq', 'What category of risk concerns you most?', '{"options":["Technical","Resource","Timeline","Scope creep","External dependencies","Budget"]}'::jsonb),
  (v_id, 2, 'rating', 'How well prepared are we to handle unexpected risks?', '{"scale":5,"min_label":"Not at all","max_label":"Very well"}'::jsonb),
  (v_id, 3, 'qa', 'Surface risks the group hasn''t discussed yet.', '{"upvotes":true}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('future-state-vision', 'Future State Visioning',
  'Help a team paint a vivid picture of where they want to be in 1–3 years.',
  'Workshops', array['vision','strategy','workshop'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'wordcloud', 'If everything went perfectly, describe our team in 3 years in one word.', '{"max_words_per_participant":2}'::jsonb),
  (v_id, 1, 'open', 'What would we have shipped, achieved, or changed?', '{}'::jsonb),
  (v_id, 2, 'mcq', 'What do we need to focus on most to get there?', '{"options":["People & hiring","Process & tooling","Product & features","Culture & values","Revenue & growth"]}'::jsonb),
  (v_id, 3, 'rating', 'How aligned do you feel on where we are headed?', '{"scale":5,"min_label":"Different visions","max_label":"Fully aligned"}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('agile-planning', 'Agile Sprint Planning',
  'Kick off a sprint with a quick team alignment on goals, capacity, and confidence.',
  'Workshops', array['agile','sprint','planning'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'mcq', 'Sprint goal is clear?', '{"options":["Yes, crystal","Mostly — small tweaks","Still fuzzy","No, we need to re-discuss"]}'::jsonb),
  (v_id, 1, 'rating', 'Team capacity this sprint (accounting for holidays, etc.)?', '{"scale":5,"min_label":"Very low","max_label":"Full capacity"}'::jsonb),
  (v_id, 2, 'open', 'What is at risk of not getting done?', '{}'::jsonb),
  (v_id, 3, 'rating', 'How confident are you we can deliver the sprint goal?', '{"scale":10,"min_label":"Not confident","max_label":"Very confident"}'::jsonb);

-- =========================== SURVEYS ===========================

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('conference-session-feedback', 'Conference Session Feedback',
  'Quick post-session rating for conferences and meetups. Presenter and content scored separately.',
  'Surveys', array['conference','feedback','event'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating', 'How would you rate the content of this session?', '{"scale":5,"min_label":"Poor","max_label":"Excellent"}'::jsonb),
  (v_id, 1, 'rating', 'How engaging was the presenter?', '{"scale":5,"min_label":"Not at all","max_label":"Very engaging"}'::jsonb),
  (v_id, 2, 'mcq', 'Would you recommend this session to a colleague?', '{"options":["Definitely yes","Probably yes","Probably not","Definitely not"]}'::jsonb),
  (v_id, 3, 'open', 'What is one thing the presenter could improve?', '{}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('onboarding-survey', 'Onboarding Experience Survey',
  'Understand how new hires experience their first weeks. Spot patterns and fix fast.',
  'Surveys', array['onboarding','hr','feedback'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating', 'How well did onboarding prepare you for your role?', '{"scale":5,"min_label":"Not at all","max_label":"Very well"}'::jsonb),
  (v_id, 1, 'rating', 'How welcomed did you feel by your team?', '{"scale":5,"min_label":"Not welcome","max_label":"Very welcome"}'::jsonb),
  (v_id, 2, 'mcq', 'What was missing from your onboarding?', '{"options":["More context on the company","Clearer role expectations","Better access to tools","More 1:1 time","Nothing was missing"]}'::jsonb),
  (v_id, 3, 'open', 'What is one thing we should change about onboarding?', '{}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('culture-pulse', 'Culture Pulse Survey',
  'A quick read on culture, belonging, and engagement across your organisation.',
  'Surveys', array['culture','engagement','hr'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating', 'I feel like I belong here.', '{"scale":5,"min_label":"Disagree","max_label":"Strongly agree"}'::jsonb),
  (v_id, 1, 'rating', 'I feel recognised for the work I do.', '{"scale":5,"min_label":"Disagree","max_label":"Strongly agree"}'::jsonb),
  (v_id, 2, 'rating', 'I would recommend this as a great place to work.', '{"scale":10,"min_label":"Never","max_label":"Definitely"}'::jsonb),
  (v_id, 3, 'wordcloud', 'Describe our culture in one word.', '{"max_words_per_participant":1}'::jsonb),
  (v_id, 4, 'open', 'What is one thing leadership could do to improve the culture?', '{}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('product-nps', 'Product NPS',
  'Net Promoter Score for your product, with qualitative follow-up to find the why.',
  'Surveys', array['nps','product','feedback'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating', 'How likely are you to recommend our product to a friend or colleague?', '{"scale":10,"min_label":"Not at all","max_label":"Definitely"}'::jsonb),
  (v_id, 1, 'open', 'What is the main reason for your score?', '{}'::jsonb),
  (v_id, 2, 'open', 'What is the one thing we could do to improve your experience?', '{}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('manager-effectiveness', 'Manager Effectiveness Survey',
  'Anonymous upward feedback on manager effectiveness across five dimensions.',
  'Surveys', array['feedback','management','hr'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating', 'My manager gives me clear direction and priorities.', '{"scale":5,"min_label":"Disagree","max_label":"Strongly agree"}'::jsonb),
  (v_id, 1, 'rating', 'My manager supports my growth and development.', '{"scale":5,"min_label":"Disagree","max_label":"Strongly agree"}'::jsonb),
  (v_id, 2, 'rating', 'My manager communicates openly and honestly.', '{"scale":5,"min_label":"Disagree","max_label":"Strongly agree"}'::jsonb),
  (v_id, 3, 'rating', 'My manager removes blockers and helps me succeed.', '{"scale":5,"min_label":"Disagree","max_label":"Strongly agree"}'::jsonb),
  (v_id, 4, 'open', 'What is one thing your manager does really well?', '{}'::jsonb),
  (v_id, 5, 'open', 'What is one thing your manager could improve?', '{}'::jsonb);

insert into templates (slug, title, description, category, tags, is_seed, visibility)
values ('training-effectiveness', 'Training Effectiveness Survey',
  'Measure how useful and applicable a training session was immediately after delivery.',
  'Surveys', array['training','learning','feedback'], true, 'public')
on conflict (slug) do update set title=excluded.title returning id into v_id;
delete from template_slides where template_id = v_id;
insert into template_slides (template_id, position, type, question, config) values
  (v_id, 0, 'rating', 'How relevant was this training to your day-to-day work?', '{"scale":5,"min_label":"Not relevant","max_label":"Very relevant"}'::jsonb),
  (v_id, 1, 'rating', 'How likely are you to apply what you learned?', '{"scale":5,"min_label":"Unlikely","max_label":"Very likely"}'::jsonb),
  (v_id, 2, 'mcq', 'How was the pace of the training?', '{"options":["Too slow","About right","Too fast"]}'::jsonb),
  (v_id, 3, 'open', 'What topic do you wish was covered in more depth?', '{}'::jsonb);

end $$;
