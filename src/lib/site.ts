export const SITE = {
  name: "Phenomenal Products KE",
  tagline: "Expensive Quality at Affordable Price",
  whatsappNumber: "254746793923",
  email: "phenomenalproductske@gmail.com",
  instagram: "https://instagram.com/phenomenal_products_ke",
  tiktok: "https://tiktok.com/@phenomenal_products_ke",
} as const;

export function formatKES(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE")}`;
}

export function whatsappOrderLink(productName: string, price: number, qty = 1): string {
  const line = qty > 1 ? `${qty} × ${productName}` : productName;
  const total = price * qty;
  const message = `Hello Phenomenal Products KE, I'd like to order:\n\n• ${line}\n• Total: ${formatKES(total)}\n\nPlease share payment & delivery details.`;
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function whatsappCartLink(
  items: { name: string; qty: number; price_kes: number }[],
): string {
  const lines = items
    .map((i) => `• ${i.qty} × ${i.name} — ${formatKES(i.price_kes * i.qty)}`)
    .join("\n");
  const total = items.reduce((s, i) => s + i.price_kes * i.qty, 0);
  const message = `Hello Phenomenal Products KE, I'd like to order:\n\n${lines}\n\nTotal: ${formatKES(total)}\n\nPlease share payment & delivery details.`;
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function whatsappContactLink(): string {
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent("Hello Phenomenal Products KE!")}`;
}
