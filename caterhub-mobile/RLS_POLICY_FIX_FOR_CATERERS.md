# RLS Policy Fix for Caterer Orders

## Problem
Caterers cannot see orders in their `PartnerOrdersScreen` because Row-Level Security (RLS) policies on the `bookings` table are blocking access.

## Root Cause
The current RLS policy on `bookings` likely only allows:
- Customers to see their own bookings (`user_id = auth.uid()`)
- Admins to see all bookings

But it **does NOT allow caterers to see bookings for their packages**.

## Solution
Add an RLS policy that allows caterers to view bookings where the booking's `package_id` belongs to one of their packages.

## SQL Fix

Run this SQL in your Supabase SQL Editor:

```sql
-- Drop existing policy if it exists (optional, for clean slate)
DROP POLICY IF EXISTS "Caterers can view bookings for their packages" ON bookings;

-- Create policy for caterers to view bookings for their packages
CREATE POLICY "Caterers can view bookings for their packages"
ON bookings
FOR SELECT
TO authenticated
USING (
  -- Allow if user is a caterer AND the booking's package belongs to them
  EXISTS (
    SELECT 1
    FROM packages
    WHERE packages.id = bookings.package_id
      AND packages.caterer_id = auth.uid()
  )
);
```

## Alternative: More Comprehensive Policy

If you want caterers to also be able to UPDATE bookings (for status changes, delivery fees, etc.):

```sql
-- Policy for SELECT (viewing)
DROP POLICY IF EXISTS "Caterers can view bookings for their packages" ON bookings;
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

-- Policy for UPDATE (changing status, delivery fee, etc.)
DROP POLICY IF EXISTS "Caterers can update bookings for their packages" ON bookings;
CREATE POLICY "Caterers can update bookings for their packages"
ON bookings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM packages
    WHERE packages.id = bookings.package_id
      AND packages.caterer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM packages
    WHERE packages.id = bookings.package_id
      AND packages.caterer_id = auth.uid()
  )
);
```

## Verify Current Policies

To see what policies currently exist on the `bookings` table:

```sql
-- View all policies on bookings table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'bookings';
```

## Expected Behavior After Fix

After applying the fix:
1. ✅ Caterers can view bookings where `package_id` belongs to their packages
2. ✅ Customers can still view their own bookings (existing policy)
3. ✅ Admins can view all bookings (existing policy)
4. ✅ Caterers can update booking status, delivery fees, etc. (if UPDATE policy is added)

## Testing

After applying the fix, test by:

1. **Login as a caterer** in the app
2. **Navigate to Partner Orders screen**
3. **Verify orders appear** for bookings that use the caterer's packages

If orders still don't appear, check:

1. **Console logs** - Look for RLS-related errors in browser/device console
2. **Package ownership** - Verify packages have `caterer_id` set correctly:
   ```sql
   SELECT id, name, caterer_id 
   FROM packages 
   WHERE caterer_id = '<caterer_user_id>';
   ```
3. **Booking package links** - Verify bookings have `package_id` set:
   ```sql
   SELECT id, package_id, user_id, status 
   FROM bookings 
   WHERE package_id IN (
     SELECT id FROM packages WHERE caterer_id = '<caterer_user_id>'
   );
   ```

## Additional RLS Policies Needed

While fixing the bookings policy, also ensure these policies exist:

### 1. Packages Table - Caterers can view/edit their own packages
```sql
-- View own packages
CREATE POLICY "Caterers can view their packages"
ON packages
FOR SELECT
TO authenticated
USING (caterer_id = auth.uid());

-- Update own packages
CREATE POLICY "Caterers can update their packages"
ON packages
FOR UPDATE
TO authenticated
USING (caterer_id = auth.uid())
WITH CHECK (caterer_id = auth.uid());

-- Insert own packages
CREATE POLICY "Caterers can insert their packages"
ON packages
FOR INSERT
TO authenticated
WITH CHECK (caterer_id = auth.uid());

-- Delete own packages
CREATE POLICY "Caterers can delete their packages"
ON packages
FOR DELETE
TO authenticated
USING (caterer_id = auth.uid());
```

### 2. Partner Applications - Public can view approved applications
```sql
CREATE POLICY "Public can view approved applications"
ON partner_applications
FOR SELECT
TO authenticated
USING (status = 'Approved');
```

### 3. Caterer Profiles - Public can view all profiles
```sql
CREATE POLICY "Public can view caterer profiles"
ON caterer_profiles
FOR SELECT
TO authenticated
USING (true);
```

## Quick Fix Script

Run this complete script to fix all RLS issues for caterers:

```sql
-- ============================================
-- RLS POLICIES FOR CATERERS - COMPLETE FIX
-- ============================================

-- 1. Bookings: Caterers can view bookings for their packages
DROP POLICY IF EXISTS "Caterers can view bookings for their packages" ON bookings;
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

-- 2. Bookings: Caterers can update bookings for their packages
DROP POLICY IF EXISTS "Caterers can update bookings for their packages" ON bookings;
CREATE POLICY "Caterers can update bookings for their packages"
ON bookings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM packages
    WHERE packages.id = bookings.package_id
      AND packages.caterer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM packages
    WHERE packages.id = bookings.package_id
      AND packages.caterer_id = auth.uid()
  )
);

-- 3. Packages: Caterers can manage their own packages
DROP POLICY IF EXISTS "Caterers can view their packages" ON packages;
CREATE POLICY "Caterers can view their packages"
ON packages
FOR SELECT
TO authenticated
USING (caterer_id = auth.uid());

DROP POLICY IF EXISTS "Caterers can update their packages" ON packages;
CREATE POLICY "Caterers can update their packages"
ON packages
FOR UPDATE
TO authenticated
USING (caterer_id = auth.uid())
WITH CHECK (caterer_id = auth.uid());

DROP POLICY IF EXISTS "Caterers can insert their packages" ON packages;
CREATE POLICY "Caterers can insert their packages"
ON packages
FOR INSERT
TO authenticated
WITH CHECK (caterer_id = auth.uid());

DROP POLICY IF EXISTS "Caterers can delete their packages" ON packages;
CREATE POLICY "Caterers can delete their packages"
ON packages
FOR DELETE
TO authenticated
USING (caterer_id = auth.uid());

-- 4. Partner Applications: Public can view approved
DROP POLICY IF EXISTS "Public can view approved applications" ON partner_applications;
CREATE POLICY "Public can view approved applications"
ON partner_applications
FOR SELECT
TO authenticated
USING (status = 'Approved');

-- 5. Caterer Profiles: Public can view all
DROP POLICY IF EXISTS "Public can view caterer profiles" ON caterer_profiles;
CREATE POLICY "Public can view caterer profiles"
ON caterer_profiles
FOR SELECT
TO authenticated
USING (true);

-- Verify policies were created
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN ('bookings', 'packages', 'partner_applications', 'caterer_profiles')
ORDER BY tablename, policyname;
```

## Notes

- **RLS must be enabled** on the tables for policies to work:
  ```sql
  ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
  ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;
  ALTER TABLE caterer_profiles ENABLE ROW LEVEL SECURITY;
  ```

- **Service Role Key** bypasses RLS - if your code uses service role key, RLS won't apply. The mobile app should use the **anon key** with user authentication.

- **Test with real user** - Make sure you're testing with an authenticated caterer user, not service role.

