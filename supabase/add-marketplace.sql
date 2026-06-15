-- Public Marketplace
-- Makes for-sale books publicly readable so the /marketplace page and
-- /api/marketplace endpoint can list them without authentication.
--
-- NOTE ON DATA MODEL: there is no `for_sale` boolean column. A book is
-- "for sale" when availability_mode IN ('sell_only','lend_and_sell').
-- The marketplace also requires status = 'available' (lent-out books are hidden).
--
-- NOTE ON PROFILES: we deliberately do NOT add a blanket
-- `profiles ... TO anon USING (true)` policy. RLS is row-level, not
-- column-level, so such a policy would expose every profile column
-- (stripe_customer_id, trial_ends_at, email-related fields, …) to the
-- public anon key used by the browser client. Instead, seller info is
-- read server-side via the service-role client in /api/marketplace,
-- selecting ONLY the safe columns (name, avatar_url, city, country,
-- username) — the same pattern already used by the public profile page
-- (app/[username]/page.tsx).

-- Allow anyone (including anonymous visitors) to read books that are
-- listed for sale and currently available. Book listing data is not
-- sensitive. This is defense-in-depth; the API route uses the service
-- role and works regardless of this policy.
DROP POLICY IF EXISTS "Public can view books for sale" ON books;
CREATE POLICY "Public can view books for sale"
  ON books FOR SELECT
  TO anon
  USING (
    availability_mode IN ('sell_only', 'lend_and_sell')
    AND status = 'available'
  );
