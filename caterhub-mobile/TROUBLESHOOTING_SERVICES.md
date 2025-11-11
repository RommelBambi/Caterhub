# Troubleshooting: Services and Packages Not Showing

## Issue
When customers view the app, available caterers and their packages are not showing.

## Possible Causes & Solutions

### 1. **Services Don't Have `user_id` Set**
**Problem**: Services exist in the database but don't have a `user_id` field set, which means packages cannot be fetched (packages are linked via `packages.caterer_id = services.user_id`).

**Solution**: 
- Update all services in the database to link them to their caterer:
  ```sql
  -- Find services without user_id
  SELECT id, name, user_id FROM services WHERE user_id IS NULL;
  
  -- Update services to link to caterer (replace with actual caterer user_id)
  UPDATE services 
  SET user_id = '<caterer_user_id>' 
  WHERE id = <service_id>;
  ```

### 2. **No Services in Database**
**Problem**: The `services` table is empty.

**Solution**:
- Check if services exist:
  ```sql
  SELECT COUNT(*) FROM services;
  ```
- If empty, caterers need to create services through the partner dashboard or admin needs to create test services.

### 3. **No Packages Created**
**Problem**: Services exist and have `user_id`, but caterers haven't created any packages yet.

**Solution**:
- Caterers need to go to "Manage Packages" in their dashboard and create packages.
- Check if packages exist:
  ```sql
  SELECT COUNT(*) FROM packages WHERE is_active = true;
  ```

### 4. **Row Level Security (RLS) Policies**
**Problem**: RLS policies might be blocking anonymous users from reading services.

**Solution**:
- Ensure RLS policies allow SELECT for services:
  ```sql
  -- Check current policies
  SELECT * FROM pg_policies WHERE tablename = 'services';
  
  -- Example policy to allow public read access
  CREATE POLICY "Allow public read access to services"
  ON services FOR SELECT
  TO public
  USING (true);
  ```

### 5. **Packages Not Active**
**Problem**: Packages exist but `is_active = false`.

**Solution**:
- Check package status:
  ```sql
  SELECT id, name, is_active, caterer_id FROM packages;
  ```
- Activate packages:
  ```sql
  UPDATE packages SET is_active = true WHERE id = '<package_id>';
  ```

## Debugging Steps

1. **Check Console Logs**: The app now includes detailed logging:
   - `[fetchServices]` - Shows how many services were fetched
   - `[fetchTopServices]` - Shows top services
   - `[fetchPackagesForService]` - Shows package fetching
   - `[HomeScreen]` - Shows service loading status

2. **Check Database Directly**:
   ```sql
   -- Count services
   SELECT COUNT(*) as service_count FROM services;
   
   -- Count services with user_id
   SELECT COUNT(*) as services_with_caterer 
   FROM services WHERE user_id IS NOT NULL;
   
   -- Count active packages
   SELECT COUNT(*) as active_packages 
   FROM packages WHERE is_active = true;
   
   -- Check service-package linkage
   SELECT 
     s.id as service_id,
     s.name as service_name,
     s.user_id as service_user_id,
     COUNT(p.id) as package_count
   FROM services s
   LEFT JOIN packages p ON p.caterer_id = s.user_id AND p.is_active = true
   GROUP BY s.id, s.name, s.user_id;
   ```

3. **Check Browser/App Console**:
   - Open developer tools
   - Look for errors in the console
   - Check network requests to Supabase

## Quick Fixes

### Fix 1: Link Existing Services to Caterers
If you have services but they're not linked to caterers:

```sql
-- First, find which caterers exist
SELECT id, username, email, role FROM users WHERE role = 'CATER';

-- Then link services to caterers (adjust as needed)
-- Option A: Link all services to a specific caterer (for testing)
UPDATE services 
SET user_id = (SELECT id FROM users WHERE role = 'CATER' LIMIT 1)
WHERE user_id IS NULL;

-- Option B: Link services manually based on business logic
UPDATE services 
SET user_id = '<specific_caterer_user_id>'
WHERE id = <specific_service_id>;
```

### Fix 2: Create Test Data
If the database is empty, create test services and packages:

```sql
-- Create a test caterer (if doesn't exist)
-- Note: This requires auth.users entry first

-- Create a test service
INSERT INTO services (name, description, price_per_head, user_id)
VALUES (
  'Test Catering Service',
  'A test catering service for development',
  250.00,
  '<caterer_user_id>'
);

-- Create a test package for the service
INSERT INTO packages (caterer_id, name, price, sections, inclusions, is_active)
VALUES (
  '<caterer_user_id>',
  'Basic Package',
  '₱250/head',
  '[{"category": "pork", "dishes": ["Pork Adobo", "Lechon Kawali"]}, {"category": "chicken", "dishes": ["Chicken BBQ", "Chicken Curry"]}]'::jsonb,
  '[{"name": "Rice", "price": "Included"}, {"name": "Drinks", "price": "Included"}]'::jsonb,
  true
);
```

## What Was Fixed in the Code

1. ✅ Fixed `searchServices()` query syntax (was using incorrect `.or()` format)
2. ✅ Added comprehensive error logging throughout service fetching
3. ✅ Added empty state UI when no services are found
4. ✅ Added warning message when service doesn't have `user_id` (packages won't show)
5. ✅ Improved error handling to show alerts to users instead of silently failing

## Next Steps

1. Check the browser/app console for the new debug logs
2. Verify services exist in the database and have `user_id` set
3. Verify packages exist and are active
4. Check RLS policies if services still don't show
5. If services show but packages don't, check that `services.user_id` matches `packages.caterer_id`

