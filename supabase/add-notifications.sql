-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       text        NOT NULL,  -- 'friend_request' | 'friend_accepted' | 'friend_new_book'
  actor_id   uuid        REFERENCES profiles(id),
  book_id    uuid        REFERENCES books(id),
  read       boolean     DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────
-- Trigger 1: Friend request received (INSERT on friendships, status = 'pending')
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, actor_id)
  VALUES (NEW.addressee_id, 'friend_request', NEW.requester_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_friend_request
AFTER INSERT ON friendships
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION notify_friend_request();

-- ────────────────────────────────────────────────
-- Trigger 2: Friend request accepted (UPDATE on friendships, status changes to 'accepted')
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_friend_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    INSERT INTO notifications (user_id, type, actor_id)
    VALUES (NEW.requester_id, 'friend_accepted', NEW.addressee_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_friend_accepted
AFTER UPDATE ON friendships
FOR EACH ROW
EXECUTE FUNCTION notify_friend_accepted();

-- ────────────────────────────────────────────────
-- Trigger 3: Friend added a new book (INSERT on books)
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_friend_new_book()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, actor_id, book_id)
  SELECT
    CASE
      WHEN f.requester_id = NEW.user_id THEN f.addressee_id
      ELSE f.requester_id
    END,
    'friend_new_book',
    NEW.user_id,
    NEW.id
  FROM friendships f
  WHERE (f.requester_id = NEW.user_id OR f.addressee_id = NEW.user_id)
    AND f.status = 'accepted';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_book
AFTER INSERT ON books
FOR EACH ROW
EXECUTE FUNCTION notify_friend_new_book();
