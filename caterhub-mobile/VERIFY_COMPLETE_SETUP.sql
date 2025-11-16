-- ============================================
-- VERIFY COMPLETE WITHDRAWAL SETUP
-- ============================================
-- Run this to verify everything is set up correctly

-- 1. Verify table structure (should return 12 rows)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'withdrawal_requests'
ORDER BY ordinal_position;

-- 2. Verify indexes (should return 5 indexes)
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'withdrawal_requests'
  AND schemaname = 'public'
ORDER BY indexname;

-- 3. Verify RLS policies (should return 5 policies)
SELECT 
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as has_using,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as has_with_check
FROM pg_policies
WHERE tablename = 'withdrawal_requests'
  AND schemaname = 'public'
ORDER BY policyname, cmd;

-- 4. Verify trigger exists (should return 1 trigger)
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'withdrawal_requests'
  AND event_object_schema = 'public';

-- 5. Verify function exists
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'update_withdrawal_requests_updated_at';

-- 6. Verify RLS is enabled on the table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'withdrawal_requests';

-- Expected Results Summary:
-- ✅ 12 columns in withdrawal_requests table
-- ✅ 5 indexes created
-- ✅ 5 RLS policies created (SELECT, INSERT, UPDATE for caterers and admins)
-- ✅ 1 trigger for auto-updating updated_at
-- ✅ 1 function for the trigger
-- ✅ RLS enabled on the table

-- If all checks pass, your database setup is complete! ✅

