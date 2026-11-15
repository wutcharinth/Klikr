import { expect, test } from "@playwright/test";
import { normalizeSlide, SlideInputError } from "../lib/mcp/slideInput";

// Pure validation tests for the MCP slide shape — no server or database.

const bad = (input: unknown, msg: RegExp, base?: Parameters<typeof normalizeSlide>[1]) => {
  let caught: unknown;
  try {
    normalizeSlide(input, base);
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(SlideInputError);
  expect((caught as Error).message).toMatch(msg);
};

test("quiz: correct_answer by text, defaults to game mode and 20s", () => {
  const s = normalizeSlide({
    type: "quiz",
    question: " Closest planet to the Sun? ",
    options: ["Venus", "Mercury", "Mars"],
    correct_answer: "mercury",
    explanation: "About 58 million km out.",
  });
  expect(s).toEqual({
    type: "quiz",
    question: "Closest planet to the Sun?",
    config: { options: ["Venus", "Mercury", "Mars"], correct_index: 1, time_limit_s: 20, explanation: "About 58 million km out." },
    kahoot_mode: true,
  });
});

test("quiz: rejects bad answers, too many game tiles, and stray fields", () => {
  bad({ type: "quiz", question: "Q", options: ["A", "B"] }, /correct_answer/);
  bad({ type: "quiz", question: "Q", options: ["A", "B"], correct_answer: "C" }, /must exactly match one of the options/);
  bad({ type: "quiz", question: "Q", options: ["A", "B"], correct_index: 2 }, /between 0 and 1/);
  bad({ type: "quiz", question: "Q", options: ["A", "B", "C", "D", "E"], correct_index: 0 }, /at most 4 answer tiles/);
  bad({ type: "quiz", question: "Q", options: ["A", "a"], correct_index: 0 }, /appears twice/);
  bad({ type: "quiz", question: "Q", options: ["A", "B"], correct_index: 0, time_limit_s: 300 }, /between 5 and 120/);
  bad({ type: "quiz", question: "Q", options: ["A", "B"], correct_index: 0, items: ["x"] }, /"items" doesn't apply to quiz/);
  // Non-game quizzes may have more options.
  expect(
    normalizeSlide({ type: "quiz", question: "Q", options: ["A", "B", "C", "D", "E"], correct_index: 4, game_mode: false }).kahoot_mode,
  ).toBe(false);
});

test("quiz update: keeps the answer, but requires one when options change", () => {
  const base = normalizeSlide({ type: "quiz", question: "Q", options: ["A", "B"], correct_answer: "B" });
  const renamed = normalizeSlide({ question: "Q2" }, base);
  expect(renamed.question).toBe("Q2");
  expect((renamed.config as { correct_index: number }).correct_index).toBe(1);
  bad({ options: ["X", "Y"] }, /also say which one is right/, base);
  const swapped = normalizeSlide({ options: ["X", "Y", "Z"], correct_answer: "Z", time_limit_s: 30 }, base);
  expect(swapped.config).toEqual({ options: ["X", "Y", "Z"], correct_index: 2, time_limit_s: 30 });
  bad({ type: "mcq" }, /type can't be changed/, base);
});

test("survey types: mcq, rating, ranking, wordcloud, qa, open", () => {
  expect(normalizeSlide({ type: "mcq", question: "Lunch?", options: ["Pizza", "Sushi"], multi_select: true }).config).toEqual({
    options: ["Pizza", "Sushi"],
    multi: true,
    max_choices: 2,
  });
  expect(normalizeSlide({ type: "rating", question: "How was it?", scale: 10, max_label: "Loved it" }).config).toEqual({
    scale: 10,
    max_label: "Loved it",
  });
  expect(normalizeSlide({ type: "ranking", question: "Rank", items: ["A", "B", "C"] }).config).toEqual({ items: ["A", "B", "C"] });
  expect(normalizeSlide({ type: "wordcloud", question: "One word" }).config).toEqual({ max_words_per_participant: 3 });
  expect(normalizeSlide({ type: "qa", question: "Ask me anything" }).config).toEqual({ upvotes: true, moderation: "off" });
  expect(normalizeSlide({ type: "open", question: "Thoughts?" }).config).toEqual({});
  bad({ type: "rating", question: "Q", scale: 7 }, /5 \(1–5\) or 10/);
  bad({ type: "mcq", question: "Q", options: ["Only one"] }, /needs 2–12 entries/);
  bad({ type: "open", question: "" }, /"question" is required/);
  bad({ type: "poll", question: "Q" }, /"type" must be one of/);
});

test("embed: only allow-listed https hosts", () => {
  expect(normalizeSlide({ type: "embed", url: "https://docs.google.com/presentation/d/abc/embed" }).config).toEqual({
    url: "https://docs.google.com/presentation/d/abc/embed",
    provider: "google-slides",
  });
  bad({ type: "embed", url: "https://evil.example.com/x" }, /Google Slides/);
});

test("legacy raw config is still accepted", () => {
  const s = normalizeSlide({ type: "quiz", question: "Q", config: { options: ["A", "B"], correct_index: 0, time_limit_s: 15 } });
  expect(s.config).toEqual({ options: ["A", "B"], correct_index: 0, time_limit_s: 15 });
});
