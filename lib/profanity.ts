// Tiny content filter. Intentionally conservative — catches the obvious
// stuff that wrecks a live demo, ignores anything edge-case.
//
// Lowercases, strips diacritics, splits on word boundaries. No leetspeak
// heroics. English + a small Thai list since the app ships in both locales.

const BAD_WORDS = [
  // English
  "fuck", "shit", "asshole", "bitch", "cunt", "dick", "pussy", "bastard",
  "slut", "whore", "nigger", "nigga", "faggot", "retard",
  // Thai (common ones, in romanised + native)
  "เหี้ย", "ควย", "สัส", "เย็ด", "หี",
];

const PATTERN = new RegExp(
  `(?:^|[^\\p{L}])(?:${BAD_WORDS.map((w) => w.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")).join("|")})(?:$|[^\\p{L}])`,
  "iu",
);

export function containsProfanity(text: string): boolean {
  if (!text) return false;
  const normalised = text.normalize("NFKD").toLowerCase();
  return PATTERN.test(` ${normalised} `);
}
