-- Username and Email validation functions
-- Run this THIRD in Supabase SQL Editor

-- Check if username is available (case-insensitive)
CREATE OR REPLACE FUNCTION check_username_available(username_to_check TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    username_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM users 
        WHERE LOWER(username) = LOWER(username_to_check)
    ) INTO username_exists;
    
    RETURN NOT username_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION check_username_available(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_username_available(TEXT) TO anon;

-- Check if email is available (case-insensitive)
CREATE OR REPLACE FUNCTION check_email_available(email_to_check TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    email_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM users 
        WHERE LOWER(email) = LOWER(email_to_check)
    ) INTO email_exists;
    
    RETURN NOT email_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION check_email_available(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_email_available(TEXT) TO anon;