import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  ShoppingBag,
  TicketPercent,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useCart, type CartItem } from "@/hooks/use-cart";
import {
  customerProfileQuery,
  deliveryZonesQuery,
  signedMediaUrlQuery,
  validateCoupon,
} from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatKES } from "@/lib/site";
import { cn } from "@/lib/utils";
import {
  checkoutSchema,
  placeOrder,
  whatsappOrderConfirmation,
  type CheckoutInput,
  type OrderBreakdown,
} from "@/lib/orders";


export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Phenomenal Products KE" },
      {
        name: "description",
        content:
          "Confirm your details and place your order with Phenomenal Products KE — we finish up on WhatsApp.",
      },
      { property: "og:title", content: "Checkout — Phenomenal Products KE" },
      {
        property: "og:description",
        content: "Confirm your details and place your order — we finish up on WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/checkout" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/checkout" }],
  }),
  component: CheckoutPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-12 text-center text-sm text-destructive">
      {error.message}
    </div>
  ),
});

function Thumb({ path, alt }: { path: string | null; alt: string }) {
  const { data: url } = useQuery(signedMediaUrlQuery("product-images", path));
  if (!path || !url) return <div className="h-14 w-14 rounded-xl bg-muted" />;
  return <img src={url} alt={alt} className="h-14 w-14 rounded-xl object-cover" />;
}

