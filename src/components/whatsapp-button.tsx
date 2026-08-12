import { MessageCircle } from "lucide-react";
import { whatsappOrderLink } from "@/lib/site";

export function WhatsappOrderButton({
  productName,
  price,
  disabled,
}: {
  productName: string;
  price: number;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <button
        disabled
        data-tip="This item is currently out of stock"
        className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-border bg-muted px-6 py-3 text-sm uppercase tracking-[0.2em] text-muted-foreground"
      >
        Sold out
      </button>
    );
  }
  return (
    <a
      href={whatsappOrderLink(productName, price)}
      target="_blank"
      rel="noopener noreferrer"
      data-tip-side="top"
      data-tip="Send this order to us on WhatsApp"
      className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-gold px-6 py-3 text-sm uppercase tracking-[0.2em] text-gold-foreground transition hover:opacity-90"
    >
      <MessageCircle className="h-4 w-4" />
      Order via WhatsApp
    </a>
  );
}
