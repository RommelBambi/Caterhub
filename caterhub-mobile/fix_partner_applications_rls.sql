-- Fix RLS policies for partner_applications table to allow admin access

-- Enable RLS
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own applications" ON public.partner_applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON public.partner_applications;
DROP POLICY IF EXISTS "Users can update own pending applications" ON public.partner_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.partner_applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON public.partner_applications;
DROP POLICY IF EXISTS "Admins can delete all applications" ON public.partner_applications;

-- Policy: Users can view their own applications
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
  USING (auth.uid() = user_id AND status = 'Pending')
  WITH CHECK (auth.uid() = user_id AND status = 'Pending');

-- Policy: Admins can view all applications
CREATE POLICY "Admins can view all applications"
  ON public.partner_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

-- Policy: Admins can update all applications
CREATE POLICY "Admins can update all applications"
  ON public.partner_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

-- Policy: Admins can delete all applications (optional, for cleanup)
CREATE POLICY "Admins can delete all applications"
  ON public.partner_applications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

