ALTER TABLE public.products ADD COLUMN IF NOT EXISTS table_description JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.products.table_description IS 'Stores product specifications as an array of objects: [{"key": "Material", "value": "Gold"}, ...]';