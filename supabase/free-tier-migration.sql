-- Free tier migration: give all expired trial users permanent free access
-- Users with trial_ends_at in the past get trial_ends_at set to far future
-- so they are no longer blocked (access control no longer uses trial_ends_at anyway)
UPDATE profiles
SET trial_ends_at = '2099-01-01'::timestamptz
WHERE subscription_status = 'trialing'
  AND trial_ends_at < now();
