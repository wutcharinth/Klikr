import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klikrapp.com";
  const now = new Date();
  const paths = ["/", "/features", "/templates", "/plans", "/host", "/demo", "/about", "/docs/api"];
  return paths.map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: p === "/" ? "weekly" : "monthly",
    priority: p === "/" ? 1.0 : 0.7,
  }));
}
