-- ============================================
-- ADD MISSING SELECT POLICY FOR CATERERS
-- ============================================
-- This policy allows caterers to VIEW bookings for their packages
-- The UPDATE policy already exists, but SELECT is missing

CREATE POLICY "Caterers can view bookings for their packages"
ON bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM packages
    WHERE packages.id = bookings.package_id
      AND packages.caterer_id = auth.uid()
  )
);

-- Verify the policy was created
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'bookings'
  AND policyname = 'Caterers can view bookings for their packages';

