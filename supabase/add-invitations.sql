-- Migration: invite friends by email
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS invitations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email            text        NOT NULL,
  status           text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  token            text        NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  accepted_user_id uuid        REFERENCES profiles(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE(inviter_id, email)
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invitations: inviter can read own"
  ON invitations FOR SELECT
  USING (inviter_id = auth.uid());

CREATE POLICY "invitations: inviter can insert"
  ON invitations FOR INSERT
  WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "invitations: inviter can update own"
  ON invitations FOR UPDATE
  USING (inviter_id = auth.uid());
