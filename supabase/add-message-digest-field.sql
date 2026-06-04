-- Message digest notification preference
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS message_digest_enabled boolean DEFAULT true;
