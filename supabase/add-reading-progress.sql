-- Add reading progress tracking
CREATE TABLE IF NOT EXISTS reading_progress (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id          uuid        NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status           text        NOT NULL DEFAULT 'reading',
  progress_percent int         DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  rating           int         CHECK (rating >= 1 AND rating <= 5),
  review           text,
  started_at       timestamptz DEFAULT now(),
  finished_at      timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE(user_id, book_id)
);

ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reading progress"
  ON reading_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Accepted friends can view reading progress"
  ON reading_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND (
        (requester_id = auth.uid() AND addressee_id = reading_progress.user_id)
        OR (addressee_id = auth.uid() AND requester_id = reading_progress.user_id)
      )
    )
  );
