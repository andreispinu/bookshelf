-- Add book_limit_email_sent_at to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS book_limit_email_sent_at timestamptz;
