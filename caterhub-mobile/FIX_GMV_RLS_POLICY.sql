-- ============================================
-- FIX RLS POLICY FOR caterer_monthly_gmv TABLE
-- ============================================
-- Problem: When marking a booking as COMPLETED, the trigger update_caterer_gmv
-- tries to insert/update caterer_monthly_gmv but RLS blocks it.
--
-- Solution: Add a permissive RLS policy that allows the trigger to work
-- OR make the function SECURITY DEFINER (better solution)

-- Option 1: Add permissive RLS policy (Quick fix)
-- This allows authenticated users to insert/update GMV records
-- when they match the caterer_id from their packages

-- Enable RLS if not already enabled
ALTER TABLE public.caterer_monthly_gmv ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Allow trigger to update GMV" ON public.caterer_monthly_gmv;
DROP POLICY IF EXISTS "Caterers can view their own GMV" ON public.caterer_monthly_gmv;

-- Policy: Allow caterers to insert/update their own GMV records
-- This works because the trigger gets the caterer_id from the booking's package
CREATE POLICY "Caterers can manage their own GMV"
  ON public.caterer_monthly_gmv
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.packages
      WHERE packages.caterer_id = auth.uid()
        AND packages.caterer_id = caterer_monthly_gmv.caterer_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.packages
      WHERE packages.caterer_id = auth.uid()
        AND packages.caterer_id = caterer_monthly_gmv.caterer_id
    )
  );

-- Policy: Allow viewing own GMV records
CREATE POLICY "Caterers can view their own GMV"
  ON public.caterer_monthly_gmv
  FOR SELECT
  TO authenticated
  USING (
    caterer_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.packages
      WHERE packages.caterer_id = auth.uid()
        AND packages.caterer_id = caterer_monthly_gmv.caterer_id
    )
  );

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'caterer_monthly_gmv'
  AND schemaname = 'public';

-- ============================================
-- BETTER SOLUTION: Make function SECURITY DEFINER
-- ============================================
-- This is the recommended approach. The function will run with
-- the privileges of the function creator (usually a superuser),
-- bypassing RLS entirely.

-- First, get the current function definition:
-- SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'update_caterer_gmv';

-- Then recreate it with SECURITY DEFINER (see FIX_GMV_TRIGGER_SECURITY_DEFINER.sql)

