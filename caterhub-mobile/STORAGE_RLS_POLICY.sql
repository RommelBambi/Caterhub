-- RLS Policies for Supabase Storage Bucket: avatars
-- This allows users to upload and manage their own profile images
-- 
-- IMPORTANT: Run these in the Supabase SQL Editor
-- Make sure the 'avatars' bucket exists first!

-- Step 1: Enable RLS on storage.objects (if not already enabled)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if they exist (optional, for clean setup)
-- DROP POLICY IF EXISTS "Users can upload to own profile folder" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can update own profile files" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can delete own profile files" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can read own profile files" ON storage.objects;
-- DROP POLICY IF EXISTS "Public can read profile images" ON storage.objects;

-- Policy 1: Users can upload files to their own profile folder
CREATE POLICY "Users can upload to own profile folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'profiles' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 2: Users can update files in their own profile folder
CREATE POLICY "Users can update own profile files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'profiles' AND
  (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'profiles' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 3: Users can delete files from their own profile folder
CREATE POLICY "Users can delete own profile files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'profiles' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 4: Users can read (view) files from their own profile folder
CREATE POLICY "Users can read own profile files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'profiles' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 5: Public can read profile images (for displaying to customers)
-- This allows anyone to view profile images without authentication
CREATE POLICY "Public can read profile images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'profiles'
);

