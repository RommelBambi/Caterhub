-- Fix bookings table and related views after services table deletion
-- Run this in Supabase SQL Editor

-- Step 1: Drop the foreign key constraint on bookings.service_id
-- Since services table is deleted, we need to remove this constraint
-- Find constraints by checking the column names, not the referenced table
DO $$
DECLARE
    r record;
    constraint_name text;
BEGIN
    -- Find foreign key constraints on bookings table that involve service_id column
    FOR r IN (
        SELECT 
            c.conname,
            a.attname AS column_name
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'public.bookings'::regclass
          AND c.contype = 'f'
          AND a.attname = 'service_id'
    ) LOOP
        BEGIN
            EXECUTE 'ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
            RAISE NOTICE 'Dropped constraint: %', r.conname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop constraint %: %', r.conname, SQLERRM;
        END;
    END LOOP;
END $$;

-- Explicitly try common constraint names
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_service_id_fkey;

ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS fk_bookings_service_id;

-- Force Supabase to refresh schema cache by adding a comment
COMMENT ON TABLE public.bookings IS 'Bookings table - services table removed, using packages only';

-- Step 2: Make service_id nullable (it already is, but ensure it)
-- ALTER TABLE public.bookings ALTER COLUMN service_id DROP NOT NULL; -- Already nullable

-- Step 3: Drop and recreate caterer_earnings view without services table
DROP VIEW IF EXISTS public.caterer_earnings;

CREATE VIEW public.caterer_earnings AS
SELECT
  b.package_id,
  p.caterer_id,
  u.username AS caterer_name,
  COUNT(b.id) AS total_bookings,
  COUNT(
    CASE
      WHEN b.status = 'COMPLETED'::text THEN 1
      ELSE NULL::integer
    END
  ) AS completed_bookings,
  SUM(
    CASE
      WHEN b.deposit_paid THEN b.deposit_amount
      ELSE 0::numeric
    END
  ) AS total_deposits_received,
  SUM(
    CASE
      WHEN b.remaining_paid THEN b.remaining_amount
      ELSE 0::numeric
    END
  ) AS total_remaining_received,
  SUM(b.caterer_payout_amount) AS total_earnings,
  SUM(b.platform_fee_amount) AS total_platform_fees_paid,
  AVG(b.platform_fee_percentage) AS avg_fee_percentage,
  MAX(gmv.next_month_fee_tier::text) AS current_tier
FROM
  bookings b
  LEFT JOIN packages p ON p.id = b.package_id
  LEFT JOIN users u ON u.id = p.caterer_id
  LEFT JOIN caterer_monthly_gmv gmv ON gmv.caterer_id = p.caterer_id
    AND gmv.month = date_trunc('month'::text, CURRENT_DATE - '1 mon'::interval)::date
WHERE
  p.caterer_id IS NOT NULL
GROUP BY
  p.caterer_id,
  u.username,
  b.package_id;

-- Step 4: Drop and recreate caterer_ratings view without services table
DROP VIEW IF EXISTS public.caterer_ratings;

CREATE VIEW public.caterer_ratings AS
SELECT
  r.caterer_id,
  u.username AS caterer_name,
  COUNT(r.id) AS total_reviews,
  ROUND(AVG(r.rating), 2) AS average_rating,
  COUNT(
    CASE
      WHEN r.rating = 5 THEN 1
      ELSE NULL::integer
    END
  ) AS five_star_count,
  COUNT(
    CASE
      WHEN r.rating = 4 THEN 1
      ELSE NULL::integer
    END
  ) AS four_star_count,
  COUNT(
    CASE
      WHEN r.rating = 3 THEN 1
      ELSE NULL::integer
    END
  ) AS three_star_count,
  COUNT(
    CASE
      WHEN r.rating = 2 THEN 1
      ELSE NULL::integer
    END
  ) AS two_star_count,
  COUNT(
    CASE
      WHEN r.rating = 1 THEN 1
      ELSE NULL::integer
    END
  ) AS one_star_count
FROM
  reviews r
  LEFT JOIN users u ON u.id = r.caterer_id
WHERE
  r.caterer_id IS NOT NULL
GROUP BY
  r.caterer_id,
  u.username;

-- Step 5: Drop foreign key constraint on reviews.service_id (if it exists)
ALTER TABLE public.reviews 
DROP CONSTRAINT IF EXISTS reviews_service_id_fkey;

-- Step 6: Drop foreign key constraint on favorites.service_id (if it exists)
ALTER TABLE public.favorites 
DROP CONSTRAINT IF EXISTS favorites_service_id_fkey;

-- Step 7: Fix calculate_booking_amounts function (if it references services table)
-- First, let's check and drop the function if it exists, then recreate it
DROP FUNCTION IF EXISTS public.calculate_booking_amounts() CASCADE;

-- Recreate the function to work with packages instead of services
CREATE OR REPLACE FUNCTION public.calculate_booking_amounts()
RETURNS TRIGGER AS $$
DECLARE
  package_price numeric;
  total_amount numeric;
  platform_fee numeric;
  caterer_payout numeric;
