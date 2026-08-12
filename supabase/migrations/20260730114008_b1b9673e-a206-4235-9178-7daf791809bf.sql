ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;

CREATE POLICY "Visible reviews are viewable by everyone"
ON public.reviews FOR SELECT
TO anon, authenticated
USING (
  is_visible
  OR auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins update any review"
ON public.reviews FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));