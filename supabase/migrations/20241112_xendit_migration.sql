-- Migration: Add Xendit support to replace PayMongo
-- Date: 2024-11-12
-- Description: Add Xendit-specific columns and update existing tables

-- Add Xendit columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS xendit_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS xendit_charge_id TEXT,
ADD COLUMN IF NOT EXISTS xendit_external_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_xendit_invoice_id ON bookings(xendit_invoice_id);
CREATE INDEX IF NOT EXISTS idx_bookings_xendit_charge_id ON bookings(xendit_charge_id);
CREATE INDEX IF NOT EXISTS idx_bookings_xendit_external_id ON bookings(xendit_external_id);

-- Update payment_webhooks table for Xendit support
ALTER TABLE payment_webhooks 
ADD COLUMN IF NOT EXISTS xendit_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS xendit_charge_id TEXT,
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Add index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_xendit_invoice_id ON payment_webhooks(xendit_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_xendit_charge_id ON payment_webhooks(xendit_charge_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);

-- Add comments for documentation
COMMENT ON COLUMN bookings.xendit_invoice_id IS 'Xendit Invoice ID for multi-payment method checkout';
COMMENT ON COLUMN bookings.xendit_charge_id IS 'Xendit eWallet Charge ID for direct eWallet payments';
COMMENT ON COLUMN bookings.xendit_external_id IS 'External ID used to link Xendit transactions to bookings';

COMMENT ON COLUMN payment_webhooks.xendit_invoice_id IS 'Xendit Invoice ID from webhook payload';
COMMENT ON COLUMN payment_webhooks.xendit_charge_id IS 'Xendit Charge ID from webhook payload';
COMMENT ON COLUMN payment_webhooks.external_id IS 'External ID from webhook payload for transaction matching';

-- Create a view for payment status tracking
CREATE OR REPLACE VIEW payment_status_view AS
SELECT 
    b.id as booking_id,
    b.payment_method,
    b.payment_status,
    b.deposit_paid,
    b.remaining_paid,
    -- PayMongo fields (legacy)
    b.payment_intent_id,
    b.payment_source_id,
    -- Xendit fields (new)
    b.xendit_invoice_id,
    b.xendit_charge_id,
    b.xendit_external_id,
    b.paid_at,
    b.created_at,
    b.updated_at
FROM bookings b
WHERE b.payment_method IS NOT NULL;

COMMENT ON VIEW payment_status_view IS 'Unified view for tracking payment status across PayMongo and Xendit';

-- Update RLS policies if needed (assuming they exist)
-- Note: Adjust these based on your existing RLS setup

-- Allow users to read their own payment status
DROP POLICY IF EXISTS "Users can view their payment status" ON bookings;
CREATE POLICY "Users can view their payment status" ON bookings
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to update their own booking payment info
DROP POLICY IF EXISTS "Users can update their booking payment info" ON bookings;
CREATE POLICY "Users can update their booking payment info" ON bookings
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can manage all payment webhooks
DROP POLICY IF EXISTS "Service role can manage payment webhooks" ON payment_webhooks;
CREATE POLICY "Service role can manage payment webhooks" ON payment_webhooks
    FOR ALL USING (auth.role() = 'service_role');

-- Create function to clean up old PayMongo data (optional)
CREATE OR REPLACE FUNCTION cleanup_paymongo_data()
RETURNS void AS $$
BEGIN
    -- This function can be used to clean up PayMongo-specific data
    -- after successful migration to Xendit
    -- Uncomment and customize as needed
    
    -- UPDATE bookings 
    -- SET payment_intent_id = NULL, payment_source_id = NULL
    -- WHERE xendit_invoice_id IS NOT NULL OR xendit_charge_id IS NOT NULL;
    
    RAISE NOTICE 'PayMongo cleanup function created. Run manually when ready to clean up old data.';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_paymongo_data() IS 'Optional function to clean up PayMongo data after Xendit migration';

-- Create function to migrate existing PayMongo bookings to Xendit format
CREATE OR REPLACE FUNCTION migrate_paymongo_to_xendit()
RETURNS TABLE(migrated_count INTEGER) AS $$
DECLARE
    migration_count INTEGER := 0;
BEGIN
    -- Update payment method names for consistency
    UPDATE bookings 
    SET payment_method = CASE 
        WHEN payment_method = 'grab_pay' THEN 'grabpay'
        ELSE payment_method
    END
    WHERE payment_method IN ('grab_pay');
    
    GET DIAGNOSTICS migration_count = ROW_COUNT;
    
    RETURN QUERY SELECT migration_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION migrate_paymongo_to_xendit() IS 'Migrate existing PayMongo booking data to be compatible with Xendit';

-- Migration record (schema_migrations table not available)
-- This migration adds Xendit support to replace PayMongo
-- Applied on: 2024-11-12