BEGIN
  -- Get package price if package_id is provided
  IF NEW.package_id IS NOT NULL THEN
    SELECT CAST(REPLACE(price, ',', '') AS numeric) INTO package_price
    FROM packages
    WHERE id = NEW.package_id AND is_active = true;
    
    -- Calculate total if we have package price and guests
    IF package_price IS NOT NULL AND NEW.guests > 0 THEN
      total_amount := package_price * NEW.guests;
      
      -- Add delivery fee if set
      IF NEW.delivery_fee IS NOT NULL THEN
        total_amount := total_amount + NEW.delivery_fee;
      END IF;
      
      -- Calculate deposit and remaining if not already set
      IF NEW.deposit_amount IS NULL THEN
        NEW.deposit_amount := ROUND(total_amount * 0.5, 2);
      END IF;
      
      IF NEW.remaining_amount IS NULL THEN
        NEW.remaining_amount := total_amount - COALESCE(NEW.deposit_amount, 0);
      END IF;
    END IF;
  END IF;
  
  -- Calculate platform fee and caterer payout
  IF NEW.deposit_amount IS NOT NULL OR NEW.remaining_amount IS NOT NULL THEN
    total_amount := COALESCE(NEW.deposit_amount, 0) + COALESCE(NEW.remaining_amount, 0);
    
    -- Use platform fee percentage (default 15%)
    IF NEW.platform_fee_percentage IS NULL THEN
      NEW.platform_fee_percentage := 15.00;
    END IF;
    
    -- Calculate platform fee amount
    NEW.platform_fee_amount := ROUND(total_amount * (NEW.platform_fee_percentage / 100), 2);
    
    -- Calculate caterer payout (total - platform fee)
    NEW.caterer_payout_amount := ROUND(total_amount - NEW.platform_fee_amount, 2);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_calculate_booking_amounts ON public.bookings;
CREATE TRIGGER trigger_calculate_booking_amounts
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.calculate_booking_amounts();

-- Step 8: Fix update_caterer_gmv function if it references services
-- This function updates caterer_monthly_gmv when a booking is completed
-- It should get caterer_id from packages instead of services
DROP FUNCTION IF EXISTS public.update_caterer_gmv() CASCADE;

CREATE OR REPLACE FUNCTION public.update_caterer_gmv()
RETURNS TRIGGER AS $$
DECLARE
  v_caterer_id uuid;
  v_month date;
  v_total_gmv numeric;
  v_completed_orders integer;
  v_fee_tier varchar(20);
  v_fee_percentage numeric(5,2);
BEGIN
  -- Only process when status changes to COMPLETED
  IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
    -- Get caterer_id from package
    IF NEW.package_id IS NOT NULL THEN
      SELECT caterer_id INTO v_caterer_id
      FROM packages
      WHERE id = NEW.package_id;
      
      IF v_caterer_id IS NOT NULL THEN
        -- Calculate month for the booking
        v_month := date_trunc('month', NEW.event_date)::date;
        
        -- Calculate total GMV for this booking
        v_total_gmv := COALESCE(NEW.deposit_amount, 0) + COALESCE(NEW.remaining_amount, 0);
        
        -- Get or create monthly GMV record
        INSERT INTO caterer_monthly_gmv (caterer_id, month, total_gmv, completed_orders)
        VALUES (v_caterer_id, v_month, v_total_gmv, 1)
        ON CONFLICT (caterer_id, month)
        DO UPDATE SET
          total_gmv = caterer_monthly_gmv.total_gmv + v_total_gmv,
          completed_orders = caterer_monthly_gmv.completed_orders + 1,
          updated_at = now();
        
        -- Update fee tier based on GMV (simplified logic)
        SELECT total_gmv INTO v_total_gmv
        FROM caterer_monthly_gmv
        WHERE caterer_id = v_caterer_id AND month = v_month;
        
        -- Determine fee tier based on GMV
        IF v_total_gmv >= 100000 THEN
          v_fee_tier := 'PREMIUM';
          v_fee_percentage := 10.00;
        ELSIF v_total_gmv >= 50000 THEN
          v_fee_tier := 'GOLD';
          v_fee_percentage := 12.00;
        ELSE
          v_fee_tier := 'BASE';
          v_fee_percentage := 15.00;
        END IF;
        
        -- Update next month's fee tier
        UPDATE caterer_monthly_gmv
        SET next_month_fee_tier = v_fee_tier,
            next_month_fee_percentage = v_fee_percentage
        WHERE caterer_id = v_caterer_id AND month = v_month;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_update_caterer_gmv ON public.bookings;
CREATE TRIGGER trigger_update_caterer_gmv
AFTER UPDATE ON public.bookings
FOR EACH ROW
WHEN (NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED'))
EXECUTE FUNCTION public.update_caterer_gmv();

-- Step 9: Fix update_booking_on_payment function if it references services
-- This function should be fine as it only works with bookings table
-- But let's verify it doesn't reference services
-- (If you have issues, you may need to check and update this function separately)

-- Note: The favorites and reviews tables can keep service_id as a nullable field
-- for backward compatibility, but it won't reference the services table anymore

