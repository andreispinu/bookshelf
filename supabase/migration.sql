-- ============================================================
-- BookShelf — Database Migration
-- Run this in the Supabase SQL Editor (Project → SQL Editor)
-- ============================================================


-- ============================================================
-- TABLES
-- ============================================================

-- profiles: public user data, extends auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  avatar_url  text,
  created_at  timestamptz DEFAULT now()
);

-- books: books owned by a user
CREATE TABLE IF NOT EXISTS books (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  author      text        NOT NULL,
  isbn        text,
  cover_url   text,
  status      text        NOT NULL DEFAULT 'available'
                          CHECK (status IN ('available', 'lent_out')),
  created_at  timestamptz DEFAULT now()
);

-- friendships: friend requests between users
CREATE TABLE IF NOT EXISTS friendships (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at    timestamptz DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

-- loans: book lending records
CREATE TABLE IF NOT EXISTS loans (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id      uuid        NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  lender_id    uuid        NOT NULL REFERENCES profiles(id),
  borrower_id  uuid        NOT NULL REFERENCES profiles(id),
  loaned_at    timestamptz DEFAULT now(),
  returned_at  timestamptz
);


-- ============================================================
-- TRIGGER: create profile on sign up
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE books       ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans       ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- profiles policies
-- ------------------------------------------------------------

-- Users can read any profile (needed for friend search)
CREATE POLICY "profiles: public read"
  ON profiles FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles: owner update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);


-- ------------------------------------------------------------
-- books policies
-- ------------------------------------------------------------

-- Users can read their own books, plus books owned by friends
CREATE POLICY "books: owner read"
  ON books FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
        AND (
          (requester_id = auth.uid() AND addressee_id = user_id)
          OR
          (addressee_id = auth.uid() AND requester_id = user_id)
        )
    )
  );

-- Users can insert their own books
CREATE POLICY "books: owner insert"
  ON books FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own books
CREATE POLICY "books: owner update"
  ON books FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own books
CREATE POLICY "books: owner delete"
  ON books FOR DELETE
  USING (auth.uid() = user_id);


-- ------------------------------------------------------------
-- friendships policies
-- ------------------------------------------------------------

-- Users can see friendships they're part of
CREATE POLICY "friendships: participant read"
  ON friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Users can send friend requests
CREATE POLICY "friendships: requester insert"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- The addressee can accept or decline; the requester can cancel (delete)
CREATE POLICY "friendships: participant update"
  ON friendships FOR UPDATE
  USING (auth.uid() = addressee_id);

CREATE POLICY "friendships: requester delete"
  ON friendships FOR DELETE
  USING (auth.uid() = requester_id);


-- ------------------------------------------------------------
-- loans policies
-- ------------------------------------------------------------

-- Users can see loans they're involved in (as lender or borrower)
CREATE POLICY "loans: participant read"
  ON loans FOR SELECT
  USING (auth.uid() = lender_id OR auth.uid() = borrower_id);

-- Only the lender (book owner) can create a loan
CREATE POLICY "loans: lender insert"
  ON loans FOR INSERT
  WITH CHECK (auth.uid() = lender_id);

-- Only the lender can mark a loan as returned
CREATE POLICY "loans: lender update"
  ON loans FOR UPDATE
  USING (auth.uid() = lender_id);
