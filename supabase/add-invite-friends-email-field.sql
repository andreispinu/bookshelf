-- Add invite_friends_email_sent_at to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS invite_friends_email_sent_at timestamptz;
