import type { QuizConfig, Slide } from "./types";

/** Quiz config as the audience sees it: no answer key. The correct answer only
 *  reaches a player's phone via `getQuizResult` (app/play/[code]/actions.ts),
 *  and only after the question has closed. */
export type AudienceQuizConfig = Pick<QuizConfig, "options" | "time_limit_s">;

/** Strip answer-revealing fields from a slide before it is handed to the
 *  audience page. Everything passed to a client component is serialized into
 *  the HTML/RSC payload, so whatever is left here is readable by any player.
 *
 *  Quiz configs use an allowlist rather than deleting `correct_index` and
 *  `explanation`: a field added to QuizConfig later stays server-only until
 *  someone deliberately exposes it here. */
export function toAudienceSlide(slide: Slide): Slide {
  if (slide.type !== "quiz") return slide;
  const cfg = (slide.config ?? {}) as Partial<QuizConfig>;
  const safe: Partial<AudienceQuizConfig> = {
    options: Array.isArray(cfg.options) ? cfg.options : [],
  };
  if (typeof cfg.time_limit_s === "number") safe.time_limit_s = cfg.time_limit_s;
  // Slide.config is typed as the full SlideConfig union (where QuizConfig
  // requires correct_index), so the narrowed shape needs a cast. Client code
  // reads it back as AudienceQuizConfig, which has no answer fields.
  return { ...slide, config: safe as unknown as Slide["config"] };
}
