import Link from "next/link";
import { Check, Sparkles, X } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import NavBar from "@/components/NavBar";

export async function generateMetadata() {
  const t = await getTranslations("plans");
  return {
    title: t("metaTitle"),
    description: "Free for everyone while we grow. No card. No expiry.",
  };
}

type Money = { usd: number; label: { en: string; th: string } };

const PRICES = {
  free: { usd: 0, label: { en: "$0", th: "฿0" } } as Money,
  basic: { usd: 1.99, label: { en: "$1.99", th: "฿69" } } as Money,
  basicVs: { usd: 11.99, label: { en: "$11.99", th: "฿420" } } as Money,
  pro: { usd: 4.99, label: { en: "$4.99", th: "฿175" } } as Money,
  proVs: { usd: 24.99, label: { en: "$24.99", th: "฿875" } } as Money,
};

function priceLabel(m: Money, locale: string) {
  return locale === "th" ? m.label.th : m.label.en;
}

type CompareRow = {
  feature: string;
  values: [string | boolean, string | boolean, string | boolean];
};

type FaqItem = { q: string; a: string };

export default async function PlansPage() {
  const t = await getTranslations("plans");
  const locale = await getLocale();
  const isTH = locale === "th";

  const tiers = [
    {
      id: "free" as const,
      name: t("freeName"),
      tagline: t("freeTagline"),
      price: priceLabel(PRICES.free, locale),
      regularPrice: priceLabel(PRICES.free, locale),
      cadence: t("forever"),
      isPaid: false,
      vs: null,
      features: (t.raw("freeFeatures") as string[]).map((label) => ({ included: true, label })),
      featuresOff: (t.raw("freeFeaturesOff") as string[]).map((label) => ({ included: false, label })),
      highlight: false,
    },
    {
      id: "basic" as const,
      name: t("basicName"),
      tagline: t("basicTagline"),
      price: priceLabel(PRICES.free, locale),
      regularPrice: priceLabel(PRICES.basic, locale),
      cadence: t("perMonth"),
      isPaid: true,
      vs: t("vs", { price: priceLabel(PRICES.basicVs, locale) }),
      features: (t.raw("basicFeatures") as string[]).map((label) => ({ included: true, label })),
      featuresOff: [] as { included: boolean; label: string }[],
      highlight: false,
    },
    {
      id: "pro" as const,
      name: t("proName"),
      tagline: t("proTagline"),
      price: priceLabel(PRICES.free, locale),
      regularPrice: priceLabel(PRICES.pro, locale),
      cadence: t("perMonth"),
      isPaid: true,
      vs: t("vs", { price: priceLabel(PRICES.proVs, locale) }),
      features: (t.raw("proFeatures") as string[]).map((label) => ({ included: true, label })),
      featuresOff: [] as { included: boolean; label: string }[],
      highlight: true,
    },
  ];

  const creditCosts = t.raw("creditCosts") as { route: string; cost: number }[];
  const compareRows = t.raw("compareRows") as CompareRow[];
  const faqItems = t.raw("faqItems") as FaqItem[];

  const freePriceLabel = priceLabel(PRICES.free, locale);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <NavBar active="plans" />
      <PromoBanner freePriceLabel={freePriceLabel} promoStrong={t("promoStrong", { price: freePriceLabel })} promoRest={t("promoRest")} startFree={t("startFree")} />

      <section className="mt-10 max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-3 text-[17px] text-[var(--neutral)]">
          {t("intro", { price: freePriceLabel })}
        </p>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {tiers.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            mostPopular={t("mostPopular")}
            saveAll={t("saveAll")}
            startFree={t("startFree")}
          />
        ))}
      </section>

      <section className="mt-20">
        <h2 className="text-2xl font-semibold tracking-tight">{t("featuresTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm muted-text">{t("featuresIntro")}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {creditCosts.map((c) => (
            <div key={c.route} className="panel-soft p-4">
              <p className="text-2xl font-semibold tracking-tight">{c.cost}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wider muted-text">{t("credits")}</p>
              <p className="mt-2 text-sm">{c.route}</p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Link href="/credits" className="text-sm" style={{ color: "var(--blue)" }}>
            {t("topupLink")}
          </Link>
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-2xl font-semibold tracking-tight">{t("compareTitle")}</h2>
        <div className="panel mt-6 overflow-hidden">
          <table className="w-full text-sm">
            <thead style={{ background: "var(--pale)" }}>
              <tr>
                <th className="px-5 py-3 text-left font-medium muted-text">{t("feature")}</th>
                <th className="px-5 py-3 text-center font-semibold">{t("freeName")}</th>
                <th className="px-5 py-3 text-center font-semibold">{t("basicName")}</th>
                <th className="px-5 py-3 text-center font-semibold" style={{ color: "var(--blue)" }}>{t("proName")}</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((r) => (
                <tr key={r.feature} style={{ borderTop: "1px solid var(--line)" }}>
                  <td className="px-5 py-3">{r.feature}</td>
                  {r.values.map((v, j) => (
                    <td key={j} className="px-5 py-3 text-center">
                      {typeof v === "boolean" ? (
                        v ? (
                          <Check className="mx-auto h-4 w-4" style={{ color: "var(--blue)" }} />
                        ) : (
                          <X className="mx-auto h-4 w-4 muted-text" />
                        )
                      ) : (
                        <span className={v === "—" ? "muted-text" : ""}>{v}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-2xl font-semibold tracking-tight">{t("faqTitle")}</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {faqItems.map((it) => (
            <div key={it.q} className="panel-soft p-5">
              <p className="font-medium">{it.q}</p>
              <p className="mt-2 text-sm muted-text">{it.a}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-20 mb-10 text-center text-sm text-[var(--neutral)]">
        {t("footerNote")}
      </footer>

      {isTH && (
        <p className="mb-10 text-center text-[11px] muted-text">
          ราคาแสดงเทียบที่ ~35 บาทต่อ 1 USD เพื่อการเปรียบเทียบเท่านั้น
        </p>
      )}
    </main>
  );
}

function PromoBanner({
  promoStrong,
  promoRest,
  startFree,
}: {
  freePriceLabel: string;
  promoStrong: string;
  promoRest: string;
  startFree: string;
}) {
  return (
    <div
      className="mt-6 flex items-center justify-between gap-4 rounded-2xl px-5 py-3 text-sm"
      style={{ background: "linear-gradient(90deg,#fff7e0,#ffeec5)", border: "1px solid #f3d99a" }}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4" style={{ color: "#a06f00" }} />
        <span style={{ color: "#5a3f00" }}>
          <strong>{promoStrong}</strong> {promoRest}
        </span>
      </div>
      <Link
        href="/login"
        className="inline-flex shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors"
        style={{ background: "#1d1d1f", color: "#ffffff", padding: "6px 14px" }}
      >
        {startFree}
      </Link>
    </div>
  );
}

type Tier = {
  id: "free" | "basic" | "pro";
  name: string;
  tagline: string;
  price: string;
  regularPrice: string;
  cadence: string;
  isPaid: boolean;
  vs: string | null;
  features: { included: boolean; label: string }[];
  featuresOff: { included: boolean; label: string }[];
  highlight: boolean;
};

function TierCard({
  tier,
  mostPopular,
  saveAll,
  startFree,
}: {
  tier: Tier;
  mostPopular: string;
  saveAll: string;
  startFree: string;
}) {
  const allFeatures = [...tier.features, ...tier.featuresOff];
  return (
    <div
      className={tier.highlight ? "panel relative p-6" : "panel-soft p-6"}
      style={
        tier.highlight
          ? { borderColor: "var(--blue)", boxShadow: "0 8px 32px rgba(0,113,227,0.15)" }
          : { border: "1px solid var(--line)" }
      }
    >
      {tier.highlight && (
        <span
          className="absolute -top-3 left-6 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider"
          style={{ background: "var(--blue)", color: "var(--white-fixed)" }}
        >
          {mostPopular}
        </span>
      )}
      <h3 className="text-lg font-semibold">{tier.name}</h3>
      <p className="mt-1 text-sm muted-text">{tier.tagline}</p>

      <div className="mt-5">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight">{tier.price}</span>
          {tier.isPaid ? (
            <>
              <span
                className="text-base muted-text"
                style={{ textDecoration: "line-through", textDecorationColor: "rgba(0,0,0,0.4)" }}
              >
                {tier.regularPrice}
              </span>
              <span className="text-xs muted-text">{tier.cadence}</span>
            </>
          ) : (
            <span className="text-xs muted-text">{tier.cadence}</span>
          )}
        </div>
        {tier.isPaid && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ background: "#e8f5e9", color: "#1b5e20" }}
            >
              {saveAll}
            </span>
            {tier.vs && <span className="text-[11px] muted-text">{tier.vs}</span>}
          </div>
        )}
      </div>

      <Link
        href="/login"
        className={tier.highlight ? "btn-primary mt-5 w-full" : "btn-ghost mt-5 w-full"}
        style={tier.highlight ? {} : { border: "1px solid var(--line)" }}
      >
        {startFree}
      </Link>

      <ul className="mt-6 space-y-2.5 text-sm">
        {allFeatures.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            {f.included ? (
              <Check className="mt-0.5 h-4 w-4 flex-none" style={{ color: "var(--blue)" }} />
            ) : (
              <X className="mt-0.5 h-4 w-4 flex-none muted-text" />
            )}
            <span className={f.included ? "" : "muted-text"}>{f.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
