-- Create the enum type for gender if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_gender') THEN
        CREATE TYPE public.product_gender AS ENUM ('male', 'female', 'unisex');
    END IF;
END $$;

-- Add gender column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gender public.product_gender DEFAULT 'unisex';

-- Grant access (though should already be there)
GRANT ALL ON public.products TO authenticated;
GRANT SELECT ON public.products TO anon;
GRANT ALL ON public.products TO service_role;
