-- Trigger: new_message notification on messages INSERT
-- Skip borrow_request JSON messages (they generate a borrow_request notification instead)
-- Upsert: if an unread new_message notification from the same actor already exists, just bump created_at

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip borrow_request JSON messages
  IF NEW.content LIKE '{"type":"borrow_request"%' THEN
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

CREATE TRIGGER on_new_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_new_message();
