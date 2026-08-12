import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { isAdminQuery } from "@/lib/queries";


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Phenomenal Products KE" },
      { name: "description", content: "Sign in to Phenomenal Products KE." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, ready } = useAuth();
  const { data: isAdmin, isFetched: adminChecked } = useQuery(isAdminQuery(user?.id ?? null));
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready || !user || !adminChecked) return;
    navigate({ to: isAdmin ? "/admin" : "/account", replace: true });
  }, [ready, user, isAdmin, adminChecked, navigate]);


  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message || "Google sign-in failed");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-md px-4 py-20">
        <p className="text-xs uppercase tracking-[0.35em] text-gold text-center">Account</p>
        <h1 className="mt-3 font-serif text-4xl text-center">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Sign in to leave reviews, track your orders and check out faster.
        </p>


        <button
          type="button"
          onClick={handleGoogle}
          className="mt-8 w-full rounded-sm border border-border bg-card px-4 py-3 text-sm hover:border-gold"
        >
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmail} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-sm border border-border bg-input px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-sm border border-border bg-input px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-sm bg-gold px-4 py-3 text-xs uppercase tracking-[0.25em] text-gold-foreground disabled:opacity-60"
          >
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>Don't have an account?{" "}
              <button className="text-gold" onClick={() => setMode("signup")}>Sign up</button>
            </>
          ) : (
            <>Already registered?{" "}
              <button className="text-gold" onClick={() => setMode("signin")}>Sign in</button>
            </>
          )}
        </p>

        <p className="mt-8 text-center">
          <Link to="/" className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-gold">
            ← Back to store
          </Link>
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}
