import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Phenomenal Products KE" },
      {
        name: "description",
        content: "Learn about Phenomenal Products KE — Kenya's trusted gifts plug for luxury watches, bracelets and gift sets.",
      },
      { property: "og:title", content: "About — Phenomenal Products KE" },
      { property: "og:description", content: "Kenya's trusted gifts plug for luxury watches, bracelets and gift sets." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-4 py-20">
        <p className="text-xs uppercase tracking-[0.35em] text-gold">Our Story</p>
        <h1 className="mt-3 font-serif text-4xl md:text-5xl">Gifts that speak before you do.</h1>
        <div className="mt-8 space-y-6 text-base leading-relaxed text-muted-foreground">
          <p>
            Phenomenal Products KE was born from a simple idea — that a gift should feel as intentional
            as the moment it marks. Every watch, bracelet and gift set in our catalogue is chosen for
            its craftsmanship, its finish, and the quiet confidence it lends the person wearing it.
          </p>
          <p>
            We're based in Nairobi and ship across Kenya. Orders are placed straight through WhatsApp,
            so you always speak to a real person — no faceless checkout, no guesswork.
          </p>
          <p className="text-gold">Your trusted gifts plug.</p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
