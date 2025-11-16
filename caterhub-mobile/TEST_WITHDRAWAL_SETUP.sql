-- ============================================
-- TEST WITHDRAWAL SETUP
-- ============================================
-- Run this to verify the withdrawal_requests table is set up correctly

-- 1. Check table exists and has correct structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'withdrawal_requests'
ORDER BY ordinal_position;

-- 2. Check indexes exist
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'withdrawal_requests'
  AND schemaname = 'public';

-- 3. Check RLS policies exist
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'withdrawal_requests'
  AND schemaname = 'public';

-- 4. Check trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'withdrawal_requests'
  AND event_object_schema = 'public';

-- 5. Test insert (will fail if RLS is blocking, which is expected for non-authenticated)
-- This is just to verify the table structure accepts the data format
-- Note: This will fail without authentication, which is correct behavior
/*
INSERT INTO withdrawal_requests (
  caterer_id,
  amount,
  payment_method,
  payment_details,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  100.00,
  'gcash',
  '{"accountName": "Test", "mobileNumber": "09123456789"}'::jsonb,
  'PENDING'
);
*/

-- Expected Results:
-- ✅ 12 columns in the table
-- ✅ 5 indexes created
-- ✅ 5 RLS policies created
-- ✅ 1 trigger for updated_at

