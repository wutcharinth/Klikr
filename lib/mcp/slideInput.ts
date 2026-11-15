import type { SlideConfig, SlideType } from "@/lib/types";
import { isAllowedEmbedUrl } from "@/lib/embed";

// Turns the flat, LLM-friendly slide shape the MCP tools accept into the
// { type, question, config, kahoot_mode } row the app stores, enforcing the
// same limits as the web editor. Every failure is a SlideInputError whose
// message says exactly what to change, so an MCP client can self-correct.

export const SLIDE_TYPES = ["mcq", "quiz", "wordcloud", "open", "qa", "rating", "ranking", "embed"] as const;

export const LIMITS = {
  question: 500,
  option: 200,
  minOptions: 2,
  maxOptions: 12,
  /** Game-mode quizzes render at most four answer tiles. */
  maxGameOptions: 4,
  minTime: 5,
  maxTime: 120,
  defaultTime: 20,
  explanation: 500,
  label: 60,
  maxWords: 10,
  defaultWords: 3,
} as const;

export class SlideInputError extends Error {}

export type StoredSlide = {
  type: SlideType;
  question: string;
  config: SlideConfig;
  kahoot_mode: boolean;
};

/** Fields each slide type accepts (besides type/question/config). */
const FIELDS: Record<SlideType, readonly string[]> = {
  mcq: ["options", "multi_select", "max_choices"],
  quiz: ["options", "correct_answer", "correct_index", "time_limit_s", "explanation", "game_mode"],
  wordcloud: ["max_words"],
  open: [],
  qa: ["upvotes", "moderation"],
  rating: ["scale", "min_label", "max_label"],
  ranking: ["items"],
  embed: ["url"],
};
const COMMON = new Set(["type", "question", "config"]);

type Raw = Record<string, unknown>;

/**
 * Build a stored slide from MCP input.
 * - Create: pass only `input`; required fields must be present.
 * - Update: pass the existing slide as `base`; only the fields given change.
 */
