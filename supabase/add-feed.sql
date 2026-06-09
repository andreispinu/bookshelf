-- ── Social Feed tables ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_feed (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text        NOT NULL,  -- 'book_added' | 'book_lent' | 'book_borrowed' | 'reading_started' | 'reading_finished'
  book_id    uuid        REFERENCES books(id) ON DELETE SET NULL,
  meta       jsonb       NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feed_likes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id    uuid        NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feed_id, user_id)
);

CREATE TABLE IF NOT EXISTS feed_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id    uuid        NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS activity_feed_user_id_created_at_idx ON activity_feed (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS feed_likes_feed_id_idx ON feed_likes (feed_id);
CREATE INDEX IF NOT EXISTS feed_comments_feed_id_idx ON feed_comments (feed_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE activity_feed  ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments  ENABLE ROW LEVEL SECURITY;

-- activity_feed: owner + accepted friends can read; only service role can write
CREATE POLICY "activity_feed_select"
  ON activity_feed FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
        AND (
          (requester_id = auth.uid() AND addressee_id = activity_feed.user_id)
          OR (addressee_id = auth.uid() AND requester_id = activity_feed.user_id)
        )
    )
  );

-- feed_likes: anyone can read; users can insert/delete their own
CREATE POLICY "feed_likes_select"  ON feed_likes FOR SELECT  USING (true);
CREATE POLICY "feed_likes_insert"  ON feed_likes FOR INSERT  WITH CHECK (user_id = auth.uid());
CREATE POLICY "feed_likes_delete"  ON feed_likes FOR DELETE  USING (user_id = auth.uid());

-- feed_comments: anyone can read; users can insert/delete their own
CREATE POLICY "feed_comments_select" ON feed_comments FOR SELECT  USING (true);
CREATE POLICY "feed_comments_insert" ON feed_comments FOR INSERT  WITH CHECK (user_id = auth.uid());
CREATE POLICY "feed_comments_delete" ON feed_comments FOR DELETE  USING (user_id = auth.uid());

-- ── DB trigger: book_added event ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.on_book_added_feed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO activity_feed (user_id, event_type, book_id, meta)
  VALUES (
    NEW.user_id,
    'book_added',
    NEW.id,
    jsonb_build_object(
      'title',     NEW.title,
      'author',    NEW.author,
      'cover_url', NEW.cover_url
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_book_added_feed_trigger ON books;
CREATE TRIGGER on_book_added_feed_trigger
  AFTER INSERT ON books
  FOR EACH ROW
  EXECUTE FUNCTION public.on_book_added_feed();
