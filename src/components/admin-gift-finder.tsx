import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Wallet } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { giftFinderBudgetsQuery } from "@/lib/queries";
import { formatKES } from "@/lib/site";

export function GiftFinderBudgetManager() {
  const qc = useQueryClient();
  const { data: budgets = [], isLoading } = useQuery(giftFinderBudgetsQuery);
  const [label, setLabel] = useState("");
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function addBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || typeof minPrice !== "number") {
      toast.error("Enter a label and a minimum price.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("gift_finder_budgets").insert({
      label: label.trim(),
      min_price_kes: minPrice,
      max_price_kes: typeof maxPrice === "number" ? maxPrice : null,
      description: description.trim() || null,
      sort_order: (budgets[budgets.length - 1]?.sort_order ?? 0) + 1,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Budget range added.");
    setLabel("");
    setMinPrice("");
    setMaxPrice("");
    setDescription("");
    qc.invalidateQueries({ queryKey: ["gift-finder-budgets"] });
  }

  async function remove(id: string, budgetLabel: string) {
    if (!confirm(`Delete budget range "${budgetLabel}"?`)) return;
    const { error } = await supabase.from("gift_finder_budgets").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Budget range deleted.");
      qc.invalidateQueries({ queryKey: ["gift-finder-budgets"] });
    }
  }

  return (
    <div className="h-fit space-y-4 rounded-sm border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-gold" />
        <h2 className="font-serif text-xl">Gift Finder Budgets</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        These options appear in the "What is your budget?" step of the Gift Finder.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : budgets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No budget ranges yet — add one below.</p>
      ) : (
        <ul className="space-y-2">
          {budgets.map((b) => (
            <li key={b.id} className="rounded-sm border border-border/60 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{b.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatKES(b.min_price_kes)} 
                    {b.max_price_kes ? ` – ${formatKES(b.max_price_kes)}` : " and above"}
                  </p>
                </div>
                <button
                  onClick={() => remove(b.id, b.label)}
                  data-tip="Delete this budget range"
                  aria-label={`Delete budget ${b.label}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addBudget} className="space-y-3 border-t border-border/60 pt-4">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label — e.g. Under KES 5,000"
          maxLength={60}
          className="input"
        />
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : "")}
            placeholder="Min (KES)"
            className="input w-1/2"
          />
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : "")}
            placeholder="Max (KES, empty for no limit)"
            className="input w-1/2"
          />
        </div>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          maxLength={100}
          className="input"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-gold px-4 py-3 text-xs uppercase tracking-[0.25em] text-gold-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add Budget Range
        </button>
      </form>
    </div>
  );
}
