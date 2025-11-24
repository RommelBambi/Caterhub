# Storage Bucket Setup Guide

## Issue: "Bucket not found" Error

If you're seeing the error `{"statusCode":"404","error":"Bucket not found","message":"Bucket not found"}`, it means the `partner-documents` storage bucket doesn't exist in your Supabase project.

## Solution: Create the Storage Bucket

### Steps:

1. **Go to Supabase Dashboard**
   - Navigate to your Supabase project
   - Click on "Storage" in the left sidebar

2. **Create New Bucket**
   - Click the "New bucket" button
   - Name: `partner-documents`
   - **Public bucket**: You can choose either:
     - **Public**: Files are accessible via public URLs (simpler, but less secure)
     - **Private**: Files require signed URLs (more secure, recommended)

3. **Configure Bucket Settings** (if private):
   - If you choose private, the app will automatically use signed URLs
   - Make sure RLS policies allow authenticated users to upload/download

4. **Set RLS Policies** (Recommended):

   ```sql
   -- Allow authenticated users to upload files
   CREATE POLICY "Users can upload their own documents"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'partner-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

   -- Allow authenticated users to read their own files
   CREATE POLICY "Users can read their own documents"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (bucket_id = 'partner-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

   -- Allow admins to read all files
   CREATE POLICY "Admins can read all documents"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (
     bucket_id = 'partner-documents' AND
     EXISTS (
       SELECT 1 FROM public.users
       WHERE users.id = auth.uid() AND users.role = 'ADMIN'
     )
   );

   -- Allow users to delete their own files
   CREATE POLICY "Users can delete their own documents"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (bucket_id = 'partner-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
   ```

5. **Test the Bucket**
   - After creating the bucket, try viewing a document in the admin panel
   - The error should be resolved

## Alternative: Use Existing Bucket

If you already have a bucket with a different name, you can update the code to use that bucket name instead. Search for `'partner-documents'` in the codebase and replace it with your bucket name.

## File Structure

The app stores files in the following structure:
```
partner-documents/
  └── {user_id}/
      └── {timestamp}-{filename}
```

This ensures each user's files are organized in their own folder.

