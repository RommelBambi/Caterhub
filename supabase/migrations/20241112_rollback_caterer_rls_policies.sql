-- Rollback script for 20241112_fix_caterer_rls_policies.sql
-- This script removes all RLS policies created by that migration

-- ============================================
-- ROLLBACK BOOKINGS TABLE POLICIES
-- ============================================

-- Drop all policies on bookings table
DROP POLICY IF EXISTS "Caterers can view bookings for their packages" ON bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Public can view bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;

-- Note: RLS remains enabled on bookings table
-- If you want to disable RLS completely, uncomment the line below:
-- ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- ============================================
-- ROLLBACK PACKAGES TABLE POLICIES
-- ============================================

-- Drop all policies on packages table
DROP POLICY IF EXISTS "Caterers can view own packages" ON packages;
DROP POLICY IF EXISTS "Public can view active packages" ON packages;
DROP POLICY IF EXISTS "Admins can view all packages" ON packages;
DROP POLICY IF EXISTS "Caterers can update own packages" ON packages;
DROP POLICY IF EXISTS "Caterers can insert own packages" ON packages;

-- Note: RLS remains enabled on packages table
-- If you want to disable RLS completely, uncomment the line below:
-- ALTER TABLE packages DISABLE ROW LEVEL SECURITY;

-- ============================================
-- ROLLBACK USERS TABLE POLICIES
-- ============================================

-- Drop all policies on users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Public can view users" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Note: RLS remains enabled on users table
-- If you want to disable RLS completely, uncomment the line below:
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these queries to verify policies have been removed:
-- SELECT schemaname, tablename, policyname 
-- FROM pg_policies 
-- WHERE tablename IN ('bookings', 'packages', 'users')
-- ORDER BY tablename, policyname;

