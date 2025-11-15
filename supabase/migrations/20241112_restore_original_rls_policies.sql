-- RESTORE ORIGINAL RLS POLICIES
-- This script restores the policies that were dropped by 20241112_fix_caterer_rls_policies.sql
-- Based on the actual policies visible in Supabase dashboard

-- ============================================
-- RESTORE BOOKINGS TABLE POLICIES
-- ============================================

-- First, drop the policies created by the problematic migration
DROP POLICY IF EXISTS "Caterers can view bookings for their packages" ON bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Public can view bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;

-- Restore original bookings policies
-- Admins can delete all bookings
DROP POLICY IF EXISTS "Admins can delete all bookings" ON bookings;
CREATE POLICY "Admins can delete all bookings"
  ON bookings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Admins can update all bookings
DROP POLICY IF EXISTS "Admins can update all bookings" ON bookings;
CREATE POLICY "Admins can update all bookings"
  ON bookings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Caterers can update bookings for their packages
DROP POLICY IF EXISTS "Caterers can update bookings for their packages" ON bookings;
CREATE POLICY "Caterers can update bookings for their packages"
  ON bookings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM packages
      WHERE packages.id = bookings.package_id
      AND packages.caterer_id = auth.uid()
    )
  );

-- Users can create own bookings
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;
CREATE POLICY "Users can create own bookings"
  ON bookings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own bookings
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
CREATE POLICY "Users can update own bookings"
  ON bookings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can update their booking payment info
DROP POLICY IF EXISTS "Users can update their booking payment info" ON bookings;
CREATE POLICY "Users can update their booking payment info"
  ON bookings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can view their payment status
DROP POLICY IF EXISTS "Users can view their payment status" ON bookings;
CREATE POLICY "Users can view their payment status"
  ON bookings
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- RESTORE PACKAGES TABLE POLICIES
-- ============================================

-- First, drop the policies created by the problematic migration
DROP POLICY IF EXISTS "Caterers can view own packages" ON packages;
DROP POLICY IF EXISTS "Public can view active packages" ON packages;
DROP POLICY IF EXISTS "Admins can view all packages" ON packages;
DROP POLICY IF EXISTS "Caterers can update own packages" ON packages;
DROP POLICY IF EXISTS "Caterers can insert own packages" ON packages;

-- Restore original packages policies
-- Caterers can delete own packages
DROP POLICY IF EXISTS "Caterers can delete own packages" ON packages;
CREATE POLICY "Caterers can delete own packages"
  ON packages
  FOR DELETE
  USING (auth.uid() = caterer_id);

-- Customers can view active packages
DROP POLICY IF EXISTS "Customers can view active packages" ON packages;
CREATE POLICY "Customers can view active packages"
  ON packages
  FOR SELECT
  USING (is_active = true);

-- ============================================
-- RESTORE USERS TABLE POLICIES
-- ============================================

-- First, drop the policies created by the problematic migration
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Public can view users" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Restore original users policies
-- Admins can delete all users
DROP POLICY IF EXISTS "Admins can delete all users" ON users;
CREATE POLICY "Admins can delete all users"
  ON users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'ADMIN'
    )
  );

-- Admins can update all users
DROP POLICY IF EXISTS "Admins can update all users" ON users;
CREATE POLICY "Admins can update all users"
  ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'ADMIN'
    )
  );

-- Authenticated users can insert own profile
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON users;
CREATE POLICY "Authenticated users can insert own profile"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Enable insert for new signups
DROP POLICY IF EXISTS "Enable insert for new signups" ON users;
CREATE POLICY "Enable insert for new signups"
  ON users
  FOR INSERT
  WITH CHECK (true);

-- Service role can manage users
DROP POLICY IF EXISTS "Service role can manage users" ON users;
CREATE POLICY "Service role can manage users"
  ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Users can update own profile
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- VERIFICATION
-- ============================================

-- Run this to verify policies are restored:
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies 
-- WHERE tablename IN ('bookings', 'packages', 'users')
-- ORDER BY tablename, policyname;

