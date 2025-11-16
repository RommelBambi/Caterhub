-- ============================================
-- CREATE WITHDRAWAL_REQUESTS TABLE
-- ============================================
-- This table stores caterer withdrawal requests
-- Used for tracking withdrawals to GCash/PayMaya via Xendit

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id BIGSERIAL NOT NULL,
  caterer_id UUID NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'::VARCHAR,
  xendit_payout_id VARCHAR(255) NULL,
  xendit_external_id VARCHAR(255) NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE NULL,
  
  CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id),
  CONSTRAINT withdrawal_requests_caterer_id_fkey 
    FOREIGN KEY (caterer_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE,
  CONSTRAINT withdrawal_requests_status_check 
    CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  CONSTRAINT withdrawal_requests_payment_method_check 
    CHECK (payment_method IN ('gcash', 'paymaya', 'bank_transfer')),
  CONSTRAINT withdrawal_requests_amount_check 
    CHECK (amount > 0)
) TABLESPACE pg_default;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_caterer_id 
  ON public.withdrawal_requests USING btree (caterer_id) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status 
  ON public.withdrawal_requests USING btree (status) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at 
  ON public.withdrawal_requests USING btree (created_at DESC) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_xendit_payout_id 
  ON public.withdrawal_requests USING btree (xendit_payout_id) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_xendit_external_id 
  ON public.withdrawal_requests USING btree (xendit_external_id) 
  TABLESPACE pg_default;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_withdrawal_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_withdrawal_requests_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_withdrawal_requests_updated_at();

-- Enable Row Level Security
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for withdrawal_requests table

-- Policy: Caterers can view their own withdrawal requests
CREATE POLICY "Caterers can view their own withdrawal requests"
  ON public.withdrawal_requests
  FOR SELECT
  TO authenticated
  USING (
    caterer_id = auth.uid()
  );

-- Policy: Caterers can create their own withdrawal requests
CREATE POLICY "Caterers can create their own withdrawal requests"
  ON public.withdrawal_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    caterer_id = auth.uid()
  );

-- Policy: Caterers can update their own pending withdrawal requests
CREATE POLICY "Caterers can update their own pending withdrawal requests"
  ON public.withdrawal_requests
  FOR UPDATE
  TO authenticated
  USING (
    caterer_id = auth.uid() 
    AND status = 'PENDING'
  )
  WITH CHECK (
    caterer_id = auth.uid()
  );

-- Policy: Admins can view all withdrawal requests
CREATE POLICY "Admins can view all withdrawal requests"
  ON public.withdrawal_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );

-- Policy: Admins can update all withdrawal requests
CREATE POLICY "Admins can update all withdrawal requests"
  ON public.withdrawal_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );

-- Verify the table was created
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'withdrawal_requests'
ORDER BY ordinal_position;

