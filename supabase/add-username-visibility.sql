-- Add username and profile visibility fields to profiles
-- Run this in the Supabase SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username           text UNIQUE,
  ADD COLUMN IF NOT EXISTS profile_visibility text NOT NULL DEFAULT 'private';

-- Index for fast lookup by username (public profile page)
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles (username);

-- Constraint: lowercase alphanumeric + hyphens, 3-30 chars
ALTER TABLE profiles
  ADD CONSTRAINT profiles_username_format
  CHECK (username IS NULL OR username ~ '^[a-z0-9-]{3,30}$');
