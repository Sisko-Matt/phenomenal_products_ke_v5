import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Menu, X, Sun, Moon, Search, User, Instagram, LogOut } from "lucide-react";
import { useState } from "react";
import { SITE } from "@/lib/site";
const logoUrl = "/assets/logo-icon.png";
const logoFallback = { url: "/assets/logo-fallback.png" };
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { isAdminQuery, categoriesQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { CartButton } from "@/components/cart-drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      data-tip={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-card text-muted-foreground transition hover:text-brand hover:border-brand",
        className,
      )}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function SearchBar({ compact, onSubmit }: { compact?: boolean; onSubmit?: () => void }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        navigate({ to: "/shop", search: term ? { q: term } : {} });
        onSubmit?.();
      }}
      className={cn("relative flex items-center", compact ? "w-full" : "w-full max-w-xl")}
    >
      <Search className="pointer-events-none absolute left-4 h-4 w-4 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search watches, bracelets, gift sets…"
        data-tip="Type a product name and press Search"
        className="w-full rounded-full border border-border/50 bg-card py-2.5 pl-11 pr-24 text-sm outline-none transition focus:border-brand"
      />
      <button
        type="submit"
        data-tip="Search the shop"
        className="absolute right-1 rounded-full bg-brand px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-foreground transition hover:opacity-90"
      >
        Search
      </button>
    </form>
  );
}

const nav = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/gift-finder", label: "Gift Finder" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const { user } = useAuth();
  const { data: isAdmin } = useQuery(isAdminQuery(user?.id ?? null));
  const { data: categories = [] } = useQuery(categoriesQuery);
  const [open, setOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function handleSignOut() {
    setIsLoggingOut(true);
    try {
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      navigate({ to: "/", replace: true });
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  }


  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-2xl">
      {/* Top bar */}
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-3 px-4 sm:h-20 md:gap-4">
        <Link
          to="/"
          aria-label="Phenomenal Products KE — Home"
          data-tip="Return to Home"
          className="group flex shrink-0 items-center gap-2 rounded-full font-serif text-lg tracking-wide whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:gap-3"
        >
          <img
            src={logoUrl}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== logoFallback.url) {
                target.src = logoFallback.url;
              }
            }}
            alt="Phenomenal Products KE"
            className="h-14 w-14 shrink-0 object-contain drop-shadow-[0_2px_6px_rgba(212,175,55,0.45)] transition-all duration-300 ease-out group-hover:scale-110 group-hover:drop-shadow-[0_4px_14px_rgba(212,175,55,0.75)] group-active:scale-95 motion-reduce:transition-none motion-reduce:group-hover:scale-100 sm:h-16 sm:w-16 md:h-14 md:w-14 lg:h-16 lg:w-16"
          />
          <span className="hidden transition-colors group-hover:text-brand md:inline">
            <span className="text-brand font-black">Phenomenal</span> Products KE
          </span>
        </Link>

        <div className="hidden flex-1 md:block">
          <SearchBar />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <a
            href={SITE.instagram}
            target="_blank"
            rel="noopener noreferrer"
            data-tip="Follow us on Instagram"
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-card text-muted-foreground transition hover:border-brand hover:text-brand md:flex"
          >
            <Instagram className="h-4 w-4" />
          </a>
          <a
            href={SITE.tiktok}
            target="_blank"
            rel="noopener noreferrer"
            data-tip="Follow us on TikTok"
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-card text-muted-foreground transition hover:border-brand hover:text-brand md:flex"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
            </svg>
          </a>
          {user ? (
            <>
              {isAdmin && (
                <Link
                  to="/admin"
                  data-tip="Open the admin dashboard"
                  className="hidden rounded-full bg-gold px-3 py-2 text-xs font-black uppercase tracking-wider text-gold-foreground md:inline-block"
                >
                  Admin
                </Link>
              )}
              <Link
                to="/account"
                data-tip="Your orders and delivery details"
                className="hidden items-center gap-1.5 rounded-full border border-border/50 bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-brand hover:text-brand md:inline-flex"
              >
                <User className="h-3.5 w-3.5" /> Account
              </Link>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                data-tip="Sign out of your account"
                className="hidden items-center gap-1.5 rounded-full border border-border/50 bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-brand hover:text-brand md:inline-flex"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              data-tip="Sign in to track orders and leave reviews"
              className="hidden items-center gap-1.5 rounded-full border border-border/50 bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-brand hover:text-brand md:inline-flex"
            >
              <User className="h-3.5 w-3.5" /> Sign in
            </Link>
          )}


          <a
            href={`https://wa.me/${SITE.whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            data-tip="Chat with us on WhatsApp"
            className="hidden rounded-full bg-success px-3 py-2 text-xs font-black uppercase tracking-wider text-white lg:inline-block"
          >
            WhatsApp
          </a>
          <CartButton />
          <button
            className="text-foreground md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            data-tip-side="left"
            data-tip={open ? "Close the menu" : "Open the menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile search */}
      <div className="border-t border-border/40 px-4 py-2 md:hidden">
        <SearchBar compact />
      </div>

      {/* Category chip rail */}
      <div className="border-t border-border/40">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-full border border-border/40 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:border-brand hover:text-brand whitespace-nowrap"
              activeProps={{ className: "border-brand text-brand" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/shop"
              search={{ category: c.slug }}
              className="rounded-full border border-border/40 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:border-brand hover:text-brand whitespace-nowrap"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile menu drawer */}
      <div className={cn("border-t border-border/40 md:hidden", open ? "block" : "hidden")}>
        <nav className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="rounded-xl bg-card px-4 py-3 text-sm font-semibold text-foreground"
            >
              {n.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="rounded-xl bg-gold px-4 py-3 text-sm font-black uppercase tracking-wider text-gold-foreground"
            >
              Admin dashboard
            </Link>
          )}
          {user ? (
            <>
              <Link
                to="/account"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-card px-4 py-3 text-sm font-semibold text-foreground"
              >
                My account
              </Link>
              <button
                onClick={() => {
                  setOpen(false);
                  setShowLogoutConfirm(true);
                }}
                className="rounded-xl border border-border/50 px-4 py-3 text-left text-sm font-semibold text-muted-foreground"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="rounded-xl bg-card px-4 py-3 text-sm font-semibold text-foreground"
            >
              Sign in
            </Link>
          )}

        </nav>
      </div>
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="max-w-[320px] rounded-[2rem] border-border/40 bg-background/95 backdrop-blur-xl p-8 shadow-2xl">
          <DialogHeader className="items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand">
              <LogOut className="h-8 w-8" />
            </div>
            <DialogTitle className="font-serif text-2xl tracking-tight">Confirm Sign Out</DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2 text-center">
              Are you sure you want to sign out? You'll need to sign back in to access your orders.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex-col gap-3 sm:flex-col sm:space-x-0">
            <button
              disabled={isLoggingOut}
              onClick={handleSignOut}
              className="raised-surface w-full rounded-full bg-brand py-3.5 text-sm font-black uppercase tracking-widest text-brand-foreground transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isLoggingOut ? "Signing out..." : "Yes, Sign Out"}
            </button>
            <button
              disabled={isLoggingOut}
              onClick={() => setShowLogoutConfirm(false)}
              className="w-full rounded-full border border-border/50 bg-card py-3.5 text-sm font-bold tracking-wide text-muted-foreground transition-all hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
