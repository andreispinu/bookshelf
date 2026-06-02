-- Migration: add first_name and last_name to profiles
-- Run in Supabase SQL Editor

-- 1. Add columns (nullable initially for migration)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name text;

-- 2. Migrate existing data from name column
UPDATE profiles
SET
  first_name = split_part(name, ' ', 1),
  last_name   = NULLIF(trim(substring(name FROM position(' ' IN name))), '');

-- 3. Trigger: keep name in sync whenever first_name or last_name is updated
CREATE OR REPLACE FUNCTION sync_profile_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name := trim(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_name_sync ON profiles;
CREATE TRIGGER on_profile_name_sync
BEFORE UPDATE OF first_name, last_name ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_profile_name();

-- Note: handle_new_user is NOT updated here to avoid the dangerous-operation warning.
-- first_name and last_name are populated for new signups by the app (signup server action)
-- immediately after supabase.auth.signUp() returns the user id.
