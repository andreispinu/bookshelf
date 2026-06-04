-- ──────────────────────────────────────────────────────────────────────────────
-- Add lending workflow to loans and borrow_requests tables
-- Run this in the Supabase SQL Editor
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Update loans table
ALTER TABLE loans ADD COLUMN IF NOT EXISTS due_date timestamptz;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS handoff_confirmed_at timestamptz;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS received_confirmed_at timestamptz;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS return_initiated_at timestamptz;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS return_confirmed_at timestamptz;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'pending_handoff';
ALTER TABLE loans ADD COLUMN IF NOT EXISTS approved_days int;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS overdue_email_sent_at timestamptz;

-- 2. Migrate existing loans
-- Already returned → completed
UPDATE loans SET workflow_status = 'completed' WHERE returned_at IS NOT NULL AND workflow_status = 'pending_handoff';
-- Still active (not returned) → active (legacy loans, no due date)
UPDATE loans SET workflow_status = 'active' WHERE returned_at IS NULL AND workflow_status = 'pending_handoff';

-- 3. Update borrow_requests table
ALTER TABLE borrow_requests ADD COLUMN IF NOT EXISTS requested_days int;
ALTER TABLE borrow_requests ADD COLUMN IF NOT EXISTS approved_days int;

-- 4. Create loan_extensions table
CREATE TABLE IF NOT EXISTS loan_extensions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id        uuid        NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  requested_by   uuid        NOT NULL REFERENCES profiles(id),
  requested_days int         NOT NULL,
  status         text        NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'declined'
  requester_note text,
  owner_note     text,
  created_at     timestamptz DEFAULT now(),
  responded_at   timestamptz
);

ALTER TABLE loan_extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loan participants can read extensions"
  ON loan_extensions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loans l
      WHERE l.id = loan_id
      AND (l.lender_id = auth.uid() OR l.borrower_id = auth.uid())
    )
  );

CREATE POLICY "Borrower can request extension"
  ON loan_extensions FOR INSERT
  WITH CHECK (
    auth.uid() = requested_by AND
    EXISTS (
      SELECT 1 FROM loans l
      WHERE l.id = loan_id AND l.borrower_id = auth.uid()
    )
  );

CREATE POLICY "Lender can respond to extension"
  ON loan_extensions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loans l
      WHERE l.id = loan_id AND l.lender_id = auth.uid()
    )
  );

-- 5. Create loan_recalls table
CREATE TABLE IF NOT EXISTS loan_recalls (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id      uuid        NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  requested_by uuid        NOT NULL REFERENCES profiles(id),
  reason       text,
  status       text        NOT NULL DEFAULT 'pending',  -- 'pending' | 'acknowledged'
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE loan_recalls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loan participants can read recalls"
  ON loan_recalls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loans l
      WHERE l.id = loan_id
      AND (l.lender_id = auth.uid() OR l.borrower_id = auth.uid())
    )
  );

CREATE POLICY "Lender can request recall"
  ON loan_recalls FOR INSERT
  WITH CHECK (
    auth.uid() = requested_by AND
    EXISTS (
      SELECT 1 FROM loans l
      WHERE l.id = loan_id AND l.lender_id = auth.uid()
    )
  );

CREATE POLICY "Borrower can acknowledge recall"
  ON loan_recalls FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loans l
      WHERE l.id = loan_id AND l.borrower_id = auth.uid()
    )
  );