function CheckoutPage() {
  const { items, total, clear } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useQuery(customerProfileQuery(user?.id));
  const { data: zones = [] } = useQuery(deliveryZonesQuery());

  const [form, setForm] = useState<CheckoutInput>({
    customer_name: "",
    phone: "",
    delivery_area: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutInput, string>>>({});
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount_kes: number } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [placed, setPlaced] = useState<{
    reference: string;
    link: string;
    items: CartItem[];
    breakdown: OrderBreakdown;
  } | null>(null);

  // Preselect the first delivery zone once zones load.
  useEffect(() => {
    if (!zoneId && zones.length > 0) setZoneId(zones[0].id);
  }, [zones, zoneId]);

  // Fill saved delivery details once for signed-in customers.
  useEffect(() => {
    if (prefilled) return;
    const fallbackName =
      (user?.user_metadata?.full_name as string | undefined) ?? "";
    if (!profile && !fallbackName) return;
    setForm((f) => ({
      ...f,
      customer_name: f.customer_name || profile?.full_name || fallbackName,
      phone: f.phone || profile?.phone || "",
      delivery_area: f.delivery_area || profile?.delivery_area || "",
    }));
    setPrefilled(true);
  }, [profile, user, prefilled]);

  const zone = zones.find((z) => z.id === zoneId) ?? null;
  const discount = applied?.discount_kes ?? 0;
  const deliveryFee = zone?.fee_kes ?? 0;
  const grandTotal = Math.max(0, total - discount) + deliveryFee;

  function set<K extends keyof CheckoutInput>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCouponBusy(true);
    try {
      const res = await validateCoupon(couponInput, total);
      if (!res.valid || !res.code) {
        setApplied(null);
        toast.error(res.message);
      } else {
        setApplied({ code: res.code, discount_kes: res.discount_kes });
        toast.success(`${res.code} applied — you save ${formatKES(res.discount_kes)}.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not check that code");
    } finally {
      setCouponBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = checkoutSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof CheckoutInput, string>> = {};
      for (const issue of (result.error as z.ZodError).issues) {
        const key = issue.path[0] as keyof CheckoutInput;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    if (zones.length > 0 && !zoneId) {
      setZoneError("Please choose a delivery zone.");
      toast.error("Please choose a delivery zone.");
      return;
    }
    setSubmitting(true);
    try {
      const snapshot = items;
      const order = await placeOrder(result.data, snapshot, {
        zoneId,
        couponCode: applied?.code ?? null,
      });
      const breakdown: OrderBreakdown = {
        subtotal: order.subtotal_kes,
        discount: order.discount_kes,
        deliveryFee: order.delivery_fee_kes,
        total: order.total_kes,
        zoneName: zone?.name ?? null,
        couponCode: order.discount_kes > 0 ? (applied?.code ?? null) : null,
      };
      const link = whatsappOrderConfirmation(order.reference, result.data, snapshot, breakdown);
      if (user) {
        await supabase.from("customer_profiles").upsert(
          {
            user_id: user.id,
            full_name: result.data.customer_name,
            phone: result.data.phone,
            delivery_area: result.data.delivery_area,
          },
          { onConflict: "user_id" },
        );
        qc.invalidateQueries({ queryKey: ["customer-profile", user.id] });
        qc.invalidateQueries({ queryKey: ["my-orders", user.id] });
      }
      clear();
      setPlaced({ reference: order.reference, link, items: snapshot, breakdown });
      window.open(link, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place your order");
    } finally {
      setSubmitting(false);
    }
  }


  if (placed) {
    const b = placed.breakdown;
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <h1 className="mt-6 font-serif text-3xl">Order placed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your reference is{" "}
            <span className="font-mono font-bold text-brand">#{placed.reference}</span>. We've saved
            it — finish up on WhatsApp and we'll confirm payment and delivery.
          </p>
          <div className="mt-6 rounded-3xl border border-border bg-card p-5 text-left">
            <ul className="space-y-2 text-sm">
              {placed.items.map((i) => (
                <li key={`${i.id}-${i.variant_id ?? ""}`} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    {i.qty} × {i.name}
                    {i.variant_label ? ` (${i.variant_label})` : ""}
                  </span>
                  <span className="font-mono">{formatKES(i.price_kes * i.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{formatKES(b.subtotal)}</span>
              </div>
              {b.discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount{b.couponCode ? ` (${b.couponCode})` : ""}</span>
                  <span className="font-mono">−{formatKES(b.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Delivery{b.zoneName ? ` · ${b.zoneName}` : ""}
                </span>
                <span className="font-mono">
                  {b.deliveryFee === 0 ? "Free" : formatKES(b.deliveryFee)}
                </span>
              </div>
            </div>
            <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm font-bold">
              <span>Total</span>
              <span className="font-mono text-brand">{formatKES(b.total)}</span>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={placed.link}
              target="_blank"
              rel="noopener noreferrer"
              data-tip="Continue this order on WhatsApp"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-xs font-bold uppercase tracking-[0.2em]"
            >
              <MessageCircle className="h-4 w-4" /> Open WhatsApp
            </a>
            <button
              onClick={() => navigate({ to: "/shop" })}
              data-tip="Go back to the product catalogue"
              className="inline-flex items-center rounded-full border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
            >
              Keep shopping
            </button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-xl px-4 py-24 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-6 font-serif text-3xl">Your bag is empty</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add a few pieces and come back to check out.
          </p>
          <Link
            to="/shop"
            data-tip="Go back to the product catalogue"
            className="mt-6 inline-flex rounded-full bg-brand px-6 py-3 text-xs font-bold uppercase tracking-[0.2em]"
          >
            Browse the shop
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-xs uppercase tracking-[0.35em] text-gold">Checkout</p>
        <h1 className="mt-2 font-serif text-3xl md:text-4xl">Confirm your order</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          We save your order with a reference number, then hand you to WhatsApp to arrange payment
          and delivery.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
          <form onSubmit={submit} className="space-y-5 rounded-3xl border border-border bg-card p-6">
            <CheckoutField label="Full name" error={errors.customer_name}>
              <input
                value={form.customer_name}
                onChange={(e) => set("customer_name", e.target.value)}
                maxLength={100}
                autoComplete="name"
                className="ck-input"
                placeholder="Jane Wanjiru"
                data-tip="The name we should address the delivery to"
              />
            </CheckoutField>
            <CheckoutField label="Phone number" error={errors.phone}>
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                maxLength={20}
                inputMode="tel"
                autoComplete="tel"
                className="ck-input"
                placeholder="07xx xxx xxx"
                data-tip="We use this to reach you about payment and delivery"
              />
            </CheckoutField>

            {zones.length > 0 && (
              <CheckoutField label="Delivery zone" error={zoneError ?? undefined}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {zones.map((z) => (
                    <button
                      type="button"
                      key={z.id}
                      onClick={() => {
                        setZoneId(z.id);
                        setZoneError(null);
                      }}
                      data-tip={`Delivery fee ${z.fee_kes === 0 ? "free" : formatKES(z.fee_kes)}${z.eta ? ` · ${z.eta}` : ""}`}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-left transition-colors",
                        zoneId === z.id
                          ? "border-brand bg-brand/10"
                          : "border-border bg-input hover:border-brand/50",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{z.name}</span>
                        {z.eta && (
                          <span className="block text-[11px] text-muted-foreground">{z.eta}</span>
                        )}
                      </span>
                      <span className="shrink-0 font-mono text-xs font-bold text-brand">
                        {z.fee_kes === 0 ? "Free" : formatKES(z.fee_kes)}
                      </span>
                    </button>
                  ))}
                </div>
              </CheckoutField>
            )}

            <CheckoutField label="Delivery area / landmark" error={errors.delivery_area}>
              <input
                value={form.delivery_area}
                onChange={(e) => set("delivery_area", e.target.value)}
                maxLength={120}
                className="ck-input"
                placeholder="Kimathi Street, CBD — building / estate"
                data-tip="Exact spot the rider should come to"
              />
            </CheckoutField>
            <CheckoutField label="Order notes (optional)" error={errors.notes}>
              <textarea
                rows={4}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                maxLength={1000}
                className="ck-input resize-none"
                placeholder="Gift wrapping, preferred delivery time, landmark…"
                data-tip="Anything special we should know (optional)"
              />
            </CheckoutField>

            <button
              type="submit"
              disabled={submitting}
              data-tip-side="top"
              data-tip="Save your order and continue on WhatsApp"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Placing order…
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4" /> Place order · {formatKES(grandTotal)}
                </>
              )}
            </button>

            <style>{`
              .ck-input {
                width: 100%;
                border-radius: 1rem;
                border: 1px solid var(--border);
                background: var(--input);
                padding: 0.75rem 1rem;
                font-size: 0.9rem;
                outline: none;
              }
              .ck-input:focus { border-color: var(--brand); }
            `}</style>
          </form>

          <aside className="h-fit rounded-3xl border border-border bg-card p-6">
            <h2 className="font-serif text-xl">Order summary</h2>
            <ul className="mt-4 space-y-4">
              {items.map((i) => (
                <li key={`${i.id}-${i.variant_id ?? ""}`} className="flex gap-3">
                  <Thumb path={i.image_url} alt={i.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{i.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.variant_label ? `${i.variant_label} · ` : ""}Qty {i.qty}
                    </p>
                  </div>
                  <span className="font-mono text-sm text-brand">
                    {formatKES(i.price_kes * i.qty)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-5 border-t border-border pt-4">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <TicketPercent className="h-3.5 w-3.5" /> Coupon code
              </label>
              {applied ? (
                <div className="flex items-center justify-between rounded-2xl border border-success/40 bg-success/10 px-4 py-2.5">
                  <span className="font-mono text-sm font-bold">{applied.code}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-success">
                      −{formatKES(applied.discount_kes)}
                    </span>
                    <button
                      onClick={() => {
                        setApplied(null);
                        setCouponInput("");
                      }}
                      data-tip="Remove this coupon"
                      aria-label="Remove coupon"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  </span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    maxLength={30}
                    placeholder="e.g. WELCOME10"
                    data-tip="Have a code? Enter it here"
                    className="ck-input flex-1 font-mono uppercase"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={couponBusy || !couponInput.trim()}
                    data-tip="Check and apply this code"
                    className="inline-flex items-center rounded-2xl border border-border px-4 text-xs font-bold uppercase tracking-widest hover:border-brand hover:text-brand disabled:opacity-50"
                  >
                    {couponBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                  </button>
                </div>
              )}
            </div>

            <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{formatKES(total)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount{applied ? ` (${applied.code})` : ""}</span>
                  <span className="font-mono">−{formatKES(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Delivery{zone ? ` · ${zone.name}` : ""}
                </span>
                <span className="font-mono">
                  {zone ? (deliveryFee === 0 ? "Free" : formatKES(deliveryFee)) : "—"}
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Total
              </span>
              <span className="font-mono text-xl font-bold text-brand">
                {formatKES(grandTotal)}
              </span>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function CheckoutField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
