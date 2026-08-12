import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, TicketPercent, Trash2, Truck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { couponsQuery, deliveryZonesQuery } from "@/lib/queries";
import { formatKES } from "@/lib/site";
import { Switch } from "@/components/ui/switch";

export function CouponManager() {
  const qc = useQueryClient();
  const { data: coupons = [], isLoading } = useQuery(couponsQuery);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState<number | "">("");
  const [minSubtotal, setMinSubtotal] = useState<number | "">("");
  const [usageLimit, setUsageLimit] = useState<number | "">("");
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false);

  async function addCoupon(e: React.FormEvent) {
    e.preventDefault();
    const v = typeof value === "number" ? value : 0;
    if (!code.trim() || v <= 0) {
      toast.error("Enter a code and a value.");
      return;
    }
    if (kind === "percent" && v > 100) {
      toast.error("A percentage coupon can't be more than 100%.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("coupons").insert({
      code: code.trim().toUpperCase().replace(/\s+/g, ""),
      kind,
      value: v,
      min_subtotal_kes: typeof minSubtotal === "number" && minSubtotal > 0 ? minSubtotal : 0,
      usage_limit: typeof usageLimit === "number" && usageLimit > 0 ? usageLimit : null,
      expires_at: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
    });
    setBusy(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("duplicate")
          ? "That code already exists."
          : error.message,
      );
      return;
    }
    toast.success("Coupon created.");
    setCode("");
    setValue("");
    setMinSubtotal("");
    setUsageLimit("");
    setExpires("");
    qc.invalidateQueries({ queryKey: ["coupons"] });
  }

  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from("coupons").update({ active }).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["coupons"] });
  }

  async function remove(id: string, couponCode: string) {
    if (!confirm(`Delete coupon ${couponCode}?`)) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Coupon deleted.");
      qc.invalidateQueries({ queryKey: ["coupons"] });
    }
  }

  return (
    <div className="h-fit space-y-4 rounded-sm border border-border bg-card p-6">
      <style>{`
        .input {
          width: 100%;
          border-radius: 2px;
          border: 1px solid var(--border);
          background: var(--input);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus { border-color: var(--gold); }
      `}</style>
      <div className="flex items-center gap-2">
        <TicketPercent className="h-4 w-4 text-gold" />
        <h2 className="font-serif text-xl">Coupons</h2>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : coupons.length === 0 ? (
        <p className="text-sm text-muted-foreground">No coupons yet — create one below.</p>
      ) : (
        <ul className="space-y-2">
          {coupons.map((c) => (
            <li key={c.id} className="rounded-sm border border-border/60 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-bold text-gold">{c.code}</span>
                <div className="flex items-center gap-2">
                  <span data-tip={c.active ? "Deactivate this coupon" : "Activate this coupon"}>
                    <Switch checked={c.active} onCheckedChange={(v) => toggle(c.id, v)} />
                  </span>
                  <button
                    onClick={() => remove(c.id, c.code)}
                    data-tip="Delete this coupon"
                    aria-label={`Delete coupon ${c.code}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {c.kind === "percent" ? `${c.value}% off` : `${formatKES(c.value)} off`}
                {c.min_subtotal_kes > 0 ? ` · min order ${formatKES(c.min_subtotal_kes)}` : ""}
                {` · ${c.used_count}${c.usage_limit ? `/${c.usage_limit}` : ""} used`}
                {c.expires_at
                  ? ` · expires ${new Date(c.expires_at).toLocaleDateString("en-KE")}`
                  : ""}
                {!c.active ? " · inactive" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addCoupon} className="space-y-3 border-t border-border/60 pt-4">
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            maxLength={30}
            data-tip="The code shoppers type at checkout"
            className="input flex-1 font-mono uppercase"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as "percent" | "fixed")}
            data-tip="Percentage off, or a fixed KES amount off"
            className="input w-24"
          >
            <option value="percent">% off</option>
            <option value="fixed">KES off</option>
          </select>
          <input
            type="number"
            min={1}
            value={value}
            onChange={(e) => setValue(e.target.value ? Number(e.target.value) : "")}
            placeholder="Value"
            data-tip={kind === "percent" ? "Percentage off (1–100)" : "Amount off in KES"}
            className="input w-24"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            value={minSubtotal}
            onChange={(e) => setMinSubtotal(e.target.value ? Number(e.target.value) : "")}
            placeholder="Min order KES (optional)"
            data-tip="The code only works once the order reaches this amount"
            className="input flex-1"
          />
          <input
            type="number"
            min={1}
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value ? Number(e.target.value) : "")}
            placeholder="Usage limit (optional)"
            data-tip="Total number of times this code can be used"
            className="input flex-1"
          />
        </div>
        <label className="block text-xs text-muted-foreground">
          Expiry date (optional)
          <input
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            data-tip="The coupon stops working after this date"
            className="input mt-1"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          data-tip="Create this coupon"
          className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-gold px-4 py-3 text-xs uppercase tracking-[0.25em] text-gold-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add coupon
        </button>
      </form>
    </div>
  );
}

export function DeliveryZoneManager() {
  const qc = useQueryClient();
  const { data: zones = [], isLoading } = useQuery(deliveryZonesQuery(true));
  const [name, setName] = useState("");
  const [fee, setFee] = useState<number | "">("");
  const [eta, setEta] = useState("");
  const [busy, setBusy] = useState(false);

  async function addZone(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || typeof fee !== "number" || fee < 0) {
      toast.error("Enter a zone name and a fee (0 for free).");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("delivery_zones").insert({
      name: name.trim(),
      fee_kes: fee,
      eta: eta.trim() || null,
      sort_order: (zones[zones.length - 1]?.sort_order ?? 0) + 1,
    });
    setBusy(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("duplicate")
          ? "A zone with that name already exists."
          : error.message,
      );
      return;
    }
    toast.success("Zone added.");
    setName("");
    setFee("");
    setEta("");
    qc.invalidateQueries({ queryKey: ["delivery-zones"] });
  }

  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from("delivery_zones").update({ active }).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["delivery-zones"] });
  }

  async function setZoneFee(id: string, feeKes: number) {
    const next = Math.max(0, Math.floor(feeKes));
    if (Number.isNaN(next)) return;
    const { error } = await supabase
      .from("delivery_zones")
      .update({ fee_kes: next })
      .eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["delivery-zones"] });
  }

  async function remove(id: string, zoneName: string) {
    if (!confirm(`Delete zone "${zoneName}"?`)) return;
    const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Zone deleted.");
      qc.invalidateQueries({ queryKey: ["delivery-zones"] });
    }
  }

  return (
    <div className="h-fit space-y-4 rounded-sm border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4 text-gold" />
        <h2 className="font-serif text-xl">Delivery zones</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Shoppers pick a zone at checkout and the fee is added to their total.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : zones.length === 0 ? (
        <p className="text-sm text-muted-foreground">No zones yet — add one below.</p>
      ) : (
        <ul className="space-y-2">
          {zones.map((z) => (
            <li key={z.id} className="rounded-sm border border-border/60 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {z.name}
                    {!z.active && (
                      <span className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                        hidden
                      </span>
                    )}
                  </p>
                  {z.eta && <p className="text-[11px] text-muted-foreground">{z.eta}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                    KES
                    <input
                      type="number"
                      min={0}
                      defaultValue={z.fee_kes}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isNaN(v) && v !== z.fee_kes) setZoneFee(z.id, v);
                      }}
                      data-tip="Delivery fee for this zone — edit and click away to save"
                      className="w-20 rounded-md border border-border bg-input px-2 py-0.5 text-xs text-foreground"
                    />
                  </label>
                  <span data-tip={z.active ? "Hide this zone from checkout" : "Show this zone at checkout"}>
                    <Switch checked={z.active} onCheckedChange={(v) => toggle(z.id, v)} />
                  </span>
                  <button
                    onClick={() => remove(z.id, z.name)}
                    data-tip="Delete this zone"
                    aria-label={`Delete zone ${z.name}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addZone} className="space-y-3 border-t border-border/60 pt-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Zone name — e.g. Eldoret"
          maxLength={60}
          data-tip="The area name shoppers will see"
          className="input"
        />
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            value={fee}
            onChange={(e) => setFee(e.target.value ? Number(e.target.value) : "")}
            placeholder="Fee (KES)"
            data-tip="Delivery fee added to the order total — 0 means free"
            className="input w-32"
          />
          <input
            value={eta}
            onChange={(e) => setEta(e.target.value)}
            placeholder="Estimate — e.g. 1–2 days"
            maxLength={40}
            data-tip="Delivery estimate shown to shoppers (optional)"
            className="input flex-1"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          data-tip="Add this delivery zone"
          className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-gold px-4 py-3 text-xs uppercase tracking-[0.25em] text-gold-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add zone
        </button>
      </form>
    </div>
  );
}
