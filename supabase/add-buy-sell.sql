-- Add buy/sell fields to books table
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS sale_price     decimal(10,2),
  ADD COLUMN IF NOT EXISTS sale_currency  text DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS condition_note text,
  ADD COLUMN IF NOT EXISTS availability_mode text DEFAULT 'lend_only';

-- Create sale_requests table
CREATE TABLE IF NOT EXISTS sale_requests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id       uuid        NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  buyer_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message       text,
  sale_price    decimal(10,2),
  sale_currency text DEFAULT 'EUR',
  status        text        NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'declined' | 'completed'
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE sale_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read their sale requests"
  ON sale_requests FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers can create sale requests"
  ON sale_requests FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Participants can update sale requests"
  ON sale_requests FOR UPDATE
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id);