export function normalizeSlide(input: unknown, base?: StoredSlide, label = "slide"): StoredSlide {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new SlideInputError(`${label}: expected an object.`);
  }
  const raw = input as Raw;

  const type = (raw.type ?? base?.type) as SlideType | undefined;
  if (!type || !(SLIDE_TYPES as readonly string[]).includes(type)) {
    throw new SlideInputError(`${label}: "type" must be one of ${SLIDE_TYPES.join(", ")}.`);
  }
  if (base && raw.type !== undefined && raw.type !== base.type) {
    throw new SlideInputError(
      `${label}: a slide's type can't be changed (it is "${base.type}"). Delete it and add a new "${String(raw.type)}" slide instead.`,
    );
  }

  const allowed = FIELDS[type];
  const unknown = Object.keys(raw).filter((k) => !COMMON.has(k) && !allowed.includes(k) && raw[k] !== undefined);
  if (unknown.length > 0) {
    throw new SlideInputError(
      `${label}: ${unknown.map((k) => `"${k}"`).join(", ")} ${unknown.length === 1 ? "doesn't" : "don't"} apply to ${type} slides. ` +
        (allowed.length ? `Allowed fields: ${allowed.join(", ")}.` : `${type} slides only take a question.`),
    );
  }

  // Legacy callers pass a raw `config`; flat fields win over it.
  const legacy = raw.config;
  if (legacy !== undefined && (typeof legacy !== "object" || legacy === null || Array.isArray(legacy))) {
    throw new SlideInputError(`${label}: "config" must be an object.`);
  }
  const prev = (base?.config ?? {}) as Raw;
  const cfgIn = { ...prev, ...((legacy as Raw | undefined) ?? {}) };
  const pick = <T>(flat: string, cfgKey = flat): T | undefined =>
    (raw[flat] !== undefined ? raw[flat] : cfgIn[cfgKey]) as T | undefined;

  let question = base?.question ?? "";
  if (raw.question !== undefined) {
    if (typeof raw.question !== "string") throw new SlideInputError(`${label}: "question" must be a string.`);
    question = raw.question.trim();
  }
  if (question.length > LIMITS.question) {
    throw new SlideInputError(`${label}: "question" is ${question.length} characters; the limit is ${LIMITS.question}.`);
  }
  if (!question && type !== "embed") {
    throw new SlideInputError(`${label}: "question" is required.`);
  }

  switch (type) {
    case "mcq": {
      const options = stringList(pick("options"), `${label}.options`, LIMITS.maxOptions);
      const multi = bool(pick("multi_select", "multi"), `${label}.multi_select`) ?? false;
      let maxChoices = int(pick("max_choices"), `${label}.max_choices`);
      if (!multi) maxChoices = undefined;
      else if (maxChoices !== undefined && (maxChoices < 1 || maxChoices > options.length)) {
        throw new SlideInputError(`${label}: "max_choices" must be between 1 and ${options.length} (the number of options).`);
      }
      const config: Raw = { options };
      if (multi) {
        config.multi = true;
        config.max_choices = maxChoices ?? options.length;
      }
      return { type, question, config: config as SlideConfig, kahoot_mode: false };
    }

    case "quiz": {
      const gameMode = bool(raw.game_mode, `${label}.game_mode`) ?? base?.kahoot_mode ?? true;
      const optionsChanged = raw.options !== undefined || (legacy as Raw | undefined)?.options !== undefined;
      const options = stringList(pick("options"), `${label}.options`, gameMode ? LIMITS.maxGameOptions : LIMITS.maxOptions, () =>
        gameMode ? ` Game-mode quizzes show at most ${LIMITS.maxGameOptions} answer tiles; set game_mode: false for more.` : "",
      );

      let correct: number | undefined;
      if (raw.correct_answer !== undefined) {
        if (typeof raw.correct_answer !== "string") throw new SlideInputError(`${label}: "correct_answer" must be a string.`);
        const want = norm(raw.correct_answer);
        correct = options.findIndex((o) => norm(o) === want);
        if (correct < 0) {
          throw new SlideInputError(
            `${label}: "correct_answer" ("${raw.correct_answer}") must exactly match one of the options: ${options.map((o) => `"${o}"`).join(", ")}.`,
          );
        }
      } else {
        const idx = int(raw.correct_index !== undefined ? raw.correct_index : (legacy as Raw | undefined)?.correct_index, `${label}.correct_index`);
        if (idx !== undefined) correct = idx;
        else if (!optionsChanged) correct = int(cfgIn.correct_index, `${label}.correct_index`);
      }
      if (correct === undefined) {
        throw new SlideInputError(
          base && optionsChanged
            ? `${label}: when you change a quiz's options, also say which one is right with "correct_answer" (the exact option text).`
            : `${label}: say which option is right with "correct_answer" (the exact option text) or "correct_index" (0-based).`,
        );
      }
      if (correct < 0 || correct >= options.length) {
        throw new SlideInputError(`${label}: "correct_index" must be between 0 and ${options.length - 1} (0-based).`);
      }

      const time = int(pick("time_limit_s"), `${label}.time_limit_s`) ?? LIMITS.defaultTime;
      if (time < LIMITS.minTime || time > LIMITS.maxTime) {
        throw new SlideInputError(`${label}: "time_limit_s" must be between ${LIMITS.minTime} and ${LIMITS.maxTime} seconds.`);
      }
      const explanation = optString(pick("explanation"), `${label}.explanation`, LIMITS.explanation);

      const config: Raw = { options, correct_index: correct, time_limit_s: time };
      if (explanation) config.explanation = explanation;
      return { type, question, config: config as SlideConfig, kahoot_mode: gameMode };
    }

    case "wordcloud": {
      const max = int(pick("max_words", "max_words_per_participant"), `${label}.max_words`) ?? LIMITS.defaultWords;
      if (max < 1 || max > LIMITS.maxWords) {
        throw new SlideInputError(`${label}: "max_words" must be between 1 and ${LIMITS.maxWords}.`);
      }
      return { type, question, config: { max_words_per_participant: max }, kahoot_mode: false };
    }

    case "open":
      return { type, question, config: {} as SlideConfig, kahoot_mode: false };

    case "qa": {
      const upvotes = bool(pick("upvotes"), `${label}.upvotes`) ?? true;
      const moderation = pick<unknown>("moderation") ?? "off";
      if (moderation !== "off" && moderation !== "pre" && moderation !== "post") {
        throw new SlideInputError(`${label}: "moderation" must be "off", "pre" (approve before showing) or "post" (hide after).`);
      }
      return { type, question, config: { upvotes, moderation }, kahoot_mode: false };
    }

    case "rating": {
      const scale = int(pick("scale"), `${label}.scale`) ?? 5;
      if (scale !== 5 && scale !== 10) {
        throw new SlideInputError(`${label}: "scale" must be 5 (1–5) or 10 (0–10, NPS-style).`);
      }
      const min = optString(pick("min_label"), `${label}.min_label`, LIMITS.label);
      const max = optString(pick("max_label"), `${label}.max_label`, LIMITS.label);
      const config: Raw = { scale };
      if (min) config.min_label = min;
      if (max) config.max_label = max;
      return { type, question, config: config as SlideConfig, kahoot_mode: false };
    }

    case "ranking": {
      const items = stringList(pick("items"), `${label}.items`, LIMITS.maxOptions);
      return { type, question, config: { items }, kahoot_mode: false };
    }

    case "embed": {
      const url = pick<unknown>("url");
      if (typeof url !== "string" || !url.trim()) {
        throw new SlideInputError(`${label}: "url" is required for embed slides (a public Google Slides or PowerPoint Web link).`);
      }
      if (!isAllowedEmbedUrl(url.trim())) {
        throw new SlideInputError(`${label}: "url" must be an https Google Slides / Google Drive or PowerPoint Web / OneDrive link.`);
      }
      const u = url.trim();
      const provider = /google\.com/.test(u) ? "google-slides" : /office|live\.com|1drv\.ms/.test(u) ? "powerpoint" : "other";
      return { type, question, config: { url: u, provider }, kahoot_mode: false };
    }
  }
}

