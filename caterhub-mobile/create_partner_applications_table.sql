-- Create partner_applications table (updated - removed unused fields)
CREATE TABLE IF NOT EXISTS public.partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  locations JSONB DEFAULT '[]'::jsonb,
  website TEXT,
  owner_name TEXT NOT NULL,
  owner_phone TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  telephone_number TEXT,
  contact_number TEXT,
  permits_ready BOOLEAN DEFAULT false,
  food_safety BOOLEAN DEFAULT false,
  agree_terms BOOLEAN DEFAULT false,
  notes TEXT,
  uploaded_documents TEXT[] DEFAULT '{}', -- Array of Supabase storage file paths
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_partner_applications_user_id ON public.partner_applications(user_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_partner_applications_status ON public.partner_applications(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_partner_applications_created_at ON public.partner_applications(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own applications
CREATE POLICY "Users can view own applications"
  ON public.partner_applications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own applications
CREATE POLICY "Users can insert own applications"
  ON public.partner_applications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own pending applications
CREATE POLICY "Users can update own pending applications"
  ON public.partner_applications
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'Pending');

-- Policy: Admins can view all applications
CREATE POLICY "Admins can view all applications"
  ON public.partner_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Policy: Admins can update any application
CREATE POLICY "Admins can update all applications"
  ON public.partner_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_partner_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER partner_applications_updated_at
  BEFORE UPDATE ON public.partner_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_partner_applications_updated_at();

-- Create storage bucket for partner documents (run this in Supabase Storage section)
-- Note: You need to create this bucket manually in Supabase Dashboard > Storage
-- Bucket name: 'partner-documents'
-- Public: false (private bucket)
-- File size limit: 10MB (or as needed)
-- Allowed MIME types: application/pdf, image/*
