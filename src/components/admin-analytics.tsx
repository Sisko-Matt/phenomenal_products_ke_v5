import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Banknote, Download, Package, ShoppingBag, TrendingUp, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { ordersQuery, ORDER_STATUSES } from "@/lib/orders";
import { downloadCsv } from "@/lib/export-csv";
import { formatKES } from "@/lib/site";

export function AdminAnalytics() {
  const { data: orders = [], isLoading } = useQuery(ordersQuery);

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== "cancelled");
    const confirmed = orders.filter((o) => o.status === "paid" || o.status === "delivered");
    const revenue = confirmed.reduce((s, o) => s + o.total_kes, 0);
    const itemsSold = active.reduce((s, o) => s + o.order_items.reduce((a, i) => a + i.qty, 0), 0);
    const avgOrder = confirmed.length > 0 ? Math.round(revenue / confirmed.length) : 0;
    const newCount = orders.filter((o) => o.status === "new").length;

    // Revenue per day for the last 14 days (cancelled orders excluded).
    const days: { key: string; day: string; revenue: number; orders: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push({
        key: d.toDateString(),
        day: d.toLocaleDateString("en-KE", { day: "numeric", month: "short" }),
        revenue: 0,
        orders: 0,
      });
    }
    for (const o of active) {
      const slot = days.find((d) => d.key === new Date(o.created_at).toDateString());
      if (slot) {
        slot.revenue += o.total_kes;
        slot.orders += 1;
      }
    }

    // Best sellers by quantity.
    const byProduct = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of active) {
      for (const it of o.order_items) {
        const cur = byProduct.get(it.product_name) ?? {
          name: it.product_name,
          qty: 0,
          revenue: 0,
        };
        cur.qty += it.qty;
        cur.revenue += it.qty * it.unit_price_kes;
        byProduct.set(it.product_name, cur);
      }
    }
    const top = [...byProduct.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
    const maxQty = top[0]?.qty ?? 1;

    const byStatus = ORDER_STATUSES.map((s) => ({
      status: s,
      count: orders.filter((o) => o.status === s).length,
    }));

    return {
      revenue,
      itemsSold,
      avgOrder,
      newCount,
      days,
      top,
      maxQty,
      byStatus,
      totalOrders: orders.length,
    };
  }, [orders]);

  function exportSummary() {
    const active = orders.filter((o) => o.status !== "cancelled");

    const byDay = new Map<string, { orders: number; revenue: number }>();
    const byProduct = new Map<string, { qty: number; revenue: number }>();
    for (const o of active) {
      const day = o.created_at.slice(0, 10);
      const d = byDay.get(day) ?? { orders: 0, revenue: 0 };
      d.orders += 1;
      d.revenue += o.total_kes;
      byDay.set(day, d);
      for (const it of o.order_items) {
        const p = byProduct.get(it.product_name) ?? { qty: 0, revenue: 0 };
        p.qty += it.qty;
        p.revenue += it.qty * it.unit_price_kes;
        byProduct.set(it.product_name, p);
      }
    }

    const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
    const products = [...byProduct.entries()].sort((a, b) => b[1].qty - a[1].qty);

    downloadCsv(`sales-summary-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Daily sales (cancelled orders excluded)"],
      ["Date", "Orders", "Revenue (KES)"],
      ...days.map(([day, d]) => [day, d.orders, d.revenue]),
      [],
      ["Top products"],
      ["Product", "Units sold", "Revenue (KES)"],
      ...products.map(([name, p]) => [name, p.qty, p.revenue]),
    ]);
    toast.success("Sales summary exported.");
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading analytics…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Banknote}
          label="Confirmed revenue"
          value={formatKES(stats.revenue)}
          hint="Paid + delivered orders"
        />
        <StatCard
          icon={ShoppingBag}
          label="Orders"
          value={String(stats.totalOrders)}
          hint={`${stats.newCount} awaiting action`}
        />
        <StatCard
          icon={Package}
          label="Items sold"
          value={String(stats.itemsSold)}
          hint="Excluding cancelled orders"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg. order"
          value={formatKES(stats.avgOrder)}
          hint="Per confirmed order"
        />
      </div>

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl">Revenue — last 14 days</h2>
            <p className="mt-1 text-xs text-muted-foreground">All orders except cancelled.</p>
          </div>
          <button
            onClick={exportSummary}
            data-tip-side="left"
            data-tip="Download daily sales and top products as CSV"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-brand"
          >
            <Download className="h-3.5 w-3.5" /> Export summary
          </button>
        </div>
        <div className="mt-4 h-56 text-brand">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.days} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                interval={1}
                tick={{ fontSize: 10, fill: "currentColor" }}
                className="text-muted-foreground"
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "var(--foreground)",
                }}
                formatter={(value) => [formatKES(Number(value)), "Revenue"]}
              />
              <Bar dataKey="revenue" fill="currentColor" radius={[6, 6, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl">Top products</h2>
          {stats.top.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No sales yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {stats.top.map((p) => (
                <li key={p.name}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {p.qty} sold · {formatKES(p.revenue)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{
                        width: `${Math.max(6, Math.round((p.qty / stats.maxQty) * 100))}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="h-fit rounded-3xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl">Orders by status</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {stats.byStatus.map((s) => (
              <span
                key={s.status}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs capitalize"
              >
                <span className="font-mono font-bold text-brand">{s.count}</span>
                {s.status}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-gold" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="mt-3 font-mono text-xl font-bold md:text-2xl">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
