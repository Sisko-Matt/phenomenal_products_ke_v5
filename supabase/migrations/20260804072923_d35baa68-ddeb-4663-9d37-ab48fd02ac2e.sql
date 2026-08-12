-- 1. Coupons table
CREATE TABLE public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'percent' CHECK (kind IN ('percent', 'fixed')),
  value integer NOT NULL CHECK (value > 0),
  min_subtotal_kes integer NOT NULL DEFAULT 0 CHECK (min_subtotal_kes >= 0),
  active boolean NOT NULL DEFAULT true,
  usage_limit integer CHECK (usage_limit IS NULL OR usage_limit > 0),
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT coupons_percent_range CHECK (kind <> 'percent' OR value <= 100)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Delivery zones table
CREATE TABLE public.delivery_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  fee_kes integer NOT NULL DEFAULT 0 CHECK (fee_kes >= 0),
  eta text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_zones TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_zones TO authenticated;
GRANT ALL ON public.delivery_zones TO service_role;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active zones are viewable by everyone" ON public.delivery_zones
  FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "Admins manage zones" ON public.delivery_zones FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER delivery_zones_updated_at BEFORE UPDATE ON public.delivery_zones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Order price-breakdown columns
ALTER TABLE public.orders
  ADD COLUMN subtotal_kes integer NOT NULL DEFAULT 0,
  ADD COLUMN discount_kes integer NOT NULL DEFAULT 0,
  ADD COLUMN delivery_fee_kes integer NOT NULL DEFAULT 0,
  ADD COLUMN coupon_code text,
  ADD COLUMN delivery_zone text;

