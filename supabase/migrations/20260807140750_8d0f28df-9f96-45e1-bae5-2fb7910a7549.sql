-- Create gift_finder_budgets table
CREATE TABLE public.gift_finder_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    min_price_kes NUMERIC(12, 2) NOT NULL DEFAULT 0,
    max_price_kes NUMERIC(12, 2), -- NULL means "and above"
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grant access
GRANT SELECT ON public.gift_finder_budgets TO authenticated, anon;
GRANT ALL ON public.gift_finder_budgets TO service_role;

-- Enable RLS
ALTER TABLE public.gift_finder_budgets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view budget ranges" 
ON public.gift_finder_budgets FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage budget ranges" 
ON public.gift_finder_budgets FOR ALL 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Initial data
INSERT INTO public.gift_finder_budgets (label, min_price_kes, max_price_kes, description, sort_order)
VALUES 
('Essential Luxury', 0, 5000, 'KSh 0 - 5,000', 0),
('Premium Selection', 5000, 15000, 'KSh 5,000 - 15,000', 1),
('Ultra Premium', 15000, NULL, 'Above KSh 15,000', 2);
