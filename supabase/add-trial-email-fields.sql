-- Migration: trial lifecycle email tracking fields
-- Run in Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_reminder_5day_sent_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_reminder_1day_sent_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_expired_sent_at timestamptz;
