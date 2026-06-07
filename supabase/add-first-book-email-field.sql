-- Add first_book_email_sent_at to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_book_email_sent_at timestamptz;
