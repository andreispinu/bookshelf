-- Create public storage bucket for book cover images
-- Run this in the Supabase SQL Editor

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-covers',
  'book-covers',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access (bucket is public, but explicit policy is best practice)
CREATE POLICY IF NOT EXISTS "Public read book covers"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'book-covers');
