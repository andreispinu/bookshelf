-- Update the new_message notification trigger to also skip SYSTEM: messages.
-- Run this in the Supabase SQL Editor.

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip borrow_request JSON messages
  IF NEW.content LIKE '{"type":"borrow_request"%' THEN
    RETURN NEW;
  END IF;

  -- Skip system event messages (SYSTEM: prefix)
  IF NEW.content LIKE 'SYSTEM:%' THEN
    RETURN NEW;
  END IF;

  -- If an unread new_message notification from this sender already exists, update created_at
  UPDATE notifications
  SET created_at = NOW()
  WHERE user_id = NEW.receiver_id
    AND type = 'new_message'
    AND actor_id = NEW.sender_id
    AND read = false;

  -- Otherwise insert a fresh notification
  IF NOT FOUND THEN
    INSERT INTO notifications (user_id, type, actor_id)
    VALUES (NEW.receiver_id, 'new_message', NEW.sender_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
