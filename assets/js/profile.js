// Profile Page JavaScript
// Handles profile picture upload, username/password changes

(function () {
  'use strict';

  // Get Supabase client
  const supabase = window.supabaseClient;
  let currentUser = null;
  let userProfile = null;

  // DOM Elements
  const profileAvatar = document.getElementById('profileAvatar');
  const avatarInput = document.getElementById('avatarInput');
  const profileUsername = document.getElementById('profileUsername');
  const profileEmail = document.getElementById('profileEmail');
  const profileLevel = document.getElementById('profileLevel');
  const profileXP = document.getElementById('profileXP');
  const profileCoins = document.getElementById('profileCoins');
  const usernameInput = document.getElementById('usernameInput');
  const emailInput = document.getElementById('emailInput');
  const yearGroupInput = document.getElementById('yearGroupInput');
  const personalInfoForm = document.getElementById('personalInfoForm');
  const passwordForm = document.getElementById('passwordForm');
  const currentPasswordInput = document.getElementById('currentPasswordInput');
  const newPasswordInput = document.getElementById('newPasswordInput');
  const confirmPasswordInput = document.getElementById('confirmPasswordInput');
  const userRole = document.getElementById('userRole');
  const memberSince = document.getElementById('memberSince');
  const lastLogin = document.getElementById('lastLogin');
  const savePersonalBtn = document.getElementById('savePersonalBtn');
  const savePasswordBtn = document.getElementById('savePasswordBtn');

  // Initialize
  document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadUserProfile();
    setupEventListeners();
  });

  /**
   * Check if user is authenticated
   */
  async function checkAuth() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;
      if (!user) {
        window.location.href = '../auth/login.html';
        return;
      }

      currentUser = user;
    } catch (error) {
      console.error('Auth check error:', error);
      window.location.href = '../auth/login.html';
    }
  }

  /**
   * Load user profile from database
   */
  async function loadUserProfile() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) throw error;

      userProfile = data;
      updateProfileUI();
      refreshAvatarAppearance();
    } catch (error) {
      console.error('Error loading profile:', error);
      showMessage('Failed to load profile. Please refresh the page.', 'error');
    }
  }

  /**
   * Update profile UI with user data
   */
  function updateProfileUI() {
    if (!userProfile) return;

    // Update avatar
    if (userProfile.profile_picture_url) {
      profileAvatar.src = userProfile.profile_picture_url;
      profileAvatar.style.display = 'block';
    } else {
      // Use default avatar with initials
      const initials = userProfile.username
        .substring(0, 2)
        .toUpperCase();
      profileAvatar.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="150" height="150" fill="%23${getAccentColor()}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="60" fill="white" font-weight="600">${initials}</text></svg>`;
    }

    // Update text fields
    profileUsername.textContent = userProfile.username || 'User';
    profileEmail.textContent = userProfile.email || '';
    profileLevel.textContent = userProfile.level || 1;
    profileXP.textContent = userProfile.xp || 0;
    profileCoins.textContent = userProfile.brain_coins || 0;

    // Update form inputs
    usernameInput.value = userProfile.username || '';
    emailInput.value = userProfile.email || '';
    yearGroupInput.value = userProfile.year_group || '';

    // Update settings
    userRole.textContent =
      userProfile.role === 'admin'
        ? 'Admin'
        : userProfile.role === 'teacher'
          ? 'Teacher'
          : 'Student';
    
    if (userProfile.created_at) {
      const createdDate = new Date(userProfile.created_at);
      memberSince.textContent = createdDate.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    if (userProfile.last_login) {
      const loginDate = new Date(userProfile.last_login);
      lastLogin.textContent = loginDate.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      lastLogin.textContent = 'Never';
    }

    // Update navbar profile picture
    updateNavbarProfile();
  }

  /**
   * Get accent color for avatar (from CSS variable)
   */
  function getAccentColor() {
    const style = getComputedStyle(document.documentElement);
    const accentColor = style.getPropertyValue('--accent-primary').trim();
    // Convert color to hex if needed
    if (accentColor.startsWith('#')) {
      return accentColor.substring(1);
    }
    return '6366f1'; // Default purple
  }

  /**
   * Update navbar profile picture
   */
  function updateNavbarProfile() {
    const navProfile = document.getElementById('navProfile');
    if (!navProfile) return;

    if (userProfile?.profile_picture_url) {
      navProfile.innerHTML = `<img src="${userProfile.profile_picture_url}" alt="Profile" class="nav-profile-picture" onclick="window.location.href='profile.html'">`;
    } else {
      const initials = (userProfile?.username || 'U')
        .substring(0, 2)
        .toUpperCase();
      navProfile.innerHTML = `<div class="nav-profile-placeholder" onclick="window.location.href='profile.html'">${initials}</div>`;
    }
  }

  async function refreshAvatarAppearance() {
    if (!currentUser) return;
    try {
      const appearance = await window.fetchAvatarAppearanceForUser?.(currentUser.id);
      if (appearance) {
        window.applyAvatarAppearance?.(profileAvatar, appearance);
        const navAvatar = document.querySelector('#navProfile .nav-profile-picture, #navProfile .nav-profile-placeholder');
        window.applyAvatarAppearance?.(navAvatar, appearance);
      }
    } catch (error) {
      console.warn('Avatar appearance refresh failed:', error);
    }
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Avatar upload
    avatarInput.addEventListener('change', handleAvatarUpload);

    // Personal info form
    personalInfoForm.addEventListener('submit', handlePersonalInfoSubmit);

    // Password form
    passwordForm.addEventListener('submit', handlePasswordChange);

    // Username validation
    usernameInput.addEventListener('input', validateUsername);
  }

  /**
   * Handle avatar upload
   */
  async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showMessage('Please select an image file.', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('Image size must be less than 5MB.', 'error');
      return;
    }

    try {
      savePersonalBtn.disabled = true;
      savePersonalBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

      // Delete old profile picture if it exists
      if (userProfile?.profile_picture_url) {
        try {
          // Extract filename from URL
          const oldUrl = userProfile.profile_picture_url;
          const urlParts = oldUrl.split('/');
          const oldFileName = urlParts[urlParts.length - 1].split('?')[0];
          
          // Try to delete old file (ignore errors if file doesn't exist)
          await supabase.storage
            .from('profile-pictures')
            .remove([oldFileName]);
        } catch (deleteError) {
          // Ignore delete errors - file might not exist
          console.log('Could not delete old profile picture:', deleteError);
        }
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false, // Don't use upsert, upload new file each time
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('profile-pictures').getPublicUrl(filePath);

      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_picture_url: publicUrl })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      // Update local profile
      userProfile.profile_picture_url = publicUrl;
      profileAvatar.src = publicUrl;

      // Update navbar
      updateNavbarProfile();
      await refreshAvatarAppearance();

      showMessage('Profile picture updated successfully!', 'success');
    } catch (error) {
      console.error('Avatar upload error:', error);
      showMessage(
        'Failed to upload profile picture. Please try again.',
        'error'
      );
    } finally {
      savePersonalBtn.disabled = false;
      savePersonalBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
      avatarInput.value = '';
    }
  }

  /**
   * Validate username format
   */
  function validateUsername() {
    const username = usernameInput.value.trim();
    const validation = validateUsernameFormat(username);

    if (username && !validation.valid) {
      usernameInput.setCustomValidity(validation.error);
      usernameInput.style.borderColor = '#f56565';
    } else {
      usernameInput.setCustomValidity('');
      usernameInput.style.borderColor = '';
    }
  }

  /**
   * Validate username format (reusable function)
   */
  function validateUsernameFormat(username) {
    if (!username || username.trim().length === 0) {
      return { valid: false, error: 'Username is required' };
    }

    if (username.length < 3) {
      return { valid: false, error: 'Username must be at least 3 characters' };
    }

    if (username.length > 50) {
      return {
        valid: false,
        error: 'Username must be less than 50 characters',
      };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return {
        valid: false,
        error: 'Username can only contain letters, numbers, and underscores',
      };
    }

    return { valid: true };
  }

  /**
   * Handle personal info form submission
   */
  async function handlePersonalInfoSubmit(event) {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const yearGroup = yearGroupInput.value;

    // Validate username
    const validation = validateUsernameFormat(username);
    if (!validation.valid) {
      showMessage(validation.error, 'error');
      return;
    }

    // Check if username changed and is available
    if (username !== userProfile.username) {
      const isAvailable = await checkUsernameAvailability(username);
      if (!isAvailable) {
        showMessage('Username is already taken. Please choose another.', 'error');
        return;
      }
    }

    try {
      savePersonalBtn.disabled = true;
      savePersonalBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

      const { error } = await supabase
        .from('users')
        .update({
          username: username,
          year_group: yearGroup || null,
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Reload profile
      await loadUserProfile();

      showMessage('Profile updated successfully!', 'success');
    } catch (error) {
      console.error('Update error:', error);
      showMessage('Failed to update profile. Please try again.', 'error');
    } finally {
      savePersonalBtn.disabled = false;
      savePersonalBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    }
  }

  /**
   * Check if username is available
   */
  async function checkUsernameAvailability(username) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .ilike('username', username)
        .neq('id', currentUser.id)
        .limit(1);

      if (error) throw error;

      return data.length === 0;
    } catch (error) {
      console.error('Username check error:', error);
      return false;
    }
  }

  /**
   * Handle password change
   */
  async function handlePasswordChange(event) {
    event.preventDefault();

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      showMessage('New passwords do not match.', 'error');
      return;
    }

    // Validate password length
    if (newPassword.length < 8) {
      showMessage('Password must be at least 8 characters long.', 'error');
      return;
    }

    try {
      savePasswordBtn.disabled = true;
      savePasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

      // Update password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // Clear form
      passwordForm.reset();

      showMessage('Password updated successfully!', 'success');
    } catch (error) {
      console.error('Password update error:', error);
      showMessage(
        error.message || 'Failed to update password. Please try again.',
        'error'
      );
    } finally {
      savePasswordBtn.disabled = false;
      savePasswordBtn.innerHTML = '<i class="fas fa-key"></i> Update Password';
    }
  }

  /**
   * Show message to user
   */
  function showMessage(message, type = 'success') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach((msg) => msg.remove());

    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
      <span>${message}</span>
    `;

    // Insert at top of first section
    const firstSection = document.querySelector('.profile-section');
    if (firstSection) {
      firstSection.querySelector('.section-content').prepend(messageDiv);
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      messageDiv.remove();
    }, 5000);
  }

  // Make updateNavbarProfile available globally for script.js
  window.updateNavbarProfile = updateNavbarProfile;
})();
