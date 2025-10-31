-- Create packages table for caterer packages
-- This table stores catering packages created by caterers

CREATE TABLE IF NOT EXISTS public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caterer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of PackageSection objects
  inclusions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of PackageInclusion objects
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on caterer_id for faster queries
CREATE INDEX IF NOT EXISTS idx_packages_caterer_id ON public.packages(caterer_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_packages_created_at ON public.packages(created_at DESC);

-- Enable RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- Policy: Caterers can view their own packages
CREATE POLICY "Caterers can view own packages"
  ON public.packages
  FOR SELECT
  USING (auth.uid() = caterer_id);

-- Policy: Caterers can insert their own packages
CREATE POLICY "Caterers can insert own packages"
  ON public.packages
  FOR INSERT
  WITH CHECK (auth.uid() = caterer_id);

-- Policy: Caterers can update their own packages
CREATE POLICY "Caterers can update own packages"
  ON public.packages
  FOR UPDATE
  USING (auth.uid() = caterer_id)
  WITH CHECK (auth.uid() = caterer_id);

-- Policy: Caterers can delete their own packages
CREATE POLICY "Caterers can delete own packages"
  ON public.packages
  FOR DELETE
  USING (auth.uid() = caterer_id);

-- Policy: Admins can view all packages
CREATE POLICY "Admins can view all packages"
  ON public.packages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER packages_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW
  EXECUTE FUNCTION update_packages_updated_at();

