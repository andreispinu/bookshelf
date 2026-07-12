-- Lifecycle & marketing email crons: activity tracking, send-guard flags, and a master opt-out.
-- Run in the Supabase SQL Editor.
--
-- Columns added to profiles:
--   last_active_at               — updated once/day by proxy.ts (drives the weekly friend digest "inactive 7d" rule)
--   weekly_digest_sent_at        — guards the weekly friend activity digest (re-send after 6 days)
--   add_books_reminder_a_sent_at — guards Add Books reminder A (14d, <3 books)
--   add_books_reminder_b_sent_at — guards Add Books reminder B (30d, <5 books)
--   invite_reminder_a_sent_at    — guards Invite follow-up A (10d, <2 friends) — separate from invite_friends_email_sent_at (day-5 cron)
--   invite_reminder_b_sent_at    — guards Invite follow-up B (21d, <2 friends)
--   last_tip_email_sent_at       — timestamp of the last monthly tip email
--   last_tip_number              — which tip (1..6) was last sent, for rotation
--   marketing_emails_enabled     — master opt-out for all four lifecycle/marketing crons (default true)
--
-- No new RLS needed: the existing "profiles: owner update" policy (auth.uid() = id) already lets
-- a user update any column of their own row, which is what proxy.ts relies on for last_active_at.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekly_digest_sent_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS add_books_reminder_a_sent_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS add_books_reminder_b_sent_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invite_reminder_a_sent_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invite_reminder_b_sent_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_tip_email_sent_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_tip_number int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marketing_emails_enabled boolean DEFAULT true;

-- Backfill last_active_at so existing users aren't all treated as "inactive 7d" on the very first
-- weekly run (which would blast the whole user base). Seed to now(); the proxy keeps it fresh.
UPDATE profiles SET last_active_at = now() WHERE last_active_at IS NULL;

-- Ensure the master opt-out is set for existing rows.
UPDATE profiles SET marketing_emails_enabled = true WHERE marketing_emails_enabled IS NULL;
