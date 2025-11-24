-- Create comprehensive RLS policies for packages table
-- Currently only has "Customers can view active packages" - need to add more

-- Enable RLS (should already be enabled, but ensure it)
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SELECT POLICIES (Read Access)
-- ============================================================================

-- Keep existing: Customers can view active packages
-- (Don't drop if it exists, just ensure we have all needed policies)

-- Policy: Caterers can view their own packages
DROP POLICY IF EXISTS "Caterers can view own packages" ON public.packages;
CREATE POLICY "Caterers can view own packages"
ON public.packages
FOR SELECT
USING (
  caterer_id = auth.uid()
  OR
  (is_active = true AND EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('CUSTOMER', 'ADMIN')
  ))
);

-- Policy: Admins can view all packages
DROP POLICY IF EXISTS "Admins can view all packages" ON public.packages;
CREATE POLICY "Admins can view all packages"
ON public.packages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  )
);

-- Policy: Public/Customers can view active packages (if the existing one doesn't cover this)
-- Check if "Customers can view active packages" exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'packages'
    AND policyname = 'Customers can view active packages'
  ) THEN
    CREATE POLICY "Customers can view active packages"
    ON public.packages
    FOR SELECT
    USING (is_active = true);
  END IF;
END $$;

-- ============================================================================
-- INSERT POLICIES (Create Access)
-- ============================================================================

-- Policy: Caterers can create their own packages
DROP POLICY IF EXISTS "Caterers can create own packages" ON public.packages;
CREATE POLICY "Caterers can create own packages"
ON public.packages
FOR INSERT
WITH CHECK (
  caterer_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'CATER'
  )
);

-- Policy: Admins can create packages
DROP POLICY IF EXISTS "Admins can create packages" ON public.packages;
CREATE POLICY "Admins can create packages"
ON public.packages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  )
);

-- ============================================================================
-- UPDATE POLICIES (Modify Access)
-- ============================================================================

-- Policy: Caterers can update their own packages
DROP POLICY IF EXISTS "Caterers can update own packages" ON public.packages;
CREATE POLICY "Caterers can update own packages"
ON public.packages
FOR UPDATE
USING (
  caterer_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'CATER'
  )
)
WITH CHECK (
  caterer_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'CATER'
  )
);

-- Policy: Admins can update all packages
DROP POLICY IF EXISTS "Admins can update all packages" ON public.packages;
CREATE POLICY "Admins can update all packages"
ON public.packages
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

-- ============================================================================
-- DELETE POLICIES (Remove Access)
-- ============================================================================

-- Policy: Caterers can delete their own packages (soft delete by setting is_active = false)
-- Note: We don't allow hard deletes, only soft deletes via UPDATE
-- But if needed, we can add this policy

-- Policy: Admins can delete all packages
DROP POLICY IF EXISTS "Admins can delete all packages" ON public.packages;
CREATE POLICY "Admins can delete all packages"
ON public.packages
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
WHERE tablename = 'packages';

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
WHERE tablename = 'packages'
ORDER BY cmd, policyname;