-- 4. Public coupon check (reveals nothing about other codes)
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_subtotal_kes integer)
RETURNS TABLE(valid boolean, message text, code text, discount_kes integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_coupon public.coupons%ROWTYPE;
  v_discount integer := 0;
BEGIN
  IF v_code = '' THEN
    RETURN QUERY SELECT false, 'Enter a coupon code.'::text, null::text, 0; RETURN;
  END IF;
  SELECT * INTO v_coupon FROM public.coupons c WHERE c.code = v_code;
  IF NOT FOUND OR NOT v_coupon.active THEN
    RETURN QUERY SELECT false, 'That code is not valid.'::text, null::text, 0; RETURN;
  END IF;
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN QUERY SELECT false, 'That code has expired.'::text, null::text, 0; RETURN;
  END IF;
  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
    RETURN QUERY SELECT false, 'That code has been fully used.'::text, null::text, 0; RETURN;
  END IF;
  IF coalesce(p_subtotal_kes, 0) < v_coupon.min_subtotal_kes THEN
    RETURN QUERY SELECT false, ('This code needs a minimum order of KES ' || v_coupon.min_subtotal_kes)::text, null::text, 0; RETURN;
  END IF;
  IF v_coupon.kind = 'percent' THEN
    v_discount := LEAST(p_subtotal_kes, floor(p_subtotal_kes * v_coupon.value / 100.0));
  ELSE
    v_discount := LEAST(p_subtotal_kes, v_coupon.value);
  END IF;
  RETURN QUERY SELECT true, 'Coupon applied.'::text, v_coupon.code, v_discount;
END;
$function$;

-- 5. Order placement with delivery zone + coupon
DROP FUNCTION IF EXISTS public.place_order(text, text, text, text, jsonb);

CREATE FUNCTION public.place_order(
  p_customer_name text,
  p_phone text,
  p_delivery_area text,
  p_notes text,
  p_items jsonb,
  p_delivery_zone_id uuid DEFAULT NULL,
  p_coupon_code text DEFAULT NULL
)
RETURNS TABLE(reference text, total_kes integer, subtotal_kes integer, discount_kes integer, delivery_fee_kes integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_name text := btrim(coalesce(p_customer_name, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_area text := btrim(coalesce(p_delivery_area, ''));
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_order_id uuid;
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_fee integer := 0;
  v_total integer := 0;
  v_ref text;
  v_zone public.delivery_zones%ROWTYPE;
  v_coupon public.coupons%ROWTYPE;
  v_code text := upper(btrim(coalesce(p_coupon_code, '')));
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

  IF p_delivery_zone_id IS NOT NULL THEN
    SELECT * INTO v_zone FROM public.delivery_zones z WHERE z.id = p_delivery_zone_id AND z.active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Please choose a valid delivery zone.';
    END IF;
    v_fee := v_zone.fee_kes;
  END IF;

  INSERT INTO public.orders (customer_name, phone, delivery_area, notes, total_kes, status, user_id, delivery_zone)
  VALUES (v_name, v_phone, v_area, v_notes, 0, 'new', auth.uid(),
          CASE WHEN p_delivery_zone_id IS NULL THEN NULL ELSE v_zone.name END)
  RETURNING id, orders.reference INTO v_order_id, v_ref;

  INSERT INTO public.order_items (order_id, product_id, product_name, unit_price_kes, qty, variant_id, variant_label)
  SELECT v_order_id, pr.id, pr.name,
         coalesce(pv.price_kes, pr.price_kes),
         LEAST(GREATEST(i.qty, 1), 999),
         pv.id, pv.label
  FROM jsonb_to_recordset(p_items) AS i(product_id uuid, qty integer, variant_id uuid)
  JOIN public.products pr ON pr.id = i.product_id
  LEFT JOIN public.product_variants pv ON pv.id = i.variant_id AND pv.product_id = pr.id;

  SELECT coalesce(sum(oi.unit_price_kes * oi.qty), 0) INTO v_subtotal
  FROM public.order_items oi WHERE oi.order_id = v_order_id;

  IF v_subtotal = 0 THEN
    DELETE FROM public.orders WHERE id = v_order_id;
    RAISE EXCEPTION 'We could not find those products. Please refresh and try again.';
  END IF;

  IF v_code <> '' THEN
    SELECT * INTO v_coupon FROM public.coupons c WHERE c.code = v_code;
    IF NOT FOUND OR NOT v_coupon.active THEN
      DELETE FROM public.orders WHERE id = v_order_id;
      RAISE EXCEPTION 'That coupon code is not valid.';
    END IF;
    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
      DELETE FROM public.orders WHERE id = v_order_id;
      RAISE EXCEPTION 'That coupon has expired.';
    END IF;
    IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
      DELETE FROM public.orders WHERE id = v_order_id;
      RAISE EXCEPTION 'That coupon has been fully used.';
    END IF;
    IF v_subtotal < v_coupon.min_subtotal_kes THEN
      DELETE FROM public.orders WHERE id = v_order_id;
      RAISE EXCEPTION 'That coupon needs a minimum order of KES %.', v_coupon.min_subtotal_kes;
    END IF;
    IF v_coupon.kind = 'percent' THEN
      v_discount := LEAST(v_subtotal, floor(v_subtotal * v_coupon.value / 100.0));
    ELSE
      v_discount := LEAST(v_subtotal, v_coupon.value);
    END IF;
    UPDATE public.coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;
  END IF;

  v_total := v_subtotal - v_discount + v_fee;

  UPDATE public.orders
  SET subtotal_kes = v_subtotal,
      discount_kes = v_discount,
      delivery_fee_kes = v_fee,
      coupon_code = CASE WHEN v_discount > 0 THEN v_code ELSE NULL END,
      total_kes = v_total
  WHERE id = v_order_id;

  reference := v_ref;
  total_kes := v_total;
  subtotal_kes := v_subtotal;
  discount_kes := v_discount;
  delivery_fee_kes := v_fee;
  RETURN NEXT;
END;
$function$;

-- 6. Starter data
INSERT INTO public.delivery_zones (name, fee_kes, eta, sort_order) VALUES
  ('Nairobi CBD', 150, 'Same day', 1),
  ('Nairobi — Other areas', 250, 'Same day / next day', 2),
  ('Mombasa', 350, '1–2 days', 3),
  ('Nakuru', 350, '1–2 days', 4),
  ('Kisumu', 400, '1–2 days', 5),
  ('Countrywide courier', 500, '2–3 days', 6);

INSERT INTO public.coupons (code, kind, value, min_subtotal_kes) VALUES
  ('WELCOME10', 'percent', 10, 0);