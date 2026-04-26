export type SlideType = "mcq" | "wordcloud" | "open" | "quiz" | "qa" | "rating" | "embed";

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

export type QAConfig = {
  /** Allow audience members to upvote each other's questions. */
  upvotes?: boolean;
};

export type RatingConfig = {
  /** 5 (1–5 stars / scale) or 10 (NPS-style 0–10). */
  scale: 5 | 10;
  min_label?: string;
  max_label?: string;
};

export type EmbedConfig = {
  /** Public Google Slides / PowerPoint Web / Office.com URL. */
  url: string;
  provider?: "google-slides" | "powerpoint" | "office" | "other";
};

export type SlideConfig =
  | MCQConfig
  | WordCloudConfig
  | OpenConfig
  | QuizConfig
  | QAConfig
  | RatingConfig
  | EmbedConfig;

export type Slide = {
  id: string;
  presentation_id: string;
  position: number;
  type: SlideType;
  question: string;
  config: SlideConfig;
  image_url: string | null;
  kahoot_mode?: boolean;
  created_at: string;
};

export type Theme = {
  logo_url?: string | null;
  accent_color?: string | null;
  mode?: "light" | "dark";
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
  theme?: Theme;
  is_template?: boolean;
  source_template_id?: string | null;
};

export type Participant = {
  id: string;
  presentation_id: string;
  participant_token?: string;
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

export type Template = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  cover_image_url: string | null;
  is_seed: boolean;
  owner_id: string | null;
  visibility: "public" | "team" | "private";
  usage_count: number;
  created_at: string;
};

export type TemplateSlide = {
  id: string;
  template_id: string;
  position: number;
  type: SlideType;
  question: string;
  config: SlideConfig;
  image_url: string | null;
  kahoot_mode?: boolean;
};

export type PlanTier = "free" | "basic" | "pro";

export type Profile = {
  id: string;
  plan_tier: PlanTier;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  onboarded_at: string | null;
  created_at: string;
};
