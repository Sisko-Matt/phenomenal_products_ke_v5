import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Mail, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SITE, whatsappContactLink } from "@/lib/site";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Phenomenal Products KE" },
      { name: "description", content: "Reach Phenomenal Products KE on WhatsApp or email. We ship across Kenya." },
      { property: "og:title", content: "Contact — Phenomenal Products KE" },
      { property: "og:description", content: "Reach us on WhatsApp or email. We ship across Kenya." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-4 py-20">
        <p className="text-xs uppercase tracking-[0.35em] text-gold">Get in touch</p>
        <h1 className="mt-3 font-serif text-4xl md:text-5xl">We're one message away.</h1>
        <p className="mt-4 text-base text-muted-foreground">
          Questions about a piece, custom gift wrapping, or bulk orders? Reach us on any of the channels below.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <a
            href={whatsappContactLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-sm border border-border bg-card p-6 transition hover:border-gold"
          >
            <MessageCircle className="h-6 w-6 text-gold" />
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">WhatsApp</p>
            <p className="mt-1 font-serif text-xl text-foreground group-hover:text-gold">+254 746 793 923</p>
          </a>
          <a
            href={`mailto:${SITE.email}`}
            className="group rounded-sm border border-border bg-card p-6 transition hover:border-gold"
          >
            <Mail className="h-6 w-6 text-gold" />
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">Email</p>
            <p className="mt-1 font-serif text-xl text-foreground group-hover:text-gold break-all">
              {SITE.email}
            </p>
          </a>
          <div className="rounded-sm border border-border bg-card p-6 md:col-span-2">
            <MapPin className="h-6 w-6 text-gold" />
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">Based in</p>
            <p className="mt-1 font-serif text-xl">Nairobi, Kenya — nationwide delivery</p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
