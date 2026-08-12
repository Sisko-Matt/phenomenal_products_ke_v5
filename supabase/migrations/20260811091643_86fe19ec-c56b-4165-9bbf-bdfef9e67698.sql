-- Add is_limited_offer column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_limited_offer BOOLEAN DEFAULT FALSE;

-- Ensure grants are correct for existing table with new column
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
GRANT SELECT ON public.products TO anon;
