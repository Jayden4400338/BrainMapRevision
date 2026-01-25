-- Setup Supabase Storage for Profile Pictures
-- Run this in your Supabase SQL Editor

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload their own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;

-- Create policy to allow authenticated users to upload their own profile pictures
-- Files are named as {user_id}-{timestamp}.{ext}, so we check if filename starts with user ID
CREATE POLICY "Users can upload their own profile picture"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (split_part(name, '-', 1) = auth.uid()::text)
);

-- Create policy to allow users to update their own profile pictures
CREATE POLICY "Users can update their own profile picture"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (split_part(name, '-', 1) = auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (split_part(name, '-', 1) = auth.uid()::text)
);

-- Create policy to allow users to delete their own profile pictures
CREATE POLICY "Users can delete their own profile picture"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (split_part(name, '-', 1) = auth.uid()::text)
);

-- Create policy to allow anyone to view profile pictures (public bucket)
CREATE POLICY "Anyone can view profile pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');
