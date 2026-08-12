import { useEffect, useState } from "react";
import { ShoppingBag, X, Trash2, Minus, Plus, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { cartKey, useCart } from "@/hooks/use-cart";
import { formatKES } from "@/lib/site";
import { useQuery } from "@tanstack/react-query";
import { signedMediaUrlQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

function CartThumb({ path, alt }: { path: string | null; alt: string }) {
  const { data: url } = useQuery(signedMediaUrlQuery("product-images", path));
  if (!path || !url) {
    return <div className="h-14 w-14 rounded-sm bg-muted" />;
  }
  return <img src={url} alt={alt} className="h-14 w-14 rounded-sm object-cover" />;
}

export function CartButton() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open cart"
        data-tip-side="left"
        data-tip={count > 0 ? `View your bag (${count} item${count === 1 ? "" : "s"})` : "Your shopping bag is empty"}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border text-muted-foreground transition hover:border-gold hover:text-gold"
      >
        <ShoppingBag className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-gold-foreground">
            {count}
          </span>
        )}
      </button>
      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, setQty, remove, total, clear } = useCart();

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 260 }}
            className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-gold">Your bag</p>
                <h2 className="font-serif text-xl">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </h2>
              </div>
              <button onClick={onClose} data-tip-side="left" data-tip="Close the bag" className="text-muted-foreground hover:text-gold">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingBag className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-4 font-serif text-lg">Your bag is empty</p>
                  <p className="mt-1 text-sm text-muted-foreground">Add pieces you love to send an order.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {items.map((i) => (
                    <li key={cartKey(i)} className="flex gap-3 rounded-sm border border-border/60 p-3">
                      <CartThumb path={i.image_url} alt={i.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-serif text-base">{i.name}</p>
                        {i.variant_label && (
                          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                            {i.variant_label}
                          </p>
                        )}
                        <p className="text-sm text-gold">{formatKES(i.price_kes)}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => setQty(cartKey(i), i.qty - 1)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border hover:border-gold hover:text-gold"
                            aria-label="Decrease"
                            data-tip="Reduce quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm">{i.qty}</span>
                          <button
                            onClick={() => setQty(cartKey(i), i.qty + 1)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border hover:border-gold hover:text-gold"
                            aria-label="Increase"
                            data-tip="Add one more"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => remove(cartKey(i))}
                            className="ml-auto text-muted-foreground hover:text-destructive"
                            aria-label="Remove item"
                            data-tip-side="left"
                            data-tip="Remove this item from your bag"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <footer className={cn("border-t border-border/60 px-5 py-4", items.length === 0 && "hidden")}>
              <div className="flex items-center justify-between text-sm">
                <span className="uppercase tracking-widest text-muted-foreground">Total</span>
                <span className="font-serif text-xl text-gold">{formatKES(total)}</span>
              </div>
              <Link
                to="/checkout"
                onClick={onClose}
                data-tip-side="top"
                data-tip="Review your order and send it to us"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-xs font-bold uppercase tracking-[0.2em]"
              >
                Checkout <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={clear}
                data-tip-side="top"
                data-tip="Remove everything from your bag"
                className="mt-2 w-full text-center text-xs uppercase tracking-widest text-muted-foreground hover:text-destructive"
              >
                Clear bag
              </button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
