-- Add category column to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS category text;
