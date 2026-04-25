export type SlideType = "mcq" | "wordcloud" | "open" | "quiz";

export type MCQConfig = {
  options: string[];
};

export type WordCloudConfig = {
  max_words_per_participant?: number;
};

export type OpenConfig = Record<string, never>;

export type QuizConfig = {
  options: string[];
  correct_index: number;
  time_limit_s: number;
};

export type SlideConfig = MCQConfig | WordCloudConfig | OpenConfig | QuizConfig;

export type Slide = {
  id: string;
  presentation_id: string;
  position: number;
  type: SlideType;
  question: string;
  config: SlideConfig;
  created_at: string;
};

export type Presentation = {
  id: string;
  owner_id: string;
  title: string;
  code: string;
  current_slide_id: string | null;
  state: "lobby" | "active" | "closed";
  current_slide_started_at: string | null;
  created_at: string;
};

export type Participant = {
  id: string;
  presentation_id: string;
  nickname: string;
  score: number;
  created_at: string;
};

export type ResponseRow = {
  id: string;
  slide_id: string;
  participant_id: string;
  value_text: string | null;
  value_index: number | null;
  response_ms: number | null;
  created_at: string;
};
