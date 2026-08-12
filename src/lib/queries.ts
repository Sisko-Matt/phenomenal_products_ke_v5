import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  table_description: { key: string; value: string }[] | null;
  price_kes: number;
  category_id: string | null;
  image_url: string | null;
  images: string[];
  video_url: string | null;
  stock_qty: number;
  in_stock: boolean;
  featured: boolean;
  gender: "male" | "female" | "unisex";
  is_limited_offer: boolean;
  created_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  label: string;
  price_kes: number;
  stock_qty: number;
  sort_order: number;
};

export type Review = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  display_name: string | null;
  is_visible: boolean;
  created_at: string;
};

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as Category[];
  },
});

export const productsQuery = (opts?: { categorySlug?: string; featured?: boolean }) =>
  queryOptions({
    queryKey: ["products", opts ?? {}],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, categories!inner(slug)")
        .order("created_at", { ascending: false });
      if (opts?.categorySlug) {
        query = query.eq("categories.slug", opts.categorySlug);
      }
      if (opts?.featured) {
        query = query.eq("featured", true);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as (Product & { categories: { slug: string } })[];
    },
  });

export const productBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as Product | null;
    },
  });

export const relatedProductsQuery = (
  productId: string | undefined,
  categoryId: string | null | undefined,
) =>
  queryOptions({
    queryKey: ["related-products", productId, categoryId],
    enabled: !!productId,
    queryFn: async () => {
      if (!productId) return [] as Product[];
      let q = supabase
        .from("products")
        .select("*")
        .neq("id", productId)
        .limit(4);
      if (categoryId) q = q.eq("category_id", categoryId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

export const productVariantsQuery = (productId: string | undefined) =>
  queryOptions({
    queryKey: ["variants", productId],
    enabled: !!productId,
    queryFn: async () => {
      if (!productId) return [] as ProductVariant[];
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .order("sort_order")
        .order("price_kes");
      if (error) throw error;
      return (data ?? []) as ProductVariant[];
    },
  });

export const productReviewsQuery = (productId: string | undefined) =>
  queryOptions({
    queryKey: ["reviews", productId],
    enabled: !!productId,
    queryFn: async () => {
      if (!productId) return [] as Review[];
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });

export type CustomerProfile = {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  delivery_area: string | null;
};

export type MyOrder = {
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
  order_items: {
    id: string;
    product_name: string;
    variant_label: string | null;
    unit_price_kes: number;
    qty: number;
  }[];
};

export const customerProfileQuery = (userId: string | null | undefined) =>
  queryOptions({
    queryKey: ["customer-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data as CustomerProfile | null) ?? null;
    },
  });

export const myOrdersQuery = (userId: string | null | undefined) =>
  queryOptions({
    queryKey: ["my-orders", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [] as MyOrder[];
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, reference, customer_name, phone, delivery_area, notes, total_kes, subtotal_kes, discount_kes, delivery_fee_kes, coupon_code, delivery_zone, status, created_at, order_items(id, product_name, variant_label, unit_price_kes, qty)",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MyOrder[];
    },
  });

export const isAdminQuery = (userId: string | null) =>
  queryOptions({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });


// Signed URL for a private storage object.
export const signedMediaUrlQuery = (
  bucket: "product-images" | "product-videos",
  path: string | null | undefined,
) =>
  queryOptions({
    queryKey: ["signed-url", bucket, path],
    enabled: !!path,
    staleTime: 1000 * 60 * 45,
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });

export const productImageUrlQuery = (path: string | null | undefined) =>
  signedMediaUrlQuery("product-images", path);

export type DeliveryZone = {
  id: string;
  name: string;
  fee_kes: number;
  eta: string | null;
  active: boolean;
  sort_order: number;
};

export const deliveryZonesQuery = (includeInactive = false) =>
  queryOptions({
    queryKey: ["delivery-zones", includeInactive],
    queryFn: async () => {
      let q = supabase
        .from("delivery_zones")
        .select("*")
        .order("sort_order")
        .order("fee_kes");
      if (!includeInactive) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DeliveryZone[];
    },
  });

export type Coupon = {
  id: string;
  code: string;
  kind: "percent" | "fixed";
  value: number;
  min_subtotal_kes: number;
  active: boolean;
  usage_limit: number | null;
  used_count: number;
  expires_at: string | null;
  created_at: string;
};

export const couponsQuery = queryOptions({
  queryKey: ["coupons"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Coupon[];
  },
});

export type CouponCheck = {
  valid: boolean;
  message: string;
  code: string | null;
  discount_kes: number;
};

/** Server-side coupon check — safe for guests, never reveals the list of codes. */
export async function validateCoupon(code: string, subtotalKes: number): Promise<CouponCheck> {
  const { data, error } = await supabase.rpc("validate_coupon", {
    p_code: code,
    p_subtotal_kes: subtotalKes,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? {
    valid: false,
    message: "That code is not valid.",
    code: null,
    discount_kes: 0,
  }) as CouponCheck;
}

export type GiftFinderBudget = {
  id: string;
  label: string;
  min_price_kes: number;
  max_price_kes: number | null;
  description: string | null;
  sort_order: number;
};

export const giftFinderBudgetsQuery = queryOptions({
  queryKey: ["gift-finder-budgets"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("gift_finder_budgets")
      .select("*")
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as GiftFinderBudget[];
  },
});
