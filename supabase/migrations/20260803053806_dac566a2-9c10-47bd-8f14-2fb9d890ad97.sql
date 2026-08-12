-- Customer profiles
CREATE TABLE public.customer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  delivery_area text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_profiles TO authenticated;
GRANT ALL ON public.customer_profiles TO service_role;

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own profile" ON public.customer_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own profile" ON public.customer_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own profile" ON public.customer_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their own profile" ON public.customer_profiles
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER customer_profiles_updated_at
  BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Link orders to signed-in customers (nullable: guest checkout still allowed)
ALTER TABLE public.orders ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX orders_user_id_idx ON public.orders (user_id);

CREATE POLICY "Users view their own orders" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users view their own order items" ON public.order_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
  );

-- place_order now records the signed-in customer when present
CREATE OR REPLACE FUNCTION public.place_order(p_customer_name text, p_phone text, p_delivery_area text, p_notes text, p_items jsonb)
 RETURNS TABLE(reference text, total_kes integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_name text := btrim(coalesce(p_customer_name, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_area text := btrim(coalesce(p_delivery_area, ''));
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_order_id uuid;
  v_total integer := 0;
  v_ref text;
BEGIN
  IF length(v_name) < 2 OR length(v_name) > 100 THEN
    RAISE EXCEPTION 'Please enter a valid name.';
  END IF;
  IF length(v_phone) < 7 OR length(v_phone) > 20 OR v_phone !~ '^[0-9+\s-]+$' THEN
    RAISE EXCEPTION 'Please enter a valid phone number.';
  END IF;
  IF length(v_area) < 2 OR length(v_area) > 120 THEN
    RAISE EXCEPTION 'Please enter a delivery area.';
  END IF;
  IF v_notes IS NOT NULL AND length(v_notes) > 1000 THEN
    RAISE EXCEPTION 'Notes are too long.';
  END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'Your bag is empty.';
  END IF;

  INSERT INTO public.orders (customer_name, phone, delivery_area, notes, total_kes, status, user_id)
  VALUES (v_name, v_phone, v_area, v_notes, 0, 'new', auth.uid())
  RETURNING id, orders.reference INTO v_order_id, v_ref;

  INSERT INTO public.order_items (order_id, product_id, product_name, unit_price_kes, qty, variant_id, variant_label)
  SELECT v_order_id, pr.id, pr.name,
         coalesce(pv.price_kes, pr.price_kes),
         LEAST(GREATEST(i.qty, 1), 999),
         pv.id, pv.label
  FROM jsonb_to_recordset(p_items) AS i(product_id uuid, qty integer, variant_id uuid)
  JOIN public.products pr ON pr.id = i.product_id
  LEFT JOIN public.product_variants pv ON pv.id = i.variant_id AND pv.product_id = pr.id;

  SELECT coalesce(sum(unit_price_kes * qty), 0) INTO v_total
  FROM public.order_items WHERE order_id = v_order_id;

  IF v_total = 0 THEN
    DELETE FROM public.orders WHERE id = v_order_id;
    RAISE EXCEPTION 'We could not find those products. Please refresh and try again.';
  END IF;

  UPDATE public.orders SET total_kes = v_total WHERE id = v_order_id;

  reference := v_ref;
  total_kes := v_total;
  RETURN NEXT;
END;
$function$;