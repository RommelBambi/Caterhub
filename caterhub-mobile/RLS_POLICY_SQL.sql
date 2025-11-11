-- ============================================
-- RLS POLICY FIX FOR CUSTOMER VIEWING CATERERS
-- ============================================
-- Copy and paste this into Supabase SQL Editor
-- ============================================

-- Policy 1: Allow public/customers to view APPROVED partner applications
-- This is REQUIRED for customers to see approved caterers
CREATE POLICY "Public can view approved applications"
ON public.partner_applications
FOR SELECT
TO public
USING (status = 'Approved');

-- ============================================
-- VERIFICATION QUERIES (Optional - run to check)
-- ============================================

-- Check if policy was created:
-- SELECT * FROM pg_policies 
-- WHERE tablename = 'partner_applications' 
-- AND policyname = 'Public can view approved applications';

-- Test query (should work for anonymous users):
-- SELECT id, business_name, status, user_id 
-- FROM public.partner_applications 
-- WHERE status = 'Approved';

