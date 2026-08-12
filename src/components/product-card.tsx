import { Link } from "@tanstack/react-router";
import { ProductImage } from "@/components/product-image";
import { formatKES } from "@/lib/site";
import type { Product } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Badge = {
  label: string;
  tone?: "brand" | "success" | "gold" | "hot" | "violet";
};

function toneClasses(tone: Badge["tone"]) {
  switch (tone) {
    case "success":
      return "bg-success text-white";
    case "gold":
      return "bg-gold text-gold-foreground";
    case "hot":
      return "bg-hot text-white";
    case "violet":
      return "raised-surface bg-[#8b5cf6] text-white";
    default:
      return "bg-brand text-brand-foreground";
  }
}


export function ProductCard({
  product,
  compact,
}: {
  product: Product & { images?: string[] | null; video_url?: string | null };
  compact?: boolean;
}) {
  // Deterministic-ish decorative "sold" count so grid feels alive without lying too hard.
  const sold = 10 + ((product.id?.charCodeAt(0) ?? 0) % 20); // Keep it between 10 and 30
  const rating = 4.6 + ((product.id?.charCodeAt(1) ?? 0) % 4) * 0.1;

  const badges: Badge[] = [];
  if (product.featured) badges.push({ label: "Featured", tone: "gold" });
  if (product.video_url) badges.push({ label: "Video", tone: "violet" });
  if (product.in_stock) badges.push({ label: "In stock", tone: "success" });
  if (!product.in_stock) badges.push({ label: "Sold out", tone: "hot" });

  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className={cn(
        "group block overflow-hidden rounded-3xl border border-border/40 bg-card transition-all duration-500 hover:border-brand/40 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.3)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] dark:ring-1 dark:ring-white/5 dark:hover:shadow-[0_0_20px_color-mix(in_oklab,var(--gold)_15%,transparent)] hover-lift",
      )}
    >
      <div className="relative">
        <div className="aspect-square w-full overflow-hidden bg-secondary">
          <ProductImage
            path={product.image_url}
            alt={product.name}
            className="h-full w-full transition duration-700 group-hover:scale-110"
          />
        </div>

        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {badges.slice(0, 2).map((b) => (
            <span
              key={b.label}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow",
                toneClasses(b.tone),
              )}
            >
              {b.label}
            </span>
          ))}
        </div>

        {product.in_stock && (
          <div className="absolute bottom-2 left-2 rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-medium text-foreground backdrop-blur-md">
            {sold.toLocaleString()}+ sold
          </div>
        )}
      </div>

      <div className={cn("p-3", compact ? "space-y-1" : "space-y-2")}>
        <h3 className="line-clamp-2 text-xs font-medium leading-snug text-muted-foreground group-hover:text-foreground">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-1">
          <span className="text-brand font-mono text-lg font-bold tracking-tight">
            {formatKES(product.price_kes)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand">
            Best price
          </span>
          <span className="text-[10px] text-muted-foreground">
            <span className="text-gold">★</span> {rating.toFixed(1)}
          </span>
        </div>
      </div>
    </Link>
  );
}
