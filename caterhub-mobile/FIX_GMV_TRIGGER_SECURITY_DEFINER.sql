-- ============================================
-- FIX update_caterer_gmv FUNCTION TO USE SECURITY DEFINER
-- ============================================
-- This is the RECOMMENDED solution: Make the trigger function
-- run with elevated privileges so it can bypass RLS

-- Step 1: Get the current function definition
-- Run this first to see what the function currently looks like:
/*
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'update_caterer_gmv';
*/

-- Step 2: Recreate the function with SECURITY DEFINER
-- Replace the function body below with the actual function from Step 1
-- but add SECURITY DEFINER and SET search_path = public

CREATE OR REPLACE FUNCTION public.update_caterer_gmv()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- KEY: This allows the function to run with creator's privileges
SET search_path = public  -- Security best practice: set explicit search path
AS $$
DECLARE
  v_caterer_id UUID;
  v_month DATE;
  v_total_gmv NUMERIC(12, 2) := 0;
  v_completed_orders INTEGER := 0;
  v_fee_tier VARCHAR(20) := 'BASE';
  v_fee_percentage NUMERIC(5, 2) := 15.00;
BEGIN
  -- Get caterer_id from the booking's package
  SELECT p.caterer_id INTO v_caterer_id
  FROM public.packages p
  WHERE p.id = NEW.package_id;
  
  -- If no caterer found, exit
  IF v_caterer_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate the month for the GMV record (previous month)
  v_month := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE;
  
  -- Calculate total GMV and completed orders for this caterer in this month
  SELECT 
    COALESCE(SUM(
      COALESCE(deposit_amount, 0) + 
      COALESCE(remaining_amount, 0) + 
      COALESCE(delivery_fee, 0)
    ), 0),
    COUNT(*)
  INTO v_total_gmv, v_completed_orders
  FROM public.bookings b
  WHERE b.status = 'COMPLETED'
    AND b.package_id IN (
      SELECT id FROM public.packages WHERE caterer_id = v_caterer_id
    )
    AND DATE_TRUNC('month', b.updated_at)::DATE = v_month;
  
  -- Determine fee tier based on GMV (example logic - adjust as needed)
  IF v_total_gmv >= 100000 THEN
    v_fee_tier := 'GOLD';
    v_fee_percentage := 10.00;
  ELSIF v_total_gmv >= 50000 THEN
    v_fee_tier := 'SILVER';
    v_fee_percentage := 12.00;
  ELSE
    v_fee_tier := 'BASE';
    v_fee_percentage := 15.00;
  END IF;
  
  -- Insert or update the GMV record
  INSERT INTO public.caterer_monthly_gmv (
    caterer_id,
    month,
    total_gmv,
    completed_orders,
    next_month_fee_tier,
    next_month_fee_percentage,
    updated_at
  )
  VALUES (
    v_caterer_id,
    v_month,
    v_total_gmv,
    v_completed_orders,
    v_fee_tier,
    v_fee_percentage,
    NOW()
  )
  ON CONFLICT (caterer_id, month)
  DO UPDATE SET
    total_gmv = EXCLUDED.total_gmv,
    completed_orders = EXCLUDED.completed_orders,
    next_month_fee_tier = EXCLUDED.next_month_fee_tier,
    next_month_fee_percentage = EXCLUDED.next_month_fee_percentage,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Verify the function was updated
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proowner::regrole as owner,
  prosecdef as security_definer
FROM pg_proc
WHERE proname = 'update_caterer_gmv';

-- The function should now show is_security_definer = true

