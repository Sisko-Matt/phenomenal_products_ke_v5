
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS display_name text;