function norm(s: string) {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function stringList(v: unknown, label: string, max: number, extra: () => string = () => ""): string[] {
  if (!Array.isArray(v)) {
    throw new SlideInputError(`${label}: required — a list of ${LIMITS.minOptions}–${max} short strings.`);
  }
  const out = v.map((x, i) => {
    if (typeof x !== "string" || !x.trim()) throw new SlideInputError(`${label}[${i}]: must be a non-empty string.`);
    const t = x.trim();
    if (t.length > LIMITS.option) throw new SlideInputError(`${label}[${i}]: is ${t.length} characters; the limit is ${LIMITS.option}.`);
    return t;
  });
  if (out.length < LIMITS.minOptions || out.length > max) {
    throw new SlideInputError(`${label}: needs ${LIMITS.minOptions}–${max} entries (got ${out.length}).${extra()}`);
  }
  const seen = new Set<string>();
  for (const o of out) {
    const k = norm(o);
    if (seen.has(k)) throw new SlideInputError(`${label}: "${o}" appears twice — entries must be distinct.`);
    seen.add(k);
  }
  return out;
}

function int(v: unknown, label: string): number | undefined {
  if (v === undefined || v === null) return undefined;
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n)) throw new SlideInputError(`${label}: must be a whole number.`);
  return n;
}

function bool(v: unknown, label: string): boolean | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "boolean") throw new SlideInputError(`${label}: must be true or false.`);
  return v;
}

function optString(v: unknown, label: string, max: number): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") throw new SlideInputError(`${label}: must be a string.`);
  const t = v.trim();
  if (t.length > max) throw new SlideInputError(`${label}: is ${t.length} characters; the limit is ${max}.`);
  return t || undefined;
}

/** JSON Schema for one slide, shared by the create/add/update tools. */
export const SLIDE_INPUT_SCHEMA = {
  type: "object",
  description:
    "One slide. Set `type`, a `question`, and the fields for that type (others are rejected). " +
    "quiz = scored question with one right answer; mcq = poll; wordcloud; open = free text; qa = audience questions; " +
    "rating = 1–5 or 0–10 scale; ranking = order items; embed = Google Slides / PowerPoint page.",
  properties: {
    type: { type: "string", enum: [...SLIDE_TYPES] },
    question: { type: "string", maxLength: LIMITS.question, description: "The prompt shown to the audience." },
    options: {
      type: "array",
      items: { type: "string", maxLength: LIMITS.option },
      description: `quiz, mcq: ${LIMITS.minOptions}–${LIMITS.maxOptions} distinct answers (game-mode quizzes: at most ${LIMITS.maxGameOptions}).`,
    },
    correct_answer: { type: "string", description: "quiz: the exact text of the right option (preferred)." },
    correct_index: { type: "integer", minimum: 0, description: "quiz: 0-based index of the right option (alternative to correct_answer)." },
    time_limit_s: {
      type: "integer",
      minimum: LIMITS.minTime,
      maximum: LIMITS.maxTime,
      description: `quiz: seconds to answer (default ${LIMITS.defaultTime}).`,
    },
    explanation: { type: "string", maxLength: LIMITS.explanation, description: "quiz: shown after the reveal — why the answer is right." },
    game_mode: {
      type: "boolean",
      description: "quiz: big-screen game show with coloured answer tiles, speed scoring and a leaderboard (default true).",
    },
    multi_select: { type: "boolean", description: "mcq: let people pick more than one option." },
    max_choices: { type: "integer", minimum: 1, description: "mcq with multi_select: most options one person may pick." },
    items: {
      type: "array",
      items: { type: "string", maxLength: LIMITS.option },
      description: `ranking: ${LIMITS.minOptions}–${LIMITS.maxOptions} distinct items to put in order.`,
    },
    scale: { type: "integer", enum: [5, 10], description: "rating: 5 (1–5) or 10 (0–10). Default 5." },
    min_label: { type: "string", maxLength: LIMITS.label, description: "rating: label for the low end." },
    max_label: { type: "string", maxLength: LIMITS.label, description: "rating: label for the high end." },
    max_words: { type: "integer", minimum: 1, maximum: LIMITS.maxWords, description: `wordcloud: words per person (default ${LIMITS.defaultWords}).` },
    upvotes: { type: "boolean", description: "qa: let the audience upvote questions (default true)." },
    moderation: {
      type: "string",
      enum: ["off", "pre", "post"],
      description: 'qa: "off" (default), "pre" = approve before showing, "post" = hide after.',
    },
    url: { type: "string", description: "embed: public https Google Slides or PowerPoint Web link." },
  },
  required: ["type"],
} as const;
