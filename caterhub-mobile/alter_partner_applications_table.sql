-- Alter partner_applications table to match new schema
-- This removes unused fields and adds the uploaded_documents field

-- Add the new uploaded_documents column
ALTER TABLE public.partner_applications 
ADD COLUMN IF NOT EXISTS uploaded_documents TEXT[] DEFAULT '{}';

-- Remove unused columns
ALTER TABLE public.partner_applications 
DROP COLUMN IF EXISTS cuisine_categories,
DROP COLUMN IF EXISTS bank_name,
DROP COLUMN IF EXISTS bank_account_name,
DROP COLUMN IF EXISTS bank_account_number,
DROP COLUMN IF EXISTS min_guests,
DROP COLUMN IF EXISTS max_guests,
DROP COLUMN IF EXISTS packages,
DROP COLUMN IF EXISTS hours,
DROP COLUMN IF EXISTS sample_menu,
DROP COLUMN IF EXISTS resume_url,
DROP COLUMN IF EXISTS resume_name;

