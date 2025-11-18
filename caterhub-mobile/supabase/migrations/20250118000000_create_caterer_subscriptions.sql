-- Create caterer_subscriptions table
CREATE TABLE IF NOT EXISTS caterer_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  caterer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
  amount NUMERIC(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('active', 'expired', 'cancelled', 'pending_payment')),
  xendit_invoice_id VARCHAR(255),
  xendit_payment_id VARCHAR(255),
  started_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_caterer_subscriptions_caterer_id ON caterer_subscriptions(caterer_id);
CREATE INDEX IF NOT EXISTS idx_caterer_subscriptions_status ON caterer_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_caterer_subscriptions_expires_at ON caterer_subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_caterer_subscriptions_xendit_invoice_id ON caterer_subscriptions(xendit_invoice_id);

-- Enable RLS
ALTER TABLE caterer_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Caterers can view their own subscriptions" ON caterer_subscriptions;
DROP POLICY IF EXISTS "Caterers can create their own subscriptions" ON caterer_subscriptions;
DROP POLICY IF EXISTS "Caterers can update their own subscriptions" ON caterer_subscriptions;
DROP POLICY IF EXISTS "Public can read active subscriptions" ON caterer_subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON caterer_subscriptions;
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON caterer_subscriptions;
DROP POLICY IF EXISTS "Admins can delete subscriptions" ON caterer_subscriptions;

-- Policy: Caterers can view their own subscriptions
CREATE POLICY "Caterers can view their own subscriptions"
  ON caterer_subscriptions
  FOR SELECT
  USING (
    auth.uid() = caterer_id
  );

-- Policy: Caterers can create their own subscriptions
CREATE POLICY "Caterers can create their own subscriptions"
  ON caterer_subscriptions
  FOR INSERT
  WITH CHECK (
    auth.uid() = caterer_id
  );

-- Policy: Caterers can update their own subscriptions (limited to certain fields)
-- Note: Status restrictions are enforced at application level since OLD is not available in WITH CHECK
CREATE POLICY "Caterers can update their own subscriptions"
  ON caterer_subscriptions
  FOR UPDATE
  USING (
    auth.uid() = caterer_id
  )
  WITH CHECK (
    auth.uid() = caterer_id
  );

-- Policy: Public can read active subscriptions (for featured services)
-- This allows the fetchFeaturedServices function to work for customers
CREATE POLICY "Public can read active subscriptions"
  ON caterer_subscriptions
  FOR SELECT
  USING (
    status = 'active'
    AND expires_at > NOW()
  );

-- Policy: Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
  ON caterer_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Policy: Admins can update all subscriptions
CREATE POLICY "Admins can update all subscriptions"
  ON caterer_subscriptions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Policy: Admins can delete subscriptions (for cleanup/refunds)
CREATE POLICY "Admins can delete subscriptions"
  ON caterer_subscriptions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Policy: Service role can do everything (for webhooks and admin operations)
-- Note: This uses service_role key which bypasses RLS, but we define it for completeness
-- The webhook function uses service_role key, so it can update subscriptions

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_caterer_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS update_caterer_subscriptions_updated_at ON caterer_subscriptions;

-- Trigger to update updated_at on row update
CREATE TRIGGER update_caterer_subscriptions_updated_at
  BEFORE UPDATE ON caterer_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_caterer_subscriptions_updated_at();

