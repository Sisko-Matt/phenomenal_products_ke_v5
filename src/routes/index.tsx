import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Flame, ShieldCheck, Truck, Zap, Gift } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { FloatingWhatsapp } from "@/components/floating-whatsapp";
import { Reveal, StaggerGrid, StaggerItem } from "@/components/reveal";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { SITE } from "@/lib/site";
const promo1 = { url: "/assets/promo-1.mp4" };
const promo2 = { url: "/assets/promo-2.mp4" };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Phenomenal Products KE — Deals on Watches, Bracelets & Gifts" },
      {
        name: "description",
        content:
          "Shop watches, bracelets & gift sets in Kenya. Best prices, pay on delivery or M-Pesa. Order via WhatsApp.",
      },
      { property: "og:title", content: "Phenomenal Products KE — Everyday Deals" },
      {
        property: "og:description",
        content: "Watches, bracelets & gift sets in Kenya. Order via WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(categoriesQuery);
    context.queryClient.prefetchQuery(productsQuery({ featured: true }));
    context.queryClient.prefetchQuery(productsQuery());
  },
  component: HomePage,
});

function HomePage() {
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: featured = [] } = useQuery(productsQuery({ featured: true }));
  const { data: all = [] } = useQuery(productsQuery());

  const [shuffledFeatured, setShuffledFeatured] = useState(featured);
  const [shuffledAll, setShuffledAll] = useState(all);

  useEffect(() => {
    if (featured.length > 0) {
      setShuffledFeatured([...featured].sort(() => Math.random() - 0.5));
    }
  }, [featured]);

  useEffect(() => {
    if (all.length > 0) {
      setShuffledAll([...all].sort(() => Math.random() - 0.5));
    }
  }, [all]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero banner */}
      <section className="mx-auto max-w-7xl px-4 pt-4">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-border/40 bg-gradient-to-br from-brand/10 via-card to-card p-6 md:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-brand/30 blur-3xl animate-float"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-gold/15 blur-3xl animate-float-alt"
          />
          <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
            <div className="flex flex-col items-start gap-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand">
                <Flame className="h-3 w-3" /> Deals live now
              </span>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-2xl font-serif text-5xl font-semibold leading-[1.1] tracking-tight md:text-7xl"
              >
                Kenya's home for <br className="hidden md:block" />
                <span className="text-brand">phenomenal</span> quality &{" "}
                <span className="text-shimmer">luxury under budget</span>.
              </motion.h1>
              <p className="max-w-xl text-sm text-muted-foreground md:text-base">
                {SITE.tagline}. Watches, bracelets and gift sets — order via WhatsApp.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-xs font-black uppercase tracking-widest text-brand-foreground shadow-lg animate-pulse-brand hover:opacity-90"
                >
                  Shop deals <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href={`https://wa.me/${SITE.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-success px-5 py-3 text-xs font-black uppercase tracking-widest text-white hover:opacity-90"
                >
                  Chat on WhatsApp
                </a>
                <Link
                  to="/gift-finder"
                  className="inline-flex items-center gap-2 rounded-full border border-brand/50 bg-card px-5 py-3 text-xs font-black uppercase tracking-widest text-brand transition hover:bg-brand/5"
                >
                  <Gift className="h-4 w-4" /> Find a Gift
                </Link>
              </div>
            </div>

            {/* Promo video showcase */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative grid grid-cols-2 gap-3"
            >
              {[promo1, promo2].map((v, i) => (
                <div
                  key={v.url}
                  className={`overflow-hidden rounded-2xl border border-gold/30 shadow-xl ${
                    i === 0 ? "translate-y-2 md:translate-y-6" : "-translate-y-2 md:-translate-y-4"
                  }`}
                >
                  <video
                    src={v.url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    crossOrigin="anonymous"
                    className="aspect-square w-full object-cover bg-card"
                  />
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="mx-auto max-w-7xl px-4 py-4">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            { icon: Truck, label: "Nationwide delivery" },
            { icon: ShieldCheck, label: "Authentic products" },
            { icon: Zap, label: "M-Pesa / Pay on delivery" },
            { icon: Flame, label: "Hot daily deals" },
          ].map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-2 rounded-2xl border border-border/40 bg-card px-3 py-3"
            >
              <f.icon className="h-4 w-4 shrink-0 text-brand" />
              <span className="text-[11px] font-semibold text-muted-foreground md:text-xs">
                {f.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Categories rail */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-4">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-serif text-2xl md:text-3xl">Shop by category</h2>
            <Link to="/shop" className="text-xs font-bold uppercase tracking-widest text-brand">
              See all →
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/shop"
                search={{ category: c.slug }}
                className="group relative flex h-32 w-40 shrink-0 flex-col justify-end overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card to-brand/20 p-3 hover-lift md:w-56 md:h-36"
              >
                <div
                  aria-hidden
                  className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gold/15 blur-2xl transition-transform group-hover:scale-125"
                />
                <p className="relative text-[10px] font-black uppercase tracking-widest text-brand">
                  Category
                </p>
                <p className="relative font-serif text-xl">{c.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured / Flash deals */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-hot px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                <Flame className="mr-0.5 inline h-3 w-3" /> Flash
              </span>
              <h2 className="font-serif text-2xl md:text-3xl">Signature picks</h2>
            </div>
            <Link to="/shop" className="text-xs font-bold uppercase tracking-widest text-brand">
              See more →
            </Link>
          </div>
          <StaggerGrid className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
            {shuffledFeatured.slice(0, 10).map((p) => (
              <StaggerItem key={p.id}>
                <ProductCard product={p} />
              </StaggerItem>
            ))}
          </StaggerGrid>
        </section>
      )}

      {/* Just for you feed */}
      <section className="mx-auto max-w-7xl px-4 py-6">
        <Reveal className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand">
              Just for you
            </p>
            <h2 className="mt-1 font-serif text-2xl md:text-3xl">Trending in Kenya</h2>
          </div>
          <Link to="/shop" className="text-xs font-bold uppercase tracking-widest text-brand">
            See more →
          </Link>
        </Reveal>
        {all.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/50 bg-card p-10 text-center">
            <p className="font-serif text-xl">Catalog opens soon.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              New arrivals will appear here — check back shortly.
            </p>
          </div>
        ) : (
          <>
            <StaggerGrid className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
              {shuffledAll.slice(0, 20).map((p) => (
                <StaggerItem key={p.id}>
                  <ProductCard product={p} />
                </StaggerItem>
              ))}
            </StaggerGrid>
            <div className="mt-8 flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
              <Link
                to="/shop"
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-brand"
              >
                Load more in shop →
              </Link>
            </div>
          </>
        )}
      </section>

      <SiteFooter />
      <FloatingWhatsapp />
    </div>
  );
}
