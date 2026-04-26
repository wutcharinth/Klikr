import Link from "next/link";
import { Plus, QrCode, Sparkles, Zap, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

function FloatingOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -top-20 -left-16 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(0,113,227,0.20), transparent 65%)", animation: "drift 12s ease-in-out infinite alternate" }}
      />
      <div
        className="absolute top-1/2 -right-24 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(124,138,255,0.18), transparent 65%)", animation: "drift 16s ease-in-out -3s infinite alternate-reverse" }}
      />
    </div>
  );
}

export async function HomeLanding() {
  const t = await getTranslations("home");

  const stepIcons = [Plus, QrCode, Sparkles];
  const stepKeys = ["1", "2", "3"] as const;

  const faqKeys = [
    { qKey: "freeQ", aKey: "freeA" },
    { qKey: "installQ", aKey: "installA" },
    { qKey: "typesQ", aKey: "typesA" },
    { qKey: "aiQ", aKey: "aiA" },
    { qKey: "compareQ", aKey: "compareA" },
    { qKey: "anonQ", aKey: "anonA" },
    { qKey: "demoQ", aKey: null }, // handled inline (has link)
  ] as const;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        mainEntity: faqKeys.map((f) => ({
          "@type": "Question",
          name: t(`faq.${f.qKey}`),
          acceptedAnswer: {
            "@type": "Answer",
            text: f.aKey ? t(`faq.${f.aKey}`) : "See site for details.",
          },
        })),
      },
      {
        "@type": "HowTo",
        name: "How to run a Klikr session",
        description: t("subhead"),
        step: stepKeys.map((n, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: t(`step${n}Title`),
          text: t(`step${n}Body`),
        })),
      },
      {
        "@type": "SoftwareApplication",
        name: "Klikr",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS Safari, Android Chrome",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
    ],
  };

  return (
    <section
      aria-labelledby="home-landing-heading"
      className="surface-tint relative overflow-hidden border-t py-20 sm:py-28"
      style={{ borderColor: "var(--line)" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FloatingOrbs />

      <div className="relative mx-auto max-w-4xl px-6">
        <div className="text-center">
          <div className="anim-fade-up inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
               style={{ background: "rgba(0,113,227,0.08)", border: "1px solid rgba(0,113,227,0.25)", color: "var(--blue)" }}>
            <Zap size={12} strokeWidth={2.5} />
            {t("badge")}
          </div>
          <h1
            id="home-landing-heading"
            className="anim-fade-up delay-100 mt-5 text-4xl font-semibold tracking-tight sm:text-5xl"
            style={{ letterSpacing: "-0.025em" }}
          >
            {t("headlinePart1")}{" "}
            <span style={{ background: "linear-gradient(120deg, var(--blue) 0%, #7c8aff 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              {t("headlinePart2")}
            </span>{" "}
            {t("headlinePart3")}
          </h1>
          <p className="anim-fade-up delay-200 mx-auto mt-4 max-w-2xl text-base sm:text-lg muted-text">
            {t("subhead")}
          </p>
          <div className="anim-fade-up delay-300 mt-7 flex items-center justify-center gap-2.5">
            <Link href="/login" className="btn-primary press">
              {t("ctaHost")}
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
            <Link href="/templates" className="btn-ghost press">
              {t("ctaTemplates")}
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20">
          <h2 className="text-2xl font-semibold tracking-tight text-center">{t("howItWorks")}</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {stepKeys.map((n, i) => {
              const Icon = stepIcons[i];
              return (
                <li
                  key={n}
                  className="group relative anim-fade-up panel p-6 transition-all duration-300 hover:-translate-y-1"
                  style={{ animationDelay: `${400 + i * 150}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white transition-transform duration-300 group-hover:scale-110"
                      style={{ background: "linear-gradient(135deg, var(--blue) 0%, #7c8aff 100%)" }}
                    >
                      <Icon size={18} strokeWidth={2.5} />
                    </span>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] muted-text">{t("step")} {n}</div>
                      <div className="font-semibold leading-tight">{t(`step${n}Title`)}</div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed muted-text">{t(`step${n}Body`)}</p>
                </li>
              );
            })}
          </ol>
        </div>

        {/* FAQ */}
        <div className="mt-24">
          <h2 className="text-2xl font-semibold tracking-tight text-center">{t("faqTitle")}</h2>
          <div className="mt-8 space-y-2">
            {faqKeys.map(({ qKey, aKey }, i) => (
              <details
                key={qKey}
                className="group anim-fade-up panel transition-colors hover:border-[var(--line-strong)]"
                style={{ animationDelay: `${100 + i * 60}ms` }}
              >
                <summary className="cursor-pointer list-none p-5 flex items-center justify-between gap-4">
                  <span className="font-medium">{t(`faq.${qKey}`)}</span>
                  <span className="muted-text transition-transform group-open:rotate-45" aria-hidden>
                    <Plus size={16} strokeWidth={2.5} />
                  </span>
                </summary>
                <div className="px-5 pb-5 text-sm leading-relaxed muted-text">
                  {aKey ? (
                    t(`faq.${aKey}`)
                  ) : (
                    <>
                      {t("faq.demoBefore")}
                      <Link href="/demo" className="underline" style={{ color: "var(--blue)" }}>
                        {t("faq.demoLink")}
                      </Link>
                      {t("faq.demoAfter")}
                    </>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-24 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">{t("finalCtaTitle")}</h2>
          <p className="mt-2 text-sm muted-text">{t("finalCtaBody")}</p>
          <div className="mt-6 flex items-center justify-center gap-2.5">
            <Link href="/login" className="btn-primary press">
              {t("ctaStart")}
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
            <Link href="/about" className="btn-ghost press">
              {t("ctaAbout")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
