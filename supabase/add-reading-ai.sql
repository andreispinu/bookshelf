-- reading_ai_books: one row per user+book combination added to "Read with AI"
CREATE TABLE IF NOT EXISTS reading_ai_books (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id       uuid        NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status        text        NOT NULL DEFAULT 'pending', -- 'pending' | 'generating' | 'active' | 'completed'
  added_at      timestamptz DEFAULT now(),
  started_at    timestamptz,
  completed_at  timestamptz,
  UNIQUE(user_id, book_id)
);

ALTER TABLE reading_ai_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own reading_ai_books"
  ON reading_ai_books FOR ALL
  USING (auth.uid() = user_id);

-- reading_ai_insights: one row per insight, linked to a reading
CREATE TABLE IF NOT EXISTS reading_ai_insights (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_id   uuid        NOT NULL REFERENCES reading_ai_books(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id      uuid        NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  position     int         NOT NULL,
  title        text        NOT NULL,
  insight      text        NOT NULL,
  extract      text        NOT NULL,
  delivered_at timestamptz,           -- null = not yet delivered
  read_at      timestamptz,           -- null = unread
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE reading_ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read and update their own insights"
  ON reading_ai_insights FOR ALL
  USING (auth.uid() = user_id);

-- Email notification preference for daily insights
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS reading_ai_email_notifications boolean DEFAULT true;
