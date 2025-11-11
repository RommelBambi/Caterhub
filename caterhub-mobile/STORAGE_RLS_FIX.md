# Storage RLS Policy Fix for Profile Image Upload

## Problem
When trying to upload a profile image on the web, you get this error:
```
StorageApiError: new row violates row-level security policy
```

This happens because the Supabase Storage bucket `avatars` doesn't have RLS policies that allow authenticated users to upload files.

## Solution

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**

### Step 2: Run the RLS Policies
Copy and paste the SQL from `STORAGE_RLS_POLICY.sql` into the SQL Editor and run it.

The policies will:
- Allow authenticated users to upload to their own profile folder (`profiles/{user_id}/`)
- Allow users to update/delete their own profile images
- Allow public to read profile images (so customers can see caterer profile images)

### Step 3: Verify the Bucket Exists
Make sure the `avatars` bucket exists in your Supabase Storage:
1. Go to **Storage** in Supabase Dashboard
2. Check if `avatars` bucket exists
3. If not, create it:
   - Click **New bucket**
   - Name: `avatars`
   - Public: Yes (so profile images can be viewed)
   - File size limit: 5MB (or your preferred limit)
   - Allowed MIME types: `image/*`

### Step 4: Test the Upload
After adding the policies, try uploading a profile image again. It should work now!

## Additional Fixes Applied

The code has also been updated to:
1. **Refresh session before upload** - Fixes "Invalid Refresh Token" errors
2. **Better error messages** - Shows clear messages if RLS policies are missing
3. **Use `upsert: true`** - Allows overwriting existing profile images

## Troubleshooting

If you still get errors:
1. Check that RLS is enabled on `storage.objects` table
2. Verify the bucket name is exactly `avatars`
3. Check that the user is authenticated (logged in)
4. Verify the file path format: `profiles/{user_id}/profile-{timestamp}.jpg`

