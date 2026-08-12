CREATE OR REPLACE FUNCTION public.place_order(
  p_customer_name text,
  p_phone text,
  p_delivery_area text,
  p_notes text,
  p_items jsonb
)
RETURNS TABLE (reference text, total_kes integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.order_items (order_id, product_id, product_name, unit_price_kes, qty)
  SELECT v_order_id, pr.id, pr.name, pr.price_kes, LEAST(GREATEST(i.qty, 1), 999)
  FROM jsonb_to_recordset(p_items) AS i(product_id uuid, qty integer)
  JOIN public.products pr ON pr.id = i.product_id;

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
$$;

REVOKE ALL ON FUNCTION public.place_order(text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(text, text, text, text, jsonb) TO anon, authenticated;

DROP POLICY "Anyone can place an order" ON public.orders;
DROP POLICY "Anyone can add order items" ON public.order_items;
REVOKE INSERT ON public.orders FROM anon;
REVOKE INSERT ON public.order_items FROM anon;
REVOKE INSERT ON public.orders FROM authenticated;
REVOKE INSERT ON public.order_items FROM authenticated;

DELETE FROM public.orders WHERE customer_name = 'Test Buyer';