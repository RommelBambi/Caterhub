-- Add suspension fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT DEFAULT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_suspended ON users(suspended);
