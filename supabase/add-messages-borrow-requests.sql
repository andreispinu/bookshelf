-- ============================================================
-- Messages table
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     text        NOT NULL,
  read        boolean     DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages: participant read"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "messages: sender insert"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages: receiver update"
  ON messages FOR UPDATE
  USING (auth.uid() = receiver_id);

CREATE INDEX IF NOT EXISTS messages_sender_receiver_idx ON messages (sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_receiver_unread_idx ON messages (receiver_id, read) WHERE read = false;

-- ============================================================
-- Borrow requests table
-- ============================================================

CREATE TABLE IF NOT EXISTS borrow_requests (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id           uuid        NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  requester_id      uuid        NOT NULL REFERENCES profiles(id),
  owner_id          uuid        NOT NULL REFERENCES profiles(id),
  status            text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'rejected')),
  requester_message text,
  owner_message     text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE borrow_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "borrow_requests: participant read"
  ON borrow_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = owner_id);

CREATE POLICY "borrow_requests: requester insert"
  ON borrow_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "borrow_requests: owner update"
  ON borrow_requests FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS borrow_requests_owner_pending_idx ON borrow_requests (owner_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS borrow_requests_requester_idx ON borrow_requests (requester_id, created_at DESC);
