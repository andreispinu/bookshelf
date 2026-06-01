-- Add language column to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS language text;
