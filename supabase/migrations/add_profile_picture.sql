-- Migration: Add profile_picture_url to users table
-- Run this in your Supabase SQL Editor

-- Add profile_picture_url column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_profile_picture ON users(profile_picture_url) WHERE profile_picture_url IS NOT NULL;

-- Add comment
COMMENT ON COLUMN users.profile_picture_url IS 'URL to user profile picture stored in Supabase Storage';
