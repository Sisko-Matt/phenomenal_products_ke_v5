CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  label text NOT NULL,
  price_kes integer NOT NULL,
  stock_qty integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Variants are viewable by everyone" ON public.product_variants
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins manage variants" ON public.product_variants
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX product_variants_product_id_idx ON public.product_variants(product_id);

ALTER TABLE public.order_items
  ADD COLUMN variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN variant_label text;

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

  INSERT INTO public.orders (customer_name, phone, delivery_area, notes, total_kes, status)
  VALUES (v_name, v_phone, v_area, v_notes, 0, 'new')
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