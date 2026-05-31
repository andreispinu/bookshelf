-- Add publisher and year columns to books table
-- Run this in the Supabase SQL Editor

ALTER TABLE books ADD COLUMN IF NOT EXISTS publisher text;
ALTER TABLE books ADD COLUMN IF NOT EXISTS year text;
