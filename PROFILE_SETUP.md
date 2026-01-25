# Profile Page Setup Guide

## Files Created

### 1. Database Migration Files
- **`supabase/migrations/add_profile_picture.sql`** - Adds `profile_picture_url` column to users table
- **`supabase/migrations/setup_storage.sql`** - Creates Supabase Storage bucket and policies for profile pictures

### 2. Profile Page Files
- **`pages/profile.html`** - Main profile page HTML
- **`assets/css/profile.css`** - Profile page styles
- **`assets/js/profile.js`** - Profile page functionality

### 3. Updated Files
- **`script.js`** - Added navbar profile picture loading functionality
- **`style.css`** - Added navbar profile picture styles
- **`pages/dashboard.html`** - Added nav-profile div
- **`pages/subjects.html`** - Added nav-profile div
- **`pages/past-papers.html`** - Added nav-profile div
- **`pages/quizzes.html`** - Added nav-profile div
- **`pages/revision-boards.html`** - Added nav-profile div

## Setup Instructions

### Step 1: Run Database Migrations

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run `supabase/migrations/add_profile_picture.sql` first:
   ```sql
   -- This adds the profile_picture_url column to users table
   ```

4. Then run `supabase/migrations/setup_storage.sql`:
   ```sql
   -- This creates the storage bucket and policies
   ```

### Step 2: Create Storage Bucket (if not created automatically)

1. Go to **Storage** in Supabase dashboard
2. Click **New bucket**
3. Name: `profile-pictures`
4. Make it **Public** (checked)
5. Click **Create bucket**

### Step 3: Verify Storage Policies

The SQL migration should have created the policies, but verify in **Storage** → **profile-pictures** → **Policies**:

- ✅ Users can upload their own profile picture
- ✅ Users can update their own profile picture
- ✅ Users can delete their own profile picture
- ✅ Anyone can view profile pictures (public)

## Features

### Profile Page Features

1. **Profile Picture Upload**
   - Click on avatar to upload new picture
   - Supports all image formats
   - Max file size: 5MB
   - Automatically updates navbar

2. **Personal Information**
   - Change username (with validation)
   - Update year group
   - Email is read-only (cannot be changed)

3. **Password Change**
   - Change password with current password verification
   - Minimum 8 characters
   - Password confirmation required

4. **Account Settings**
   - View role (Student/Teacher)
   - Member since date
   - Last login timestamp

### Navbar Profile Picture

- Automatically displays on all pages with navbar
- Shows user's profile picture if uploaded
- Shows initials placeholder if no picture
- Clickable - links to profile page
- Updates automatically when profile picture changes

## Usage

### For Users

1. Navigate to **Profile** page
2. Click on avatar to upload profile picture
3. Edit username or year group
4. Click **Save Changes**
5. Change password using the password form
6. Profile picture will appear in navbar on all pages

### For Developers

The profile picture is loaded automatically by `script.js` on page load. The function `loadNavbarProfile()` checks:
- If user is authenticated
- Gets user profile from database
- Displays picture or initials placeholder
- Handles different page paths (root vs pages/)

## Database Schema

The `users` table now includes:
```sql
profile_picture_url VARCHAR(500) -- URL to profile picture in Supabase Storage
```

## Storage Structure

Files are stored in the `profile-pictures` bucket with naming:
```
{user_id}-{timestamp}.{extension}
```

Example: `123e4567-e89b-12d3-a456-426614174000-1704067200000.jpg`

## Security

- ✅ Only authenticated users can upload/update/delete their own pictures
- ✅ Profile pictures are public (anyone can view)
- ✅ File size limited to 5MB
- ✅ Only image files accepted
- ✅ Username validation (3-50 chars, alphanumeric + underscore)
- ✅ Password minimum 8 characters

## Troubleshooting

### Profile Picture Upload Issues

**Error: "new row violates row-level security policy"**

This means the storage RLS policies aren't set up correctly. Fix it by:

1. **Option 1: Run the fix script (Recommended)**
   - Go to Supabase SQL Editor
   - Run `supabase/migrations/fix_storage_policies.sql`
   - This creates more permissive policies that will work

2. **Option 2: Manually fix policies**
   - Go to Supabase Dashboard → Storage → profile-pictures → Policies
   - Delete all existing policies
   - Create new policy:
     - Policy name: "Allow authenticated uploads"
     - Allowed operation: INSERT
     - Target roles: authenticated
     - USING expression: `bucket_id = 'profile-pictures'`
     - WITH CHECK expression: `bucket_id = 'profile-pictures'`
   - Repeat for UPDATE and DELETE operations
   - For SELECT, allow public access

3. **Verify bucket exists:**
   - Go to Storage in Supabase dashboard
   - Make sure `profile-pictures` bucket exists
   - Make sure it's set to **Public**

**Other profile picture issues:**
- Check storage bucket exists and is public
- Verify storage policies are set correctly
- Check browser console for errors
- Ensure file is under 5MB
- Make sure you've run `add_profile_picture.sql` migration

**Navbar profile picture not showing:**
- Check that `navProfile` div exists in navbar
- Verify Supabase client is initialized
- Check browser console for errors
- Ensure user is authenticated

**Username change fails:**
- Check username is available (not taken)
- Verify username meets format requirements
- Check browser console for errors
