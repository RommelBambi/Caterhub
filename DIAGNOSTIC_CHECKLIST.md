# Admin Update Issue - Diagnostic Checklist

Please provide the following information to diagnose why you can't update application status:

## 1. Run the Comprehensive Diagnostic Script

Run this SQL script in your Supabase SQL Editor:
- File: `supabase/migrations/20251125_comprehensive_admin_diagnostic.sql`

**Provide the results from each section**, especially:
- Section 1: What is your user role? (Should be 'ADMIN')
- Section 2: List all policies shown
- Section 3: What are the USING and WITH CHECK clauses for UPDATE policies?
- Section 4: Does the admin policy evaluate to TRUE?
- Section 10: Is RLS enabled?

## 2. Check Browser Console Error

When you try to approve an application:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try to approve an application
4. **Copy and paste the ENTIRE error message** from the console

Look for lines that start with:
- `[Admin] Error approving application:`
- `[Admin] Error code:`
- `[Admin] Error message:`
- `[Admin] Error details:`

## 3. Verify Your Admin Status

Run this query and provide the result:
```sql
SELECT 
  id,
  email,
  username,
  role,
  created_at
FROM public.users
WHERE id = auth.uid();
```

**What role does it show?** (Should be 'ADMIN')

## 4. Test Update Directly in SQL

Run this (replace `APPLICATION_ID_HERE` with an actual pending application ID):
```sql
UPDATE public.partner_applications
SET status = 'Approved', updated_at = NOW()
WHERE id = 'APPLICATION_ID_HERE'::uuid
RETURNING id, business_name, status;
```

**What happens?**
- Does it succeed?
- Does it show an error? If yes, what's the exact error message?

## 5. Check All UPDATE Policies

Run this and provide the full output:
```sql
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'partner_applications'
  AND cmd = 'UPDATE'
ORDER BY policyname;
```

**Provide the complete output** - especially the `using_clause` and `with_check_clause` for each policy.

## 6. Check Policy Definitions (Detailed)

Run this and provide the output:
```sql
SELECT 
  p.policyname,
  p.cmd,
  pg_get_expr(p.qual, p.polrelid) as using_expression,
  pg_get_expr(p.withcheck, p.polrelid) as with_check_expression
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'partner_applications'
  AND p.polcmd = 'r'  -- 'r' = UPDATE
ORDER BY p.policyname;
```

## 7. Test Policy Evaluation

Run this and tell me what it returns:
```sql
SELECT 
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  ) as is_admin,
  auth.uid() as current_user_id;
```

**What does `is_admin` show?** (Should be `true`)

## 8. Application Details

Provide:
- Application ID you're trying to update
- Current status of that application
- The user_id of that application

## 9. Supabase Client Configuration

Check if you're using the correct Supabase client:
- Are you logged in through the web interface?
- What email are you logged in with?
- Is it the same email that has role='ADMIN' in the users table?

---

## Quick Test Script

Run this all-in-one test and provide the complete output:

```sql
-- Quick comprehensive test
SELECT 
  '=== ADMIN CHECK ===' as test,
  auth.uid() as user_id,
  u.role,
  CASE WHEN u.role = 'ADMIN' THEN '✅' ELSE '❌' END as admin_status
FROM public.users u
WHERE u.id = auth.uid();

SELECT 
  '=== UPDATE POLICIES ===' as test,
  policyname,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'partner_applications' AND cmd = 'UPDATE';

SELECT 
  '=== RLS STATUS ===' as test,
  rowsecurity as enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'partner_applications';
```

Provide all the results from the above, and I'll identify the exact issue!


