(() => {
  const supabaseClient = window.supabaseClient;

  if (!supabaseClient) {
    console.error('❌ Supabase not initialized!');
    const currentPath = window.location.pathname;
    if (currentPath.includes('/classroom/')) {
      window.location.href = '../../auth/login.html';
    } else {
      window.location.href = '../auth/login.html';
    }
    return;
  }

  // DOM Elements
  const createForm = document.getElementById('createClassroomForm');
  const submitBtn = document.getElementById('submitBtn');
  const errorMessage = document.getElementById('errorMessage');
  const successMessage = document.getElementById('successMessage');
  const inviteCodeDisplay = document.getElementById('inviteCodeDisplay');
  const subjectSelect = document.getElementById('subjectId');

  let currentUser = null;

  // Check authentication and role
  async function checkAuthentication() {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();

      if (error) throw error;

      if (!session) {
        console.log('No session found, redirecting to login...');
        const currentPath = window.location.pathname;
        if (currentPath.includes('/classroom/')) {
          window.location.href = '../../auth/login.html';
        } else {
          window.location.href = '../auth/login.html';
        }
        return false;
      }

      currentUser = session.user;
      console.log('✅ User authenticated:', currentUser.email);

      // Check if user is a teacher
      const { data: profile, error: profileError } = await supabaseClient
        .from('users')
        .select('role, roles')
        .eq('id', currentUser.id)
        .single();

      if (profileError) throw profileError;

      const roles = Array.isArray(profile?.roles) ? profile.roles : [profile?.role];
      const isTeacher = roles.includes('teacher');
      if (!isTeacher) {
        console.log('User is not a teacher, redirecting...');
        const currentPath = window.location.pathname;
        if (currentPath.includes('/classroom/')) {
          window.location.href = '../dashboard.html';
        } else {
          window.location.href = 'dashboard.html';
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Auth error:', error);
      showError('Authentication failed. Please log in again.');
      setTimeout(() => {
        const currentPath = window.location.pathname;
        if (currentPath.includes('/classroom/')) {
          window.location.href = '../../auth/login.html';
        } else {
          window.location.href = '../auth/login.html';
        }
      }, 2000);
      return false;
    }
  }

  // Show error message
  function showError(message) {
    if (errorMessage) {
      errorMessage.textContent = message;
      errorMessage.style.display = 'block';
    }
    if (successMessage) {
      successMessage.style.display = 'none';
    }
    console.error('❌', message);
  }

  // Show success message
  function showSuccess(inviteCode) {
    if (successMessage) {
      successMessage.style.display = 'block';
    }
    if (errorMessage) {
      errorMessage.style.display = 'none';
    }
    if (inviteCodeDisplay && inviteCode) {
      inviteCodeDisplay.textContent = inviteCode;
    }
    
    // Store invite code for fullscreen display
    window.currentInviteCode = inviteCode;
    
    console.log('✅ Classroom created with invite code:', inviteCode);
  }

  // Fullscreen invite code display
  const fullscreenModal = document.getElementById('fullscreenModal');
  const fullscreenInviteCode = document.getElementById('fullscreenInviteCode');
  const showFullscreenBtn = document.getElementById('showFullscreenBtn');
  const closeFullscreen = document.getElementById('closeFullscreen');

  if (showFullscreenBtn) {
    showFullscreenBtn.addEventListener('click', () => {
      if (window.currentInviteCode && fullscreenInviteCode) {
        fullscreenInviteCode.textContent = window.currentInviteCode;
        if (fullscreenModal) {
          fullscreenModal.style.display = 'flex';
          // Prevent body scroll when modal is open
          document.body.style.overflow = 'hidden';
        }
      }
    });
  }

  if (closeFullscreen) {
    closeFullscreen.addEventListener('click', () => {
      if (fullscreenModal) {
        fullscreenModal.style.display = 'none';
        document.body.style.overflow = '';
      }
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && fullscreenModal && fullscreenModal.style.display === 'flex') {
      fullscreenModal.style.display = 'none';
      document.body.style.overflow = '';
    }
  });

  // Load subjects
  async function loadSubjects() {
    try {
      const { data: subjects, error } = await supabaseClient
        .from('subjects')
        .select('id, name, slug')
        .order('name', { ascending: true });

      if (error) {
        console.warn('Could not load subjects:', error);
        return;
      }

      if (!subjectSelect) return;

      // Clear existing options except the first one
      subjectSelect.innerHTML = '<option value="">No specific subject (General)</option>';

      if (subjects && subjects.length > 0) {
        subjects.forEach(subject => {
          const option = document.createElement('option');
          option.value = subject.id;
          option.textContent = subject.name;
          subjectSelect.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  }

  // Handle form submission
  async function handleSubmit(e) {
    e.preventDefault();

    if (!currentUser) {
      showError('You must be logged in to create a classroom.');
      return;
    }

    // Get form values
    const classroomName = document.getElementById('classroomName').value.trim();
    const subjectId = document.getElementById('subjectId').value;
    const yearGroup = document.getElementById('yearGroup').value;

    // Validation
    if (!classroomName) {
      showError('Please enter a classroom name.');
      return;
    }

    if (classroomName.length > 200) {
      showError('Classroom name must be 200 characters or less.');
      return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Creating...</span>';
    errorMessage.style.display = 'none';

    try {
      // Create classroom (invite code will be auto-generated by trigger)
      const classroomData = {
        teacher_id: currentUser.id,
        name: classroomName,
        subject_id: subjectId ? parseInt(subjectId) : null,
        year_group: yearGroup || null
      };

      console.log('Creating classroom:', classroomData);

      const { data: classroom, error } = await supabaseClient
        .from('classrooms')
        .insert(classroomData)
        .select()
        .single();

      if (error) {
        console.error('Error creating classroom:', error);
        
        // Handle specific errors
        if (error.code === '23505') {
          throw new Error('A classroom with this name already exists. Please choose a different name.');
        } else if (error.code === '42501' || error.message?.includes('permission denied')) {
          throw new Error('Permission denied. Please ensure you are logged in as a teacher and RLS policies are set up correctly.');
        } else if (error.code === '42P01') {
          throw new Error('Classrooms table not found. Please run the database schema setup.');
        } else {
          throw error;
        }
      }

      if (!classroom) {
        throw new Error('Failed to create classroom. Please try again.');
      }

      console.log('✅ Classroom created:', classroom);

      // Show success message with invite code
      showSuccess(classroom.invite_code);

      // Reset form
      createForm.reset();

      // Scroll to success message
      successMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      // Optionally redirect after a delay
      setTimeout(() => {
        if (confirm('Classroom created! Would you like to go to your classroom dashboard?')) {
          window.location.href = 'dashboard.html';
        }
      }, 3000);

    } catch (error) {
      console.error('❌ Error creating classroom:', error);
      showError(error.message || 'Failed to create classroom. Please try again.');
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <span>Create Classroom</span>
        <svg
          class="btn-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      `;
    }
  }

  // Initialize
  async function init() {
    const isAuth = await checkAuthentication();
    if (!isAuth) return;

    await loadSubjects();

    if (createForm) {
      createForm.addEventListener('submit', handleSubmit);
    }
  }

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
