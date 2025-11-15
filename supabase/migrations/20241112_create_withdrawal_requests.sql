-- Create withdrawal_requests table for caterer withdrawals
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id BIGSERIAL PRIMARY KEY,
  caterer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('gcash', 'paymaya', 'bank_transfer')),
  payment_details JSONB NOT NULL, -- Stores account number, account name, bank name, etc.
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  transaction_id VARCHAR(255), -- External transaction ID from payment processor
  admin_notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_caterer_id ON withdrawal_requests(caterer_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON withdrawal_requests(created_at DESC);

-- Enable RLS
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Caterers can view their own withdrawal requests
CREATE POLICY "Caterers can view own withdrawal requests"
  ON withdrawal_requests
  FOR SELECT
  USING (auth.uid() = caterer_id);

-- Policy: Caterers can create their own withdrawal requests
CREATE POLICY "Caterers can create withdrawal requests"
  ON withdrawal_requests
  FOR INSERT
  WITH CHECK (auth.uid() = caterer_id);

-- Policy: Caterers can update their own pending withdrawal requests (to cancel)
CREATE POLICY "Caterers can update own pending withdrawals"
  ON withdrawal_requests
  FOR UPDATE
  USING (auth.uid() = caterer_id AND status = 'PENDING')
  WITH CHECK (auth.uid() = caterer_id);

-- Policy: Admins can view all withdrawal requests
CREATE POLICY "Admins can view all withdrawal requests"
  ON withdrawal_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Policy: Admins can update withdrawal requests (to process them)
CREATE POLICY "Admins can update withdrawal requests"
  ON withdrawal_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_withdrawal_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER withdrawal_requests_updated_at
  BEFORE UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_withdrawal_requests_updated_at();

