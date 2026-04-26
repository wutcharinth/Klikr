import type { MetadataRoute } from "next";

// Klikr's web surface is fully crawlable. We list AI bots explicitly so
// agent-orchestration platforms know they're welcome (and so we can see
// in logs which ones actually visit).
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klikrapp.com";
  const aiAgents = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-Web",
    "PerplexityBot",
    "Google-Extended",
    "Applebot-Extended",
  ];
  return {
    rules: [
      ...aiAgents.map((agent) => ({ userAgent: agent, allow: "/" })),
      { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard/", "/edit/", "/present/"] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
