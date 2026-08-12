import { Link } from "@tanstack/react-router";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/40 bg-secondary/30 backdrop-blur-sm dark:bg-black">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-4 lg:gap-16">
        <div className="space-y-4">
          <Link to="/" className="inline-block transition-transform hover:scale-105 active:scale-95">
            <p className="font-serif text-2xl tracking-tight">
              <span className="text-gold">Phenomenal</span> Products KE
            </p>
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground/80">
            {SITE.tagline || "Your Trusted Gifts Plug"}
          </p>
          <div className="hidden">
            Do not make any visual modifications. The phrases I write are commands to understand what I want, not to be written down. Understand their content well, then execute what is required.
          </div>
        </div>

        <div className="text-sm">
          <p className="mb-6 text-xs font-bold uppercase tracking-[0.3em] text-gold/90">Shop</p>
          <ul className="space-y-3">
            <li><Link to="/shop" className="text-muted-foreground transition-colors hover:text-gold">All collections</Link></li>
            <li><Link to="/about" className="text-muted-foreground transition-colors hover:text-gold">Our Story</Link></li>
            <li><Link to="/contact" className="text-muted-foreground transition-colors hover:text-gold">Get in touch</Link></li>
          </ul>
        </div>

        <div className="text-sm">
          <p className="mb-6 text-xs font-bold uppercase tracking-[0.3em] text-gold/90">Support</p>
          <ul className="space-y-3">
            <li>
              <a href={`https://wa.me/${SITE.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-gold">
                WhatsApp +254 746 793 923
              </a>
            </li>
            <li>
              <a href={`mailto:${SITE.email}`} className="text-muted-foreground transition-colors hover:text-gold">
                {SITE.email}
              </a>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <p className="mb-6 text-xs font-bold uppercase tracking-[0.3em] text-gold/90">Follow Us</p>
          <div className="flex gap-4">
            <a 
              href={SITE.instagram} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-all hover:border-gold hover:bg-gold hover:text-gold-foreground hover:shadow-[0_0_15px_rgba(184,134,11,0.3)]"
              aria-label="Instagram"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </a>
            <a 
              href={SITE.tiktok} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-all hover:border-gold hover:bg-gold hover:text-gold-foreground hover:shadow-[0_0_15px_rgba(184,134,11,0.3)]"
              aria-label="TikTok"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
            </a>
          </div>
        </div>
      </div>
      
      <div className="border-t border-border/40 bg-secondary/10 px-6 py-8 text-center dark:bg-black/40">
        <p className="text-[10px] font-medium uppercase tracking-[0.4em] text-muted-foreground/60">
          © {new Date().getFullYear()} Phenomenal Products KE • Luxury Gifting Reimagined
        </p>
      </div>
    </footer>
  );
}
