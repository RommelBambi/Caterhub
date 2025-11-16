-- ============================================
-- ADD MISSING SELECT POLICY FOR ADMINS
-- ============================================
-- Admins need to be able to VIEW all bookings and payments
-- The UPDATE and DELETE policies exist, but SELECT is missing

CREATE POLICY "Admins can view all bookings"
ON bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
  )
);

-- Verify the policy was created
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'bookings'
  AND policyname = 'Admins can view all bookings';

