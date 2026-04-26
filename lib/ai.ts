// Google GenAI SDK wrapper. Uses Gemini 2.5 Flash by default. Per-route
// max_tokens. Logs token usage to ai_usage. The shape (rateLimitOk,
// withinMonthlyCap, generate, logUsage, parseJson) matches the previous
// Anthropic helper so AI routes don't need to change.

import { GoogleGenAI } from "@google/genai";
import { createServiceClient } from "@/lib/supabase/service";

export const AI_MODEL = "gemini-2.5-flash";

// Approximate Gemini 2.5 Flash USD per million tokens.
// Tweak if pricing changes.
const PRICE_INPUT_PER_MTOK = 0.3;
const PRICE_OUTPUT_PER_MTOK = 2.5;

export const AI_MONTHLY_CAP_USD = Number(process.env.AI_MONTHLY_CAP_USD ?? "20");

export type AIRoute =
  | "generate-presentation"
  | "suggest-options"
  | "summarize-responses"
  | "cluster-wordcloud"
  | "recommend-templates";

function apiKey(): string | undefined {
  return process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY;
}

export function aiConfigured(): boolean {
  return Boolean(apiKey());
}

let _client: GoogleGenAI | null = null;
function client(): GoogleGenAI {
  if (_client) return _client;
  const key = apiKey();
  if (!key) throw new Error("GOOGLE_GENAI_API_KEY not set");
  _client = new GoogleGenAI({ apiKey: key });
  return _client;
}

// In-memory rate limit (10 calls/min per user). Single-instance Railway only.
const buckets = new Map<string, { tokens: number; last: number }>();
const REFILL_PER_MS = 10 / 60_000;
const MAX_TOKENS = 10;

export function rateLimitOk(userId: string): boolean {
  const now = Date.now();
  const b = buckets.get(userId) ?? { tokens: MAX_TOKENS, last: now };
  const refill = (now - b.last) * REFILL_PER_MS;
  const tokens = Math.min(MAX_TOKENS, b.tokens + refill);
  if (tokens < 1) {
    buckets.set(userId, { tokens, last: now });
    return false;
  }
  buckets.set(userId, { tokens: tokens - 1, last: now });
  return true;
}

export async function monthlyUsdSpend(): Promise<number> {
  const supabase = createServiceClient();
  const since = new Date();
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("ai_usage")
    .select("usd_estimate")
    .gte("created_at", since.toISOString());
  return (data ?? []).reduce((sum, r: { usd_estimate: number | string }) => sum + Number(r.usd_estimate), 0);
}

export async function withinMonthlyCap(): Promise<boolean> {
  return (await monthlyUsdSpend()) < AI_MONTHLY_CAP_USD;
}

type GenerateOptions = {
  system: string;
  user: string;
  maxTokens: number;
  /** Kept for API compatibility — Gemini caches transparently on its end. */
  cacheSystem?: boolean;
  /** Pre-fill the model's response — coerces JSON output. */
  prefill?: string;
};

export type GenerateResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  usd: number;
};

function estimateUsd(input: number, output: number): number {
  return (
    (input * PRICE_INPUT_PER_MTOK) / 1_000_000 +
    (output * PRICE_OUTPUT_PER_MTOK) / 1_000_000
  );
}

export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  // Gemini's responseMimeType: "application/json" already forces clean JSON,
  // so we ignore the prefill (which was for Anthropic) and just send the user
  // turn.
  const resp = await client().models.generateContent({
    model: AI_MODEL,
    contents: [{ role: "user", parts: [{ text: opts.user }] }],
    config: {
      systemInstruction: opts.system,
      maxOutputTokens: opts.maxTokens,
      // Lower temperature for the structured-JSON tasks we have.
      temperature: 0.5,
      responseMimeType: "application/json",
    },
  });

  const text = resp.text ?? "";

  const usage = resp.usageMetadata;
  const inputTokens = usage?.promptTokenCount ?? 0;
  const outputTokens = usage?.candidatesTokenCount ?? 0;
  const usd = estimateUsd(inputTokens, outputTokens);

  return {
    text,
    inputTokens,
    outputTokens,
    cacheWriteTokens: 0,
    cacheReadTokens: usage?.cachedContentTokenCount ?? 0,
    usd,
  };
}

export async function logUsage(opts: {
  userId: string | null;
  route: AIRoute;
  result: GenerateResult;
  credits?: number;
}): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("ai_usage").insert({
    user_id: opts.userId,
    route: opts.route,
    input_tokens: opts.result.inputTokens + opts.result.cacheWriteTokens + opts.result.cacheReadTokens,
    output_tokens: opts.result.outputTokens,
    usd_estimate: opts.result.usd.toFixed(6),
    credits_consumed: opts.credits ?? 0,
  });
}

/** Extract the first JSON object/array from a text block — tolerates code fences. */
export function parseJson<T = unknown>(raw: string): T {
  let s = raw.trim();
  if (s.startsWith("```")) s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const start = s.search(/[\[{]/);
  if (start >= 0) s = s.slice(start);
  return JSON.parse(s) as T;
}
