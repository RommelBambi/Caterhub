-- Fix RLS on users table WITHOUT circular dependency
-- The issue: RLS policy tries to check admin role by querying users table,
-- but that query is blocked by RLS, creating a circular dependency

-- Step 1: First, let's see what your actual role is (bypassing RLS temporarily)
-- Run this with service role or disable RLS temporarily to see the real data
SET LOCAL row_security = off;
SELECT 
  '=== Your Actual Role in Database ===' as check,
  id,
  email,
  role,
  CASE 
    WHEN role = 'ADMIN' THEN '✅ You ARE an admin in the database'
    ELSE '❌ Your role is: ' || role || ' (NOT ADMIN)'
  END as status
FROM public.users
WHERE email = 'lado@gmail.com';  -- Replace with your actual email if different
RESET row_security;

-- Step 2: Fix the RLS policy to avoid circular dependency
-- The key is: users should ALWAYS be able to read their own record
-- This allows the admin check to work

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop all existing SELECT policies on users
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Allow role checks for RLS policies" ON public.users;
DROP POLICY IF EXISTS "Public can view users" ON public.users;

-- Simple policy: Users can ALWAYS see their own record
-- This is safe and necessary for admin checks to work
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
USING (id = auth.uid());

-- Step 3: Verify your role is actually ADMIN
-- Run this to check (it should work now because you can see your own record)
SELECT 
  '=== Verify Your Role ===' as check,
  id,
  email,
  role,
  CASE 
    WHEN role = 'ADMIN' THEN '✅ You are ADMIN - RLS should work now'
    ELSE '❌ Your role is NOT ADMIN: ' || role || ' - Update it to ADMIN!'
  END as status
FROM public.users
WHERE id = auth.uid();

-- Step 4: If your role is not ADMIN, update it
-- UNCOMMENT AND RUN THIS IF YOUR ROLE IS NOT ADMIN:
/*
UPDATE public.users
SET role = 'ADMIN'
WHERE id = auth.uid()
RETURNING id, email, role;
*/

-- Step 5: Test the admin check again
SELECT 
  '=== Final Admin Check Test ===' as test,
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
    ) THEN '✅ SUCCESS: Admin check now works!'
    ELSE '❌ Still failing - check if your role is actually ADMIN in the database'
  END as result;


