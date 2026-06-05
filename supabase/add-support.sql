-- Support bot profile (fixed UUID — must exist for FK in messages table)
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, role, aud)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'support@bookshelf.name',
  now(), now(), now(), 'authenticated', 'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, name, first_name)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'BookShelf Support',
  'BookShelf'
) ON CONFLICT (id) DO NOTHING;

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       text        NOT NULL DEFAULT 'other',
  subject    text        NOT NULL,
  status     text        NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Support replies (both user and admin messages in the thread)
CREATE TABLE IF NOT EXISTS support_replies (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  uuid        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  from_admin boolean     NOT NULL DEFAULT false,
  content    text        NOT NULL,
  read_at    timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets(status);
CREATE INDEX IF NOT EXISTS support_replies_ticket_id_idx ON support_replies(ticket_id);

-- RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_replies ENABLE ROW LEVEL SECURITY;

-- support_tickets policies
CREATE POLICY "users_read_own_tickets" ON support_tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_tickets" ON support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- support_replies policies
CREATE POLICY "users_read_own_replies" ON support_replies
  FOR SELECT USING (
    ticket_id IN (
      SELECT id FROM support_tickets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_replies" ON support_replies
  FOR INSERT WITH CHECK (
    from_admin = false AND
    ticket_id IN (
      SELECT id FROM support_tickets WHERE user_id = auth.uid()
    )
  );
