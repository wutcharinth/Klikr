-- Quiz answer keys must not be readable by players.
--
-- 0001 let anyone (anon key included) SELECT every slide of a non-closed
-- presentation. The anon key ships in the browser bundle, so a player could
-- read slides.config — correct_index and the host's explanation — straight
-- from the REST API before answering a speed-scored quiz.
--
-- The audience page now loads slides server-side with the service role and
-- strips answer fields (app/play/[code]/page.tsx, lib/audienceSlides.ts), and
-- phones learn results from the getQuizResult server action once a question
-- closes. Nothing reads slides anonymously any more, so drop the public read.
-- Owners and editors keep access through "owners manage slides" (0001) and
-- "editors update slides" (0006); server code using the service role and the
-- security-definer RPCs (0027) are unaffected.
--
-- Deploy order: ship the code that loads /play slides with the service role
-- BEFORE running this migration, or the audience page will see no slides.

drop policy if exists "public read slides for active presentations" on slides;
