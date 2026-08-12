import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, SITE } from "@/lib/site";
import type { CartItem } from "@/hooks/use-cart";

export const checkoutSchema = z.object({
  customer_name: z
    .string()
    .trim()
    .min(2, { message: "Please enter your full name" })
    .max(100, { message: "Name is too long" }),
  phone: z
    .string()
    .trim()
    .min(7, { message: "Enter a valid phone number" })
    .max(20, { message: "Phone number is too long" })
    .regex(/^[0-9+\s-]+$/, { message: "Phone can only contain digits, +, spaces and dashes" }),
  delivery_area: z
    .string()
    .trim()
    .min(2, { message: "Tell us where to deliver" })
    .max(120, { message: "Delivery area is too long" }),
  notes: z.string().trim().max(1000, { message: "Notes are too long" }).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export type Order = {
  id: string;
  reference: string;
  customer_name: string;
  phone: string;
  delivery_area: string;
  notes: string | null;
  total_kes: number;
  subtotal_kes: number;
  discount_kes: number;
  delivery_fee_kes: number;
  coupon_code: string | null;
  delivery_zone: string | null;
  status: string;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price_kes: number;
  qty: number;
  variant_id: string | null;
  variant_label: string | null;
};

export const ORDER_STATUSES = ["new", "contacted", "paid", "delivered", "cancelled"] as const;

export type PlaceOrderOptions = {
  zoneId?: string | null;
  couponCode?: string | null;
};

export type PlacedOrder = {
  reference: string;
  total_kes: number;
  subtotal_kes: number;
  discount_kes: number;
  delivery_fee_kes: number;
};

export async function placeOrder(
  input: CheckoutInput,
  items: CartItem[],
  opts: PlaceOrderOptions = {},
): Promise<PlacedOrder> {
  const parsed = checkoutSchema.parse(input);
  if (items.length === 0) throw new Error("Your bag is empty.");

  const { data, error } = await supabase.rpc("place_order", {
    p_customer_name: parsed.customer_name,
    p_phone: parsed.phone,
    p_delivery_area: parsed.delivery_area,
    p_notes: parsed.notes ?? "",
    p_items: items.map((i) => ({
      product_id: i.id,
      qty: i.qty,
      variant_id: i.variant_id ?? null,
    })),
    p_delivery_zone_id: opts.zoneId ?? undefined,
    p_coupon_code: opts.couponCode ?? undefined,
  });
  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Could not place your order. Please try again.");
  return row as PlacedOrder;
}

export type OrderBreakdown = {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  zoneName?: string | null;
  couponCode?: string | null;
};

export function whatsappOrderConfirmation(
  reference: string,
  input: CheckoutInput,
  items: CartItem[],
  breakdown?: OrderBreakdown,
) {
  const lines = items
    .map(
      (i) =>
        `• ${i.qty} × ${i.name}${i.variant_label ? ` (${i.variant_label})` : ""} — ${formatKES(
          i.price_kes * i.qty,
        )}`,
    )
    .join("\n");
  const itemsTotal = items.reduce((s, i) => s + i.price_kes * i.qty, 0);
  const message = [
    `Hello Phenomenal Products KE, I've placed order #${reference}.`,
    "",
    lines,
    "",
    `Subtotal: ${formatKES(breakdown?.subtotal ?? itemsTotal)}`,
    breakdown && breakdown.discount > 0
      ? `Discount${breakdown.couponCode ? ` (${breakdown.couponCode})` : ""}: −${formatKES(breakdown.discount)}`
      : "",
    breakdown
      ? `Delivery fee${breakdown.zoneName ? ` (${breakdown.zoneName})` : ""}: ${formatKES(breakdown.deliveryFee)}`
      : "",
    `Total: ${formatKES(breakdown?.total ?? itemsTotal)}`,
    `Name: ${input.customer_name}`,
    `Phone: ${input.phone}`,
    `Delivery: ${input.delivery_area}${breakdown?.zoneName ? ` — ${breakdown.zoneName}` : ""}`,
    input.notes ? `Notes: ${input.notes}` : "",
    "",
    "Please confirm payment & delivery details.",
  ]
    .filter(Boolean)
    .join("\n");
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export const ordersQuery = queryOptions({
  queryKey: ["orders"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as (Order & { order_items: OrderItem[] })[];
  },
});
