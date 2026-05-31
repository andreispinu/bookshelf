-- Add description column to books table
-- Run this in the Supabase SQL Editor

ALTER TABLE books ADD COLUMN IF NOT EXISTS description text;
