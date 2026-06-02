-- Fix: notifications.book_id had no ON DELETE clause (default RESTRICT).
-- Deleting a book that appeared in any friend_new_book notification was blocked
-- by a foreign key violation. Set to ON DELETE SET NULL so the notification
-- survives but its book reference is cleared.

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_book_id_fkey;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_book_id_fkey
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL;
