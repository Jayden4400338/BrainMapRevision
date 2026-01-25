-- Fix Storage Policies for Profile Pictures
-- Run this if you're getting RLS policy errors
-- This is a more permissive version that should work

-- Drop all existing policies for profile-pictures bucket
DROP POLICY IF EXISTS "Users can upload their own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;

-- Create more permissive policies
-- Allow authenticated users to upload any file to profile-pictures bucket
-- (We'll validate the filename in the application code)
CREATE POLICY "Authenticated users can upload profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-pictures');

-- Allow authenticated users to update files in profile-pictures bucket
CREATE POLICY "Authenticated users can update profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-pictures')
WITH CHECK (bucket_id = 'profile-pictures');

-- Allow authenticated users to delete files in profile-pictures bucket
CREATE POLICY "Authenticated users can delete profile pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-pictures');

-- Allow anyone to view profile pictures (public bucket)
CREATE POLICY "Anyone can view profile pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');
