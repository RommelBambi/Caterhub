-- ============================================
-- QUICK FIX: Add RLS Policy for caterer_monthly_gmv
-- ============================================
-- Run this in Supabase SQL Editor to fix the RLS error

-- Enable RLS if not already enabled
ALTER TABLE public.caterer_monthly_gmv ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Caterers can manage their own GMV" ON public.caterer_monthly_gmv;
DROP POLICY IF EXISTS "Caterers can view their own GMV" ON public.caterer_monthly_gmv;

-- Policy: Allow caterers to insert/update their own GMV records
-- This allows the trigger to work when a booking is marked as COMPLETED
CREATE POLICY "Caterers can manage their own GMV"
  ON public.caterer_monthly_gmv
  FOR ALL
  TO authenticated
  USING (
    -- Allow if the caterer_id matches the current user
    caterer_id = auth.uid()
    OR EXISTS (
      -- OR if the user owns a package that belongs to this caterer
      SELECT 1
      FROM public.packages
      WHERE packages.caterer_id = auth.uid()
        AND packages.caterer_id = caterer_monthly_gmv.caterer_id
    )
  )
  WITH CHECK (
    -- Same check for inserts/updates
    caterer_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.packages
      WHERE packages.caterer_id = auth.uid()
        AND packages.caterer_id = caterer_monthly_gmv.caterer_id
    )
  );

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'caterer_monthly_gmv'
  AND schemaname = 'public';

