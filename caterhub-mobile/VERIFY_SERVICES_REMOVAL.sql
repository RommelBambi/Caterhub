-- Verification and Cleanup Script for Services Table Removal
-- Run this AFTER running FIX_BOOKINGS_AFTER_SERVICES_DELETE.sql
-- This verifies that all services table references are removed

-- 1. Check if foreign key constraint still exists
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conrelid = 'public.bookings'::regclass
  AND confrelid = 'public.services'::regclass;

-- If the above query returns any rows, the constraint still exists
-- You can drop it manually with:
-- ALTER TABLE public.bookings DROP CONSTRAINT <constraint_name>;

-- 2. Check for any views that reference services table
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
  AND definition LIKE '%services%';

-- 3. Check for any functions that reference services table
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) LIKE '%services%';

-- 4. Verify bookings table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bookings'
  AND column_name = 'service_id';

-- Expected result: service_id should exist as integer (nullable)
-- But there should be NO foreign key constraint

-- 5. Force Supabase to refresh schema cache (if using Supabase)
-- Note: Supabase automatically refreshes, but you can trigger a refresh by:
-- - Making any small change to a table (like adding a comment)
-- - Or waiting a few minutes for automatic refresh

COMMENT ON TABLE public.bookings IS 'Bookings table - services table removed, using packages only';

