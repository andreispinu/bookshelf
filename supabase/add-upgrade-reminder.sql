-- Guards the "upgrade reminder" email (sent once, ~3 months after a free user
-- reached the 10-book limit without upgrading). See app/api/cron/upgrade-reminder.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS upgrade_reminder_sent_at timestamptz;
