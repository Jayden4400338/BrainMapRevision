
const supabase = window.supabaseClient || window.supabase?.createClient(
    'https://qqbyxydxxcuklakvjlfr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxYnl4eWR4eGN1a2xha3ZqbGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjg2MTYsImV4cCI6MjA4NDYwNDYxNn0.2I-uy7ghGa6Ou7uuzDfpYbd75qrNivlBEQBthilYHxw'
);


/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {Object} - {valid: boolean, error: string}
 */
function validateUsernameFormat(username) {
    if (!username || username.trim().length === 0) {
        return { valid: false, error: 'Username is required' };
    }
    
    if (username.length < 3) {
        return { valid: false, error: 'Username must be at least 3 characters' };
    }
    
    if (username.length > 50) {
        return { valid: false, error: 'Username must be less than 50 characters' };
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
    }
    
    return { valid: true };
}

/**
 * Check if username is available in database
 * @param {string} username - Username to check
 * @returns {Promise<boolean>} - True if available, false if taken
 */
async function isUsernameAvailable(username) {
    try {
        // Use RPC function for case-insensitive check
        const { data, error } = await supabase
            .rpc('check_username_available', { username_to_check: username });
        
        if (error) {
            console.error('Username check error:', error);
            // Fallback to direct query if RPC fails
            const { data: users, error: queryError } = await supabase
                .from('users')
                .select('username')
                .ilike('username', username)
                .limit(1);
            
            if (queryError) throw queryError;
            return users.length === 0;
        }
        
        return data === true;
    } catch (error) {
        console.error('Error checking username availability:', error);
        // On error, assume not available to be safe
        return false;
    }
}

/**
 * Check if email is available in database
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} - True if available, false if taken
 */
async function isEmailAvailable(email) {
    try {
        // Use RPC function for case-insensitive check
        const { data, error } = await supabase
            .rpc('check_email_available', { email_to_check: email });
        
        if (error) {
            console.error('Email check error:', error);
            // Fallback to direct query if RPC fails
            const { data: users, error: queryError } = await supabase
                .from('users')
                .select('email')
                .ilike('email', email)
                .limit(1);
            
            if (queryError) throw queryError;
            return users.length === 0;
        }
        
        return data === true;
    } catch (error) {
        console.error('Error checking email availability:', error);
        return false;
    }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {Object} - {valid: boolean, error: string}
 */
function validateEmailFormat(email) {
    if (!email || email.trim().length === 0) {
        return { valid: false, error: 'Email is required' };
    }
    
    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, error: 'Please enter a valid email address' };
    }
    
    return { valid: true };
}

/**
 * Validate password
 * @param {string} password - Password to validate
 * @param {string} confirmPassword - Password confirmation
 * @returns {Object} - {valid: boolean, error: string}
 */
function validatePassword(password, confirmPassword) {
    if (!password || password.length === 0) {
        return { valid: false, error: 'Password is required' };
    }
    
    if (password.length < 8) {
        return { valid: false, error: 'Password must be at least 8 characters' };
    }
    
    if (confirmPassword && password !== confirmPassword) {
        return { valid: false, error: 'Passwords do not match' };
    }
    
    return { valid: true };
}


/**
 * Sign up a new user
 * @param {Object} userData - User data object
 * @returns {Promise<Object>} - {success: boolean, user: Object, error: string}
 */
async function signUp(userData) {
    const { username, email, password, confirmPassword, role, yearGroup } = userData;
    
    try {
        // Validate username format
        const usernameValidation = validateUsernameFormat(username);
        if (!usernameValidation.valid) {
            throw new Error(usernameValidation.error);
        }
        
        // Validate email format
        const emailValidation = validateEmailFormat(email);
        if (!emailValidation.valid) {
            throw new Error(emailValidation.error);
        }
        
        // Validate password
        const passwordValidation = validatePassword(password, confirmPassword);
        if (!passwordValidation.valid) {
            throw new Error(passwordValidation.error);
        }
        
        // Validate year group for students
        if (role === 'student' && !yearGroup) {
            throw new Error('Please select your year group');
        }
        
        // Check username availability
        const usernameAvailable = await isUsernameAvailable(username);
        if (!usernameAvailable) {
            throw new Error('Username is already taken. Please choose another one.');
        }
        
        // Check email availability
        const emailAvailable = await isEmailAvailable(email);
        if (!emailAvailable) {
            throw new Error('Email is already registered. Please use another email or try logging in.');
        }
        
        // Sign up with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username,
                    role: role,
                    year_group: role === 'student' ? yearGroup : null
                }
            }
        });
        
        if (error) throw error;
        
        // The database trigger will create the user profile automatically
        // But we can verify it was created
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();
        
        if (profileError) {
            console.warn('Profile verification warning:', profileError);
        }
        
        return {
            success: true,
            user: data.user,
            profile: profile
        };
        
    } catch (error) {
        console.error('Sign up error:', error);
        return {
            success: false,
            error: error.message || 'An error occurred during sign up'
        };
    }
}


/**
 * Sign in a user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {boolean} rememberMe - Remember user session
 * @returns {Promise<Object>} - {success: boolean, user: Object, error: string}
 */
async function signIn(email, password, rememberMe = false) {
    try {
        // Validate inputs
        if (!email || !password) {
            throw new Error('Email and password are required');
        }
        
        // Sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // Update last login time
        await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', data.user.id);
        
        // Store session preference
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
        }
        
        return {
            success: true,
            user: data.user
        };
        
    } catch (error) {
        console.error('Login error:', error);
        return {
            success: false,
            error: error.message || 'Invalid email or password'
        };
    }
}

/**
 * Sign out the current user
 * @returns {Promise<Object>} - {success: boolean, error: string}
 */
async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        // Clear local storage
        localStorage.removeItem('rememberMe');
        
        return { success: true };
        
    } catch (error) {
        console.error('Sign out error:', error);
        return {
            success: false,
            error: error.message || 'Failed to sign out'
        };
    }
}



/**
 * Get the current authenticated user
 * @returns {Promise<Object|null>} - User object or null
 */
async function getCurrentUser() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch (error) {
        console.error('Get user error:', error);
        return null;
    }
}

/**
 * Get the current user's profile from database
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - User profile or null
 */
async function getUserProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('Get profile error:', error);
        return null;
    }
}



/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} - True if authenticated
 */
async function isAuthenticated() {
    const user = await getCurrentUser();
    return user !== null;
}



/**
 * Request password reset email
 * @param {string} email - User email
 * @returns {Promise<Object>} - {success: boolean, error: string}
 */
async function resetPassword(email) {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/auth/reset-password.html'
        });
        
        if (error) throw error;
        
        return { success: true };
        
    } catch (error) {
        console.error('Password reset error:', error);
        return {
            success: false,
            error: error.message || 'Failed to send reset email'
        };
    }
}

/**
 * Update user password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - {success: boolean, error: string}
 */
async function updatePassword(newPassword) {
    try {
        if (newPassword.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }
        
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (error) throw error;
        
        return { success: true };
        
    } catch (error) {
        console.error('Update password error:', error);
        return {
            success: false,
            error: error.message || 'Failed to update password'
        };
    }
}



if (typeof window !== 'undefined') {
    window.BrainMapAuth = {
        signUp,
        signIn,
        signOut,
        getCurrentUser,
        getUserProfile,
        isAuthenticated,
        resetPassword,
        updatePassword,
        validateUsernameFormat,
        validateEmailFormat,
        validatePassword,
        isUsernameAvailable,
        isEmailAvailable
    };
}