import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { FloatingWhatsapp } from "@/components/floating-whatsapp";
import { StaggerGrid, StaggerItem } from "@/components/reveal";
import { categoriesQuery, productsQuery, type Product } from "@/lib/queries";
import { cn } from "@/lib/utils";

const shopSearchSchema = z.object({
  category: fallback(z.string(), "").default(""),
  q: fallback(z.string(), "").default(""),
  sort: fallback(z.string(), "newest").default("newest"),
  min: fallback(z.number(), 0).default(0),
  max: fallback(z.number(), 0).default(0),
  gender: fallback(z.string(), "").default(""),
  stock: fallback(z.string(), "").default(""),
});

type ShopSearch = z.infer<typeof shopSearchSchema>;

export const Route = createFileRoute("/shop")({
  validateSearch: zodValidator(shopSearchSchema),
  head: () => ({
    meta: [
      { title: "Shop All — Phenomenal Products KE" },
      {
        name: "description",
        content: "Browse all watches, bracelets and gift sets. Order via WhatsApp with nationwide delivery.",
      },
      { property: "og:title", content: "Shop All — Phenomenal Products KE" },
      { property: "og:description", content: "Watches, bracelets and gift sets — best prices in Kenya." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(categoriesQuery);
    context.queryClient.prefetchQuery(productsQuery());
  },
  component: ShopPage,
});

function ShopPage() {
  const { category, q, sort, min, max, stock, gender } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: allProducts = [], isLoading } = useQuery(
    productsQuery(category ? { categorySlug: category } : {}),
  );

  const products = useMemo(() => {
    let list: Product[] = [...allProducts] as Product[];
    if (sort === "newest" || !sort) {
      // If default/newest, we shuffle it instead of sorting by date
      list.sort(() => Math.random() - 0.5);
    }

    if (q) {
      const t = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(t) ||
          (p.description ?? "").toLowerCase().includes(t),
      );
    }
    if (min > 0) list = list.filter((p) => p.price_kes >= min);
    if (max > 0) list = list.filter((p) => p.price_kes <= max);
    if (gender) list = list.filter((p) => p.gender === gender || p.gender === "unisex");
    if (stock === "in") list = list.filter((p) => p.in_stock);
    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price_kes - b.price_kes);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price_kes - a.price_kes);
        break;
      case "name":
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }
    return list;
  }, [allProducts, q, min, max, stock, sort]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 pt-6">
        <div className="rounded-3xl border border-border/50 bg-card p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-brand">
            {q ? "Search results" : "All products"}
          </p>
          <h1 className="mt-1 font-serif text-3xl md:text-4xl">
            {q ? `Results for "${q}"` : "Shop everything"}
          </h1>

          <div className="mt-4 flex flex-wrap gap-2">
            <FilterChip label="All" active={!category} to={{ category: "" }} />
            {categories.map((c) => (
              <FilterChip
                key={c.id}
                label={c.name}
                active={category === c.slug}
                to={{ category: c.slug }}
              />
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Gender
              </label>
              <select
                data-tip="Filter by intended recipient"
                value={gender}
                onChange={(e) =>
                  navigate({ search: (prev: ShopSearch) => ({ ...prev, gender: e.target.value }) })
                }
                className="w-full rounded-full border border-border/50 bg-[var(--input)] px-4 py-2 text-sm outline-none focus:border-brand"
              >
                <option value="">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="unisex">Unisex</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Sort
              </label>
              <select
                data-tip="Change how products are ordered"
                value={sort}
                onChange={(e) =>
                  navigate({ search: (prev: ShopSearch) => ({ ...prev, sort: e.target.value }) })
                }
                className="w-full rounded-full border border-border/50 bg-[var(--input)] px-4 py-2 text-sm outline-none focus:border-brand"
              >
                <option value="newest">Newest</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="name">Name (A–Z)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Min (KSh)
              </label>
              <input
                type="number"
                min={0}
                data-tip="Only show products above this price"
                value={min || ""}
                onChange={(e) =>
                  navigate({
                    search: (prev: ShopSearch) => ({ ...prev, min: Number(e.target.value) || 0 }),
                  })
                }
                className="w-full rounded-full border border-border/50 bg-[var(--input)] px-4 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Max (KSh)
              </label>
              <input
                type="number"
                min={0}
                data-tip="Only show products below this price"
                value={max || ""}
                onChange={(e) =>
                  navigate({
                    search: (prev: ShopSearch) => ({ ...prev, max: Number(e.target.value) || 0 }),
                  })
                }
                className="w-full rounded-full border border-border/50 bg-[var(--input)] px-4 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
            <label className="flex items-end gap-2 text-sm">
              <input
                type="checkbox"
                data-tip="Hide items that are sold out"
                checked={stock === "in"}
                onChange={(e) =>
                  navigate({
                    search: (prev: ShopSearch) => ({ ...prev, stock: e.target.checked ? "in" : "" }),
                  })
                }
              />
              <span className="pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                In stock only
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-card" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/50 bg-card p-12 text-center">
            <p className="font-serif text-xl">Nothing matches your search.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try clearing filters or a different keyword.
            </p>
          </div>
        ) : (
          <StaggerGrid className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
            {products.map((p) => (
              <StaggerItem key={p.id}>
                <ProductCard product={p} />
              </StaggerItem>
            ))}
          </StaggerGrid>
        )}
      </section>

      <SiteFooter />
      <FloatingWhatsapp />
    </div>
  );
}

function FilterChip({
  label,
  active,
  to,
}: {
  label: string;
  active: boolean;
  to: { category: string };
}) {
  return (
    <Link
      to="/shop"
      search={(prev: Partial<ShopSearch>) => ({ ...prev, ...to })}
      data-tip={active ? `Showing ${label}` : `Show only ${label}`}
      className={cn(
        "rounded-full border px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest transition",
        active
          ? "border-brand bg-brand text-brand-foreground"
          : "border-border/50 bg-card text-muted-foreground hover:border-brand hover:text-brand",
      )}
    >
      {label}
    </Link>
  );
}
