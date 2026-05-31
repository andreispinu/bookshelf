-- Add subscription and trial fields to profiles
-- Run this in the Supabase SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at       timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id  text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS subscription_plan   text,
  ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;

-- Set trial_ends_at for existing users who don't have it yet
UPDATE profiles
SET trial_ends_at = now() + interval '14 days'
WHERE trial_ends_at IS NULL;

-- Update signup trigger to include trial_ends_at
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    now() + interval '14 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
