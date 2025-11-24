-- Create RLS policies for partner_applications table
-- This table currently has RLS enabled but NO policies, blocking all access

-- Enable RLS (should already be enabled, but ensure it)
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SELECT POLICIES (Read Access)
-- ============================================================================

-- Policy: Admins can view all applications
DROP POLICY IF EXISTS "Admins can view all applications" ON public.partner_applications;
CREATE POLICY "Admins can view all applications"
ON public.partner_applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  )
);

-- Policy: Users can view their own applications
DROP POLICY IF EXISTS "Users can view own applications" ON public.partner_applications;
CREATE POLICY "Users can view own applications"
ON public.partner_applications
FOR SELECT
USING (user_id = auth.uid());

-- Policy: Public can view approved applications (for customers browsing services)
DROP POLICY IF EXISTS "Public can view approved applications" ON public.partner_applications;
CREATE POLICY "Public can view approved applications"
ON public.partner_applications
FOR SELECT
USING (status = 'Approved');

-- ============================================================================
-- INSERT POLICIES (Create Access)
-- ============================================================================

-- Policy: Users can insert their own applications
DROP POLICY IF EXISTS "Users can insert own applications" ON public.partner_applications;
CREATE POLICY "Users can insert own applications"
ON public.partner_applications
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- UPDATE POLICIES (Modify Access)
-- ============================================================================

-- Policy: Admins can update all applications (including status changes)
DROP POLICY IF EXISTS "Admins can update all applications" ON public.partner_applications;
CREATE POLICY "Admins can update all applications"
ON public.partner_applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  )
);

-- Policy: Users can update their own pending applications (for editing before submission)
DROP POLICY IF EXISTS "Users can update own pending applications" ON public.partner_applications;
CREATE POLICY "Users can update own pending applications"
ON public.partner_applications
FOR UPDATE
USING (
  user_id = auth.uid() 
  AND status = 'Pending'
  AND NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  )
)
WITH CHECK (
  user_id = auth.uid() 
  AND status = 'Pending'
  AND NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  )
);

-- ============================================================================
-- DELETE POLICIES (Remove Access)
-- ============================================================================

-- Policy: Admins can delete all applications
DROP POLICY IF EXISTS "Admins can delete all applications" ON public.partner_applications;
CREATE POLICY "Admins can delete all applications"
ON public.partner_applications
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify policies were created
SELECT 
  'Policy Count' as check,
  COUNT(*) as total_policies
FROM pg_policies
WHERE tablename = 'partner_applications';

-- List all policies
SELECT 
  policyname,
  cmd as command,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ Read access'
    WHEN cmd = 'INSERT' THEN '✅ Create access'
    WHEN cmd = 'UPDATE' THEN '✅ Update access'
    WHEN cmd = 'DELETE' THEN '✅ Delete access'
    ELSE cmd
  END as description
FROM pg_policies
WHERE tablename = 'partner_applications'
ORDER BY cmd, policyname;


