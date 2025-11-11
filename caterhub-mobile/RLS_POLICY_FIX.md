# RLS Policy Fix Required

## Problem
Customers cannot see approved caterers because the RLS policy on `partner_applications` only allows users to view their **own** applications, not approved ones.

## Current RLS Policy Issue

**`partner_applications` table:**
- ❌ "Users can view own applications" - Only allows viewing your own application
- ❌ **Missing:** Policy to allow customers/public to view **approved** applications

## Required RLS Policy

You need to add a new RLS policy to the `partner_applications` table:

### Policy Name: "Public can view approved applications"
- **Command:** `SELECT`
- **Applied To:** `public` (or `anon` if using Supabase's default roles)
- **USING clause:**
  ```sql
  status = 'Approved'
  ```

### SQL to Create the Policy:

```sql
CREATE POLICY "Public can view approved applications"
ON public.partner_applications
FOR SELECT
TO public
USING (status = 'Approved');
```

Or if you're using Supabase's `anon` role:

```sql
CREATE POLICY "Public can view approved applications"
ON public.partner_applications
FOR SELECT
TO anon
USING (status = 'Approved');
```

## What Changed in the Code

1. ✅ **Removed dependency on `services` table** - Services are now derived directly from `partner_applications`
2. ✅ **Fetch directly from `partner_applications`** - No database inserts needed
3. ✅ **Hash-based service IDs** - Generated from `user_id` for consistency
4. ✅ **Caterer profiles and locations** - Fetched from `caterer_profiles` and `partner_applications.locations`

## How It Works Now

1. `fetchServices()` → Fetches approved `partner_applications`
2. Converts each approved application to a `Service` object
3. Fetches `caterer_profiles` for each caterer
4. Extracts locations from `partner_applications.locations`
5. Packages are fetched via `packages.caterer_id = partner_applications.user_id`

## Testing

After adding the RLS policy:
1. Refresh the app
2. Check console logs - should show approved applications found
3. Services should appear on customer home screen
4. Each service should show packages when viewing details

