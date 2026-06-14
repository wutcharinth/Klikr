export type SlideType = "mcq" | "wordcloud" | "open" | "quiz" | "qa" | "rating" | "embed" | "ranking";

export type MCQConfig = {
  options: string[];
  /** Allow audience to pick more than one option. */
  multi?: boolean;
  /** When `multi`, cap on how many options each participant may pick. */
  max_choices?: number;
};

export type WordCloudConfig = {
  max_words_per_participant?: number;
};

export type OpenConfig = Record<string, never>;

export type QuizConfig = {
  options: string[];
  correct_index: number;
  time_limit_s: number;
  /** Optional commentary shown after the answer is revealed — for the host
   *  to elaborate on why the correct answer is correct. */
  explanation?: string;
};

export type QAConfig = {
  /** Allow audience members to upvote each other's questions. */
  upvotes?: boolean;
  /**
   * - `'off'` (default): questions show up immediately.
   * - `'pre'`: questions land in a presenter-only tray until approved.
   * - `'post'`: questions show immediately, presenter can hide them.
   */
  moderation?: "off" | "pre" | "post";
};

export type RankingConfig = {
  items: string[];
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
  | EmbedConfig
  | RankingConfig;

export type ImageCredit = {
  source: "unsplash";
  photographer: string;
  photographer_url: string;
};

export type Slide = {
  id: string;
  presentation_id: string;
  position: number;
  type: SlideType;
  question: string;
  config: SlideConfig;
  image_url: string | null;
  image_credit?: ImageCredit | null;
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
  // Monotonic counter bumped whenever a quiz slide is scored. The audience
  // subscribes to this row via Realtime and refetches scores when it changes,
  // so totals update during the same question's reveal (not one question late).
  scored_rev?: number;
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
  status?: "pending" | "approved" | "rejected" | "answered";
  pinned?: boolean;
  flagged?: boolean;
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
  default_count: number | null;
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
