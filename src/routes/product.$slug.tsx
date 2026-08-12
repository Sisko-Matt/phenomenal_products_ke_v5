import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductImage } from "@/components/product-image";
import { ProductMediaGallery } from "@/components/product-media";
import { WhatsappOrderButton } from "@/components/whatsapp-button";
import { ReviewsSection } from "@/components/reviews";
import { ShareButtons } from "@/components/share-buttons";
import { ProductSnapshot } from "@/components/product-snapshot";
import {
  productBySlugQuery,
  productReviewsQuery,
  productsQuery,
  productVariantsQuery,
  relatedProductsQuery,
} from "@/lib/queries";
import { formatKES } from "@/lib/site";
import { StarRating } from "@/components/star-rating";
import { useCart } from "@/hooks/use-cart";
import { pushRecentlyViewed, useRecentlyViewed } from "@/hooks/use-recently-viewed";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(productBySlugQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — Phenomenal Products KE` },
          {
            name: "description",
            content:
              loaderData.description?.slice(0, 155) ??
              `Order ${loaderData.name} via WhatsApp from Phenomenal Products KE.`,
          },
          { property: "og:title", content: `${loaderData.name} — Phenomenal Products KE` },
          {
            property: "og:description",
            content:
              loaderData.description?.slice(0, 155) ??
              `Order ${loaderData.name} via WhatsApp from Phenomenal Products KE.`,
          },
        ]
      : [{ title: "Product — Phenomenal Products KE" }, { name: "robots", content: "noindex" }],
    scripts: loaderData
      ? [
          {
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: loaderData.name,
              description:
                loaderData.description?.slice(0, 300) ??
                `${loaderData.name} — available at Phenomenal Products KE.`,
              brand: { "@type": "Brand", name: "Phenomenal Products KE" },
              offers: {
                "@type": "Offer",
                priceCurrency: "KES",
                price: loaderData.price_kes,
                availability: loaderData.in_stock
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
              },
            }),
          },
        ]
      : [],
  }),
  component: ProductPage,
  notFoundComponent: ProductNotFound,
  errorComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-serif text-3xl">Something went wrong</h1>
        <Link to="/shop" className="mt-6 inline-block text-sm text-gold">Back to shop</Link>
      </div>
    </div>
  ),
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: product } = useQuery(productBySlugQuery(slug));
  const { data: reviews = [] } = useQuery(productReviewsQuery(product?.id));
  const { data: related = [] } = useQuery(
    relatedProductsQuery(product?.id, product?.category_id),
  );
  const { data: variants = [] } = useQuery(productVariantsQuery(product?.id));
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState<string | null>(null);

  const selectedVariant = variants.find((v) => v.id === variantId) ?? null;

  useEffect(() => {
    if (variants.length > 0 && !variants.some((v) => v.id === variantId)) {
      const firstAvailable = variants.find((v) => v.stock_qty > 0) ?? variants[0];
      setVariantId(firstAvailable.id);
    }
  }, [variants, variantId]);

  useEffect(() => {
    if (product?.slug) pushRecentlyViewed(product.slug);
  }, [product?.slug]);

  if (!product) return null;

  const unitPrice = selectedVariant ? selectedVariant.price_kes : product.price_kes;
  const available = variants.length > 0 ? (selectedVariant?.stock_qty ?? 0) > 0 : product.in_stock;

  const avg =
    reviews.length === 0 ? 0 : reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  function addToCart() {
    if (!product) return;
    cart.add(
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price_kes: unitPrice,
        image_url: product.image_url,
        variant_id: selectedVariant?.id ?? null,
        variant_label: selectedVariant?.label ?? null,
      },
      qty,
    );
    toast.success(`Added ${qty} × ${product.name} to bag`);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-gold/10 blur-3xl animate-float"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 -left-20 h-72 w-72 rounded-full bg-gold/5 blur-3xl animate-float-alt"
        />

        <div className="relative mx-auto max-w-6xl px-4 py-12">
          <Link
            to="/shop"
            className="group inline-flex items-center gap-1 text-xs uppercase tracking-[0.25em] text-muted-foreground transition hover:text-gold"
          >
            <span className="transition-transform group-hover:-translate-x-1">←</span> Back to shop
          </Link>

          <div className="mt-8 grid gap-12 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <ProductMediaGallery
                mainImage={product.image_url}
                images={product.images ?? []}
                videoUrl={product.video_url}
                alt={product.name}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="flex flex-col justify-center"
            >
              <p className="text-xs uppercase tracking-[0.35em] text-gold">
                {available ? "In stock" : "Sold out"}
              </p>
              <h1 className="mt-3 font-serif text-4xl md:text-5xl">{product.name}</h1>

              {reviews.length > 0 && (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <StarRating value={avg} size={14} />
                  <span>
                    {avg.toFixed(1)} · {reviews.length}{" "}
                    {reviews.length === 1 ? "review" : "reviews"}
                  </span>
                </div>
              )}

              <p className="mt-4 text-2xl text-gold text-shimmer">{formatKES(unitPrice)}</p>

              {variants.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    Choose an option
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {variants.map((v) => {
                      const soldOut = v.stock_qty <= 0;
                      const active = v.id === variantId;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          disabled={soldOut}
                          onClick={() => setVariantId(v.id)}
                          data-tip={
                            soldOut
                              ? `${v.label} is sold out`
                              : `Select ${v.label} — ${formatKES(v.price_kes)}`
                          }
                          className={
                            "rounded-full border px-4 py-2 text-xs uppercase tracking-widest transition " +
                            (active
                              ? "border-gold bg-gold text-gold-foreground"
                              : "border-border text-muted-foreground hover:border-gold hover:text-gold") +
                            (soldOut ? " cursor-not-allowed line-through opacity-40" : "")
                          }
                        >
                          {v.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {product.description && (
                <p className="mt-8 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              )}

              {product.table_description && product.table_description.length > 0 && (
                <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card/50">
                  <table className="w-full text-left text-sm">
                    <tbody className="divide-y divide-border">
                      {product.table_description.map((item, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground w-1/3">
                            {item.key}
                          </td>
                          <td className="px-4 py-3 text-foreground font-medium">
                            {item.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {available && (
                <div className="mt-8 flex items-center gap-3">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    Quantity
                  </span>
                  <div className="inline-flex items-center rounded-sm border border-border">
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="inline-flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-gold"
                      aria-label="Decrease quantity"
                      data-tip="Reduce quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center text-sm">{qty}</span>
                    <button
                      onClick={() => setQty((q) => q + 1)}
                      className="inline-flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-gold"
                      aria-label="Increase quantity"
                      data-tip="Add one more"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-3">
                {available && (
                  <button
                    onClick={addToCart}
                    data-tip-side="top"
                    data-tip="Save this item to your bag"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-gold px-6 py-3 text-sm uppercase tracking-[0.2em] text-gold transition hover:bg-gold hover:text-gold-foreground"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Add to bag
                  </button>
                )}
                <WhatsappOrderButton
                  productName={
                    selectedVariant ? `${product.name} (${selectedVariant.label})` : product.name
                  }
                  price={unitPrice * qty}
                  disabled={!available}
                />
                <div className="flex flex-col gap-3 pt-2">
                  <ProductSnapshot product={product} />
                  <ShareButtons title={product.name} />
                </div>
                <p className="text-center text-xs tracking-widest text-muted-foreground">
                  Orders confirmed and shipped once payment is received via M-Pesa.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {product.id && <ReviewsSection productId={product.id} />}

      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <p className="text-xs uppercase tracking-[0.35em] text-gold">You may also like</p>
          <h2 className="mt-2 font-serif text-3xl md:text-4xl">Related pieces</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <Link
                key={p.id}
                to="/product/$slug"
                params={{ slug: p.slug }}
                className="group block"
              >
                <div className="aspect-square overflow-hidden rounded-sm border border-border bg-card hover-lift">
                  <ProductImage
                    path={p.image_url}
                    alt={p.name}
                    className="h-full w-full transition duration-700 group-hover:scale-110"
                  />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <h3 className="truncate font-serif text-base group-hover:text-gold">
                    {p.name}
                  </h3>
                  <p className="text-sm text-gold">{formatKES(p.price_kes)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <RecentlyViewed currentSlug={product.slug} />

      <SiteFooter />
    </div>
  );
}

function RecentlyViewed({ currentSlug }: { currentSlug: string }) {
  const slugs = useRecentlyViewed().filter((s) => s !== currentSlug);
  const { data: all = [] } = useQuery(productsQuery());
  if (slugs.length === 0) return null;
  const items = slugs
    .map((s) => (all as { slug: string }[]).find((p) => p.slug === s))
    .filter(Boolean) as (typeof all)[number][];
  if (items.length === 0) return null;

  return (
    <section className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <p className="text-xs uppercase tracking-[0.35em] text-gold">Recently viewed</p>
        <h2 className="mt-2 font-serif text-2xl md:text-3xl">Pieces you've explored</h2>
        <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
          {items.map((p) => (
            <Link
              key={p.id}
              to="/product/$slug"
              params={{ slug: p.slug }}
              className="group block w-40 flex-shrink-0"
            >
              <div className="aspect-square overflow-hidden rounded-sm border border-border bg-card">
                <ProductImage
                  path={p.image_url}
                  alt={p.name}
                  className="h-full w-full transition duration-500 group-hover:scale-110"
                />
              </div>
              <p className="mt-2 truncate font-serif text-sm group-hover:text-gold">{p.name}</p>
              <p className="text-xs text-gold">{formatKES(p.price_kes)}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductNotFound() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-gold">404</p>
        <h1 className="mt-3 font-serif text-4xl">Product not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">This piece may have been removed or renamed.</p>
        <Link
          to="/shop"
          className="mt-8 inline-block rounded-sm bg-gold px-6 py-3 text-xs uppercase tracking-[0.2em] text-gold-foreground"
        >
          Browse shop
        </Link>
      </div>
      <SiteFooter />
    </div>
  );
}
