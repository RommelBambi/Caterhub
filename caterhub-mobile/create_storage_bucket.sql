-- Create storage bucket for partner documents
-- Run this in Supabase SQL Editor

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partner-documents',
  'partner-documents',
  false, -- Private bucket (files are not publicly accessible)
  10485760, -- 10MB file size limit (in bytes)
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for partner-documents bucket

-- Policy: Users can upload files to their own folder
CREATE POLICY "Users can upload own documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'partner-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view their own uploaded files
CREATE POLICY "Users can view own documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'partner-documents' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Admins can view all files
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  )
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'partner-documents' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Admins can delete any file
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  )
);

-- Policy: Admins can upload any file
CREATE POLICY "Admins can upload documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'partner-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  )
);

-- Policy: Admins can view all files
CREATE POLICY "Admins can view all documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'partner-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  )
);

-- Policy: Admins can delete any file
CREATE POLICY "Admins can delete all documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'partner-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  )
);

