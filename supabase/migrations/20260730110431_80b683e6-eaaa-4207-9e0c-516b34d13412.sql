DROP POLICY "Anyone can place an order" ON public.orders;
CREATE POLICY "Anyone can place an order"
  ON public.orders FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(btrim(customer_name)) BETWEEN 2 AND 100
    AND length(btrim(phone)) BETWEEN 7 AND 20
    AND length(btrim(delivery_area)) BETWEEN 2 AND 120
    AND (notes IS NULL OR length(notes) <= 1000)
    AND total_kes >= 0 AND total_kes <= 100000000
    AND status = 'new'
  );

DROP POLICY "Anyone can add order items" ON public.order_items;
CREATE POLICY "Anyone can add order items"
  ON public.order_items FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(btrim(product_name)) BETWEEN 1 AND 200
    AND unit_price_kes >= 0 AND unit_price_kes <= 100000000
    AND qty > 0 AND qty <= 999
  );

REVOKE EXECUTE ON FUNCTION public.grant_admin_to_owner() FROM anon, authenticated, PUBLIC;