-- PayMongo Integration Database Migration
-- Run this SQL in your Supabase SQL Editor

-- Add payment-related columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_source_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

-- Add comments for documentation
COMMENT ON COLUMN bookings.payment_method IS 'Payment method used: gcash, grab_pay, paymaya, card, cash';
COMMENT ON COLUMN bookings.payment_status IS 'Payment status: PENDING, COMPLETED, FAILED, REFUNDED';
COMMENT ON COLUMN bookings.payment_intent_id IS 'PayMongo Payment Intent ID';
COMMENT ON COLUMN bookings.payment_source_id IS 'PayMongo Payment Source ID (for e-wallets)';
COMMENT ON COLUMN bookings.transaction_id IS 'PayMongo Transaction ID';
COMMENT ON COLUMN bookings.paid_at IS 'Timestamp when payment was completed';

-- Create indexes for faster payment queries
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent ON bookings(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_method ON bookings(payment_method);
CREATE INDEX IF NOT EXISTS idx_bookings_paid_at ON bookings(paid_at);

-- Create a view for payment analytics
CREATE OR REPLACE VIEW payment_analytics AS
SELECT 
  payment_method,
  payment_status,
  COUNT(*) as transaction_count,
  SUM(CASE 
    WHEN packages.price IS NOT NULL THEN 
      CAST(REGEXP_REPLACE(packages.price, '[^0-9.]', '', 'g') AS DECIMAL)
    ELSE 
      services.price_per_head * bookings.guests
  END) as total_amount,
  AVG(CASE 
    WHEN packages.price IS NOT NULL THEN 
      CAST(REGEXP_REPLACE(packages.price, '[^0-9.]', '', 'g') AS DECIMAL)
    ELSE 
      services.price_per_head * bookings.guests
  END) as average_amount
FROM bookings
LEFT JOIN packages ON bookings.package_id = packages.id
LEFT JOIN services ON bookings.service_id = services.id
WHERE payment_method IS NOT NULL
GROUP BY payment_method, payment_status;

-- Grant access to the view
GRANT SELECT ON payment_analytics TO authenticated;

-- Create a function to update booking status when payment is completed
CREATE OR REPLACE FUNCTION update_booking_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- If payment status changes to COMPLETED, update booking status
  IF NEW.payment_status = 'COMPLETED' AND OLD.payment_status != 'COMPLETED' THEN
    NEW.status = 'CONFIRMED';
    NEW.paid_at = COALESCE(NEW.paid_at, NOW());
  END IF;
  
  -- If payment status changes to FAILED, you might want to handle it
  IF NEW.payment_status = 'FAILED' AND OLD.payment_status != 'FAILED' THEN
    -- Optionally update booking status or send notification
    -- NEW.status = 'PENDING'; -- Keep as pending or set to cancelled
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic booking status update
DROP TRIGGER IF EXISTS trigger_update_booking_on_payment ON bookings;
CREATE TRIGGER trigger_update_booking_on_payment
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION update_booking_on_payment();

-- Create a table for payment webhooks log (optional but recommended)
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id BIGSERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payment_intent_id VARCHAR(255),
  payment_source_id VARCHAR(255),
  status VARCHAR(50),
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on payment_webhooks
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_event_id ON payment_webhooks(event_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_payment_intent ON payment_webhooks(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed ON payment_webhooks(processed);

-- Grant access
GRANT SELECT, INSERT, UPDATE ON payment_webhooks TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE payment_webhooks_id_seq TO authenticated;

-- Add RLS policies for payment_webhooks
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage webhooks
CREATE POLICY "Service role can manage webhooks"
  ON payment_webhooks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can only view their own payment webhooks
CREATE POLICY "Users can view their payment webhooks"
  ON payment_webhooks
  FOR SELECT
  TO authenticated
  USING (
    payment_intent_id IN (
      SELECT payment_intent_id 
      FROM bookings 
      WHERE user_id = auth.uid()
    )
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'PayMongo database migration completed successfully!';
  RAISE NOTICE 'Payment columns added to bookings table';
  RAISE NOTICE 'Indexes created for better query performance';
  RAISE NOTICE 'Payment analytics view created';
  RAISE NOTICE 'Automatic booking status update trigger created';
  RAISE NOTICE 'Payment webhooks table created';
END $$;
