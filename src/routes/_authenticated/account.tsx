import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Package, User } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { customerProfileQuery, myOrdersQuery } from "@/lib/queries";
import { formatKES } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My account — Phenomenal Products KE" },
      {
        name: "description",
        content: "View your order history and save your delivery details for faster checkout.",
      },
      { property: "og:title", content: "My account — Phenomenal Products KE" },
      {
        property: "og:description",
        content: "Your orders and saved delivery details at Phenomenal Products KE.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-12 text-center text-sm text-destructive">
      {error.message}
    </div>
  ),
});

const STATUS_LABEL: Record<string, string> = {
  new: "Received",
  confirmed: "Confirmed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function AccountPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useQuery(customerProfileQuery(user?.id));
  const { data: orders = [], isLoading } = useQuery(myOrdersQuery(user?.id));

  const [form, setForm] = useState({ full_name: "", phone: "", delivery_area: "" });
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) return;
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        delivery_area: profile.delivery_area ?? "",
      });
      setHydrated(true);
    } else if (user) {
      setForm((f) => ({
        ...f,
        full_name:
          f.full_name ||
          (user.user_metadata?.full_name as string | undefined) ||
          user.email?.split("@")[0] ||
          "",
      }));
    }
  }, [profile, user, hydrated]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("customer_profiles").upsert(
      {
        user_id: user.id,
        full_name: form.full_name.trim() || null,
        phone: form.phone.trim() || null,
        delivery_area: form.delivery_area.trim() || null,
      },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Details saved — checkout will fill in for you next time.");
    qc.invalidateQueries({ queryKey: ["customer-profile", user.id] });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-xs uppercase tracking-[0.35em] text-gold">My account</p>
        <h1 className="mt-2 font-serif text-3xl md:text-4xl">
          {form.full_name ? `Hi, ${form.full_name.split(" ")[0]}` : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{user?.email}</p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          <section>
            <h2 className="flex items-center gap-2 font-serif text-xl">
              <Package className="h-4 w-4 text-brand" /> Order history
            </h2>
            {isLoading ? (
              <p className="mt-4 text-sm text-muted-foreground">Loading your orders…</p>
            ) : orders.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  You haven't placed any orders yet.
                </p>
                <Link
                  to="/shop"
                  data-tip="Go to the product catalogue"
                  className="mt-4 inline-flex rounded-full bg-brand px-6 py-3 text-xs font-bold uppercase tracking-[0.2em]"
                >
                  Start shopping
                </Link>
              </div>
            ) : (
              <ul className="mt-4 space-y-4">
                {orders.map((o) => (
                  <li key={o.id} className="rounded-3xl border border-border bg-card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-mono text-sm font-bold text-brand">#{o.reference}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString("en-KE", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <span className="rounded-full border border-border px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    </div>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {o.order_items.map((i) => (
                        <li key={i.id} className="flex justify-between gap-4">
                          <span className="text-muted-foreground">
                            {i.qty} × {i.product_name}
                            {i.variant_label ? ` (${i.variant_label})` : ""}
                          </span>
                          <span className="font-mono">{formatKES(i.unit_price_kes * i.qty)}</span>
                        </li>
                      ))}
                    </ul>
                    {(o.discount_kes > 0 || o.delivery_fee_kes > 0) && (
                      <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
                        {o.discount_kes > 0 && (
                          <div className="flex justify-between text-success">
                            <span>Discount{o.coupon_code ? ` (${o.coupon_code})` : ""}</span>
                            <span className="font-mono">−{formatKES(o.discount_kes)}</span>
                          </div>
                        )}
                        {o.delivery_fee_kes > 0 && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>Delivery{o.delivery_zone ? ` · ${o.delivery_zone}` : ""}</span>
                            <span className="font-mono">{formatKES(o.delivery_fee_kes)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm font-bold">
                      <span>Total</span>
                      <span className="font-mono text-brand">{formatKES(o.total_kes)}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Delivering to {o.delivery_area}
                      {o.delivery_zone ? ` — ${o.delivery_zone}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="h-fit rounded-3xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 font-serif text-xl">
              <User className="h-4 w-4 text-brand" /> Delivery details
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Saved details fill in automatically at checkout.
            </p>
            <form onSubmit={saveProfile} className="mt-5 space-y-4">
              <Field label="Full name">
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  maxLength={100}
                  autoComplete="name"
                  data-tip="The name we address deliveries to"
                  className="ac-input"
                />
              </Field>
              <Field label="Phone number">
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  maxLength={20}
                  inputMode="tel"
                  autoComplete="tel"
                  data-tip="We use this to reach you about payment and delivery"
                  className="ac-input"
                />
              </Field>
              <Field label="Default delivery area">
                <input
                  value={form.delivery_area}
                  onChange={(e) => setForm((f) => ({ ...f, delivery_area: e.target.value }))}
                  maxLength={120}
                  data-tip="Where your orders usually go"
                  className="ac-input"
                />
              </Field>
              <button
                type="submit"
                disabled={saving}
                data-tip="Save these details for faster checkout"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-xs font-bold uppercase tracking-[0.25em] disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save details
              </button>
              <style>{`
                .ac-input {
                  width: 100%;
                  border-radius: 1rem;
                  border: 1px solid var(--border);
                  background: var(--input);
                  padding: 0.7rem 1rem;
                  font-size: 0.9rem;
                  outline: none;
                }
                .ac-input:focus { border-color: var(--brand); }
              `}</style>
            </form>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
