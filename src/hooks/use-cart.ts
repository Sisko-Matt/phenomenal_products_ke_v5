import { useEffect, useState, useCallback } from "react";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  price_kes: number;
  image_url: string | null;
  qty: number;
  variant_id?: string | null;
  variant_label?: string | null;
};

const KEY = "ppke.cart.v1";

/** Unique line key: same product with different variants are separate lines. */
export function cartKey(item: { id: string; variant_id?: string | null }) {
  return `${item.id}::${item.variant_id ?? ""}`;
}

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("ppke.cart.change"));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(read());
    const onChange = () => setItems(read());
    window.addEventListener("ppke.cart.change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("ppke.cart.change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const add = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    const cur = read();
    const idx = cur.findIndex((i) => cartKey(i) === cartKey(item));
    if (idx >= 0) cur[idx].qty += qty;
    else cur.push({ ...item, qty });
    write(cur);
  }, []);

  const remove = useCallback((key: string) => {
    write(read().filter((i) => cartKey(i) !== key));
  }, []);

  const setQty = useCallback(
    (key: string, qty: number) => {
      if (qty <= 0) return remove(key);
      const cur = read().map((i) => (cartKey(i) === key ? { ...i, qty } : i));
      write(cur);
    },
    [remove],
  );

  const clear = useCallback(() => write([]), []);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.qty * i.price_kes, 0);

  return { items, add, remove, setQty, clear, count, total };
}
