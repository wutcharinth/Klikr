import Link from "next/link";
import { LayoutTemplate, Sparkles, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function StartTiles({ signedIn = false }: { signedIn?: boolean }) {
  const t = await getTranslations("startTiles");
  const tiles = [
    {
      Icon: LayoutTemplate,
      title: t("tile1Title"),
      body: t("tile1Body"),
      href: "/templates",
      cta: t("tile1Cta"),
    },
    {
      Icon: Sparkles,
      title: t("tile2Title"),
      body: t("tile2Body"),
      href: signedIn ? "/dashboard?ai=1" : "/login?next=/dashboard?ai=1",
      cta: t("tile2Cta"),
    },
    {
      Icon: Plus,
      title: t("tile3Title"),
      body: t("tile3Body"),
      href: signedIn ? "/dashboard" : "/login",
      cta: signedIn ? t("tile3CtaSignedIn") : t("tile3CtaVisitor"),
    },
  ];
  return (
    <section className="mx-auto max-w-5xl px-6 pb-20">
      <h2 className="text-center text-3xl font-semibold tracking-tight">{t("title")}</h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm muted-text">{t("intro")}</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Link key={tile.title} href={tile.href} className="panel p-6 transition-transform hover:-translate-y-0.5">
            <tile.Icon className="h-6 w-6" style={{ color: "var(--blue)" }} />
            <p className="mt-3 font-medium">{tile.title}</p>
            <p className="mt-1 text-xs muted-text">{tile.body}</p>
            <span className="mt-4 inline-flex text-sm" style={{ color: "var(--blue)" }}>
              {tile.cta} →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
