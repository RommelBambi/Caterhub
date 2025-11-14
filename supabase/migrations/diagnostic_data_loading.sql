-- Diagnostic queries to identify data loading issues
-- Run these queries in Supabase SQL editor to diagnose problems

-- 1. Check if services table exists and has data
SELECT 
  schemaname, 
  tablename, 
  tableowner 
FROM pg_tables 
WHERE tablename = 'services';

-- 2. Check support_tickets RLS policies
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
WHERE tablename = 'support_tickets';

-- 3. Check if there are any support tickets in the database
SELECT 
  COUNT(*) as total_tickets,
  COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open_tickets,
  COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_tickets,
  COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved_tickets
FROM support_tickets;

-- 4. Check bookings table structure and sample data
SELECT 
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN payment_status = 'COMPLETED' THEN 1 END) as completed_payments,
  COUNT(CASE WHEN payment_status = 'PENDING' THEN 1 END) as pending_payments,
  COUNT(CASE WHEN service_id IS NOT NULL THEN 1 END) as bookings_with_service_id,
  COUNT(CASE WHEN package_id IS NOT NULL THEN 1 END) as bookings_with_package_id
FROM bookings;

-- 5. Check packages table and caterer relationships
SELECT 
  COUNT(*) as total_packages,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_packages,
  COUNT(DISTINCT caterer_id) as unique_caterers
FROM packages;

-- 6. Check users table for admin roles
SELECT 
  role,
  COUNT(*) as user_count,
  COUNT(CASE WHEN suspended = true THEN 1 END) as suspended_count
FROM users 
GROUP BY role;

-- 7. Test the exact query from TicketsPage.tsx
SELECT 
  st.*,
  u.id as user_id,
  u.username,
  u.email,
  b.id as booking_id,
  b.event_date,
  b.status as booking_status
FROM support_tickets st
LEFT JOIN users u ON u.id = st.user_id
LEFT JOIN bookings b ON b.id = st.booking_id
ORDER BY st.created_at DESC
LIMIT 5;

-- 8. Test the exact query from PaymentsPage.tsx (without services join)
SELECT 
  b.*,
  u.id as user_id,
  u.username,
  u.email,
  p.id as package_id,
  p.name as package_name,
  p.price as package_price
FROM bookings b
LEFT JOIN users u ON u.id = b.user_id
LEFT JOIN packages p ON p.id = b.package_id
ORDER BY b.created_at DESC
LIMIT 5;

-- 9. Check for any missing foreign key relationships
SELECT 
  COUNT(*) as bookings_with_invalid_user_id
FROM bookings b
LEFT JOIN users u ON u.id = b.user_id
WHERE b.user_id IS NOT NULL AND u.id IS NULL;

SELECT 
  COUNT(*) as bookings_with_invalid_package_id
FROM bookings b
LEFT JOIN packages p ON p.id = b.package_id
WHERE b.package_id IS NOT NULL AND p.id IS NULL;

-- 10. Check current user and permissions (run this as the admin user)
SELECT 
  current_user as current_db_user,
  session_user as session_db_user,
  current_setting('role') as current_role;

-- Check auth.users vs users table sync
SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM users) as public_users_count,
  (SELECT COUNT(*) FROM auth.users au WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = au.id)) as unsynced_auth_users;
