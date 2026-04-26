// Read by both server and client. Set NEXT_PUBLIC_AI_ENABLED=true to re-enable.
// Anything other than the literal string "true" disables AI features.
export const AI_ENABLED = process.env.NEXT_PUBLIC_AI_ENABLED === "true";
