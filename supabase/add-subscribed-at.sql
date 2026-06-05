-- Add subscribed_at column to profiles
-- Tracks the first time a user activated a paid subscription (set by Stripe webhook)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscribed_at timestamptz;

-- Backfill existing active subscribers (rough approximation using created_at)
UPDATE profiles
SET subscribed_at = created_at
WHERE subscription_status = 'active'
  AND subscribed_at IS NULL;
