-- Fix RLS policies for bookings to allow caterers to update bookings
-- This ensures caterers can accept/decline bookings linked to their packages or services

-- Step 1: Check current policies
SELECT
  policyname,
  cmd AS command,
  qual AS policy_condition,
  with_check AS check_condition
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'bookings'
ORDER BY cmd, policyname;

-- Step 2: Drop existing caterer update policies to recreate them
DROP POLICY IF EXISTS "Caterers can update bookings for their services" ON public.bookings;
DROP POLICY IF EXISTS "Caterers can update bookings for their packages" ON public.bookings;

-- Step 3: Create policy for caterers to update bookings linked to their services
CREATE POLICY "Caterers can update bookings for their services"
  ON public.bookings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = bookings.service_id
      AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = bookings.service_id
      AND s.user_id = auth.uid()
    )
  );

-- Step 4: Create policy for caterers to update bookings linked to their packages
-- This is important since bookings can be linked directly to packages
CREATE POLICY "Caterers can update bookings for their packages"
  ON public.bookings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.packages p
      WHERE p.id = bookings.package_id
      AND p.caterer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.packages p
      WHERE p.id = bookings.package_id
      AND p.caterer_id = auth.uid()
    )
  );

-- Step 5: Verify policies
SELECT
  policyname,
  cmd AS command,
  CASE
    WHEN cmd = 'UPDATE' AND qual LIKE '%packages%' THEN '✅ Allows updating bookings by package'
    WHEN cmd = 'UPDATE' AND qual LIKE '%services%' THEN '✅ Allows updating bookings by service'
    ELSE 'Check policy'
  END AS status
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'bookings'
  AND cmd = 'UPDATE'
ORDER BY policyname;

