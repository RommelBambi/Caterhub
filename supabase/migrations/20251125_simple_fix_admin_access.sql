-- SIMPLE FIX: Ensure users can read their own record and update role to ADMIN
-- This fixes the circular dependency issue

-- Step 1: Fix RLS on users table (simple - users can see their own record)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Allow role checks for RLS policies" ON public.users;

-- Simple policy: Users can always see their own record
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
USING (id = auth.uid());

-- Step 2: Check your current role
SELECT 
  'Current Role Check' as step,
  id,
  email,
  role,
  CASE 
    WHEN role = 'ADMIN' THEN '✅ Already ADMIN'
    ELSE '❌ Role is: ' || role || ' - Need to update to ADMIN'
  END as status
FROM public.users
WHERE id = auth.uid();

-- Step 3: Update your role to ADMIN (if not already)
-- This will work because you can see your own record now
UPDATE public.users
SET role = 'ADMIN'
WHERE id = auth.uid()
  AND role != 'ADMIN'  -- Only update if not already ADMIN
RETURNING id, email, role;

-- Step 4: Verify the admin check works
SELECT 
  'Verification' as step,
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  ) as admin_check_works,
  CASE 
    WHEN EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    ) THEN '✅ SUCCESS: You can now approve/reject applications!'
    ELSE '❌ Still not working - please check the error'
  END as result;


