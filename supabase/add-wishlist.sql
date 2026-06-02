-- Wishlist (Bookstore) table
CREATE TABLE IF NOT EXISTS wishlist (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           text        NOT NULL,
  author          text        NOT NULL,
  isbn            text,
  cover_url       text,
  category        text,
  language        text,
  description     text,
  status          text        NOT NULL DEFAULT 'wanted',  -- 'wanted' | 'borrowed' | 'purchased'
  has_friend_copy boolean     NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own wishlist" ON wishlist
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX wishlist_user_id_idx ON wishlist (user_id);
