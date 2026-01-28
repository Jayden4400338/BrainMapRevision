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
  const joinForm = document.getElementById('joinClassroomForm');
  const submitBtn = document.getElementById('submitBtn');
  const errorMessage = document.getElementById('errorMessage');
  const successMessage = document.getElementById('successMessage');
  const inviteCodeInput = document.getElementById('inviteCode');
  const myClassroomsList = document.getElementById('myClassroomsList');
  const noClassrooms = document.getElementById('noClassrooms');

  let currentUser = null;

  // Check authentication
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

      const { data: profile } = await supabaseClient
        .from('users')
        .select('role')
        .eq('id', currentUser.id)
        .single();

      // Only students can join classrooms; teachers are redirected
      if (profile?.role === 'teacher') {
        window.userRole = 'teacher';
        return true; // still "authenticated", but join form will be hidden and message shown
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
  function showSuccess() {
    if (successMessage) {
      successMessage.style.display = 'block';
    }
    if (errorMessage) {
      errorMessage.style.display = 'none';
    }
    console.log('✅ Successfully joined classroom');
    
    // Reload classrooms list
    loadMyClassrooms();
    
    // Reset form after a delay
    setTimeout(() => {
      if (joinForm) joinForm.reset();
      if (inviteCodeInput) inviteCodeInput.focus();
    }, 2000);
  }

  // Handle form submission
  async function handleSubmit(e) {
    e.preventDefault();

    if (!currentUser) {
      showError('You must be logged in to join a classroom.');
      return;
    }

    // Get invite code
    let inviteCode = inviteCodeInput.value.trim().toUpperCase();
    
    // Remove any spaces or dashes
    inviteCode = inviteCode.replace(/[\s\-]/g, '');

    // Validation
    if (!inviteCode) {
      showError('Please enter an invite code.');
      return;
    }

    if (inviteCode.length < 6 || inviteCode.length > 10) {
      showError('Invite code should be between 6 and 10 characters.');
      return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Joining...</span>';
    errorMessage.style.display = 'none';

    try {
      // Try using the function first (if it exists)
      try {
        const { data: functionResult, error: functionError } = await supabaseClient
          .rpc('join_classroom_by_code', {
            p_student_id: currentUser.id,
            p_invite_code: inviteCode
          });

        if (!functionError && functionResult && functionResult.length > 0) {
          const result = functionResult[0];
          if (result.success) {
            showSuccess();
            return;
          } else {
            throw new Error(result.message || 'Failed to join classroom');
          }
        }
        
        // If function returned error, log it but continue to fallback
        if (functionError) {
          console.warn('Function error (will try fallback):', functionError);
        }
      } catch (functionErr) {
        console.warn('Function call failed (will try fallback):', functionErr);
        // Continue to fallback method
      }

      // Fallback: Use helper function to get classroom by invite code
      console.log('Function not available, using helper function...');

      // Try using the helper function to get classroom
      const { data: classroomData, error: classroomError } = await supabaseClient
        .rpc('get_classroom_by_invite_code', {
          p_invite_code: inviteCode
        });

      if (classroomError) {
        console.error('Error getting classroom:', classroomError);
        if (classroomError.code === 'PGRST301' || classroomError.status === 406 || classroomError.message?.includes('function') || classroomError.message?.includes('not found')) {
          throw new Error('Database function not found. Please run fix_classroom_join.sql in Supabase SQL Editor to create the required function.');
        } else if (classroomError.message?.includes('permission') || classroomError.message?.includes('row-level security')) {
          throw new Error('Permission denied. Please run fix_classroom_join.sql in Supabase SQL Editor.');
        } else {
          throw new Error('Invalid invite code. Please check the code and try again. Error: ' + classroomError.message);
        }
      }
      
      if (!classroomData || classroomData.length === 0) {
        throw new Error('Invalid invite code. Please check the code and try again.');
      }

      const classroom = classroomData[0];

      // Check if already a member (optional check, insert will fail if duplicate anyway)
      try {
        const { data: existing } = await supabaseClient
          .from('classroom_students')
          .select('id')
          .eq('classroom_id', classroom.id)
          .eq('student_id', currentUser.id)
          .maybeSingle();

        if (existing) {
          throw new Error('You are already a member of this classroom.');
        }
      } catch (checkErr) {
        // If check fails due to RLS, that's okay - we'll try insert anyway
        if (checkErr.message?.includes('already a member')) {
          throw checkErr;
        }
        console.warn('Could not check existing membership:', checkErr);
      }

      // Add student to classroom
      const { error: insertError } = await supabaseClient
        .from('classroom_students')
        .insert({
          classroom_id: classroom.id,
          student_id: currentUser.id
        });

      if (insertError) {
        console.error('Insert error details:', insertError);
        if (insertError.code === '23505') {
          throw new Error('You are already a member of this classroom.');
        } else if (insertError.code === '42501' || insertError.message?.includes('permission denied') || insertError.message?.includes('row-level security')) {
          throw new Error('Permission denied. Please run the fix_classroom_join.sql file in Supabase SQL Editor to set up the required permissions.');
        } else if (insertError.code === 'PGRST301' || insertError.status === 406) {
          throw new Error('Database configuration error. Please ensure the get_classroom_by_invite_code function exists. Run fix_classroom_join.sql in Supabase.');
        } else {
          throw new Error(insertError.message || 'Failed to join classroom. Please try again.');
        }
      }

      showSuccess();

    } catch (error) {
      console.error('❌ Error joining classroom:', error);
      showError(error.message || 'Failed to join classroom. Please try again.');
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <span>Join Classroom</span>
        <svg
          class="btn-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10 17 15 12 10 7"/>
          <line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
      `;
    }
  }

  // Load student's classrooms
  async function loadMyClassrooms() {
    try {
      // Get classrooms where student is a member
      const { data: memberships, error: membershipsError } = await supabaseClient
        .from('classroom_students')
        .select(`
          classroom_id,
          classrooms:classroom_id (
            id,
            name,
            subject_id,
            year_group,
            invite_code,
            created_at,
            subjects:subject_id (
              id,
              name
            )
          )
        `)
        .eq('student_id', currentUser.id)
        .order('joined_at', { ascending: false });

      if (membershipsError) {
        console.error('Error loading memberships:', membershipsError);
        // Try alternative query without nested select
        const { data: simpleMemberships } = await supabaseClient
          .from('classroom_students')
          .select('classroom_id')
          .eq('student_id', currentUser.id);

        if (simpleMemberships && simpleMemberships.length > 0) {
          const classroomIds = simpleMemberships.map(m => m.classroom_id);
          const { data: classrooms } = await supabaseClient
            .from('classrooms')
            .select('*')
            .in('id', classroomIds)
            .order('created_at', { ascending: false });

          displayClassrooms(classrooms || []);
          return;
        }
      }

      if (!memberships || memberships.length === 0) {
        if (myClassroomsList) myClassroomsList.style.display = 'none';
        if (noClassrooms) noClassrooms.style.display = 'block';
        return;
      }

      // Extract classrooms from memberships
      const classrooms = memberships
        .map(m => m.classrooms)
        .filter(c => c !== null);

      displayClassrooms(classrooms);
    } catch (error) {
      console.error('Error loading classrooms:', error);
      if (myClassroomsList) myClassroomsList.style.display = 'none';
      if (noClassrooms) noClassrooms.style.display = 'block';
    }
  }

  // Display classrooms
  function displayClassrooms(classrooms) {
    if (!myClassroomsList) return;

    if (classrooms.length === 0) {
      myClassroomsList.style.display = 'none';
      if (noClassrooms) noClassrooms.style.display = 'block';
      return;
    }

    myClassroomsList.style.display = 'grid';
    if (noClassrooms) noClassrooms.style.display = 'none';

    myClassroomsList.innerHTML = classrooms.map(classroom => {
      const subjectName = classroom.subjects?.name || classroom.subject_id || 'No Subject';
      const yearGroup = classroom.year_group || 'All Years';
      
      return `
        <div class="classroom-card">
          <div class="classroom-header">
            <div class="classroom-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div class="classroom-info">
              <h3 class="classroom-name">${escapeHtml(classroom.name)}</h3>
              <p class="classroom-meta">
                <span class="classroom-subject">${escapeHtml(subjectName)}</span>
                <span class="classroom-separator">•</span>
                <span class="classroom-year">${escapeHtml(yearGroup)}</span>
              </p>
            </div>
          </div>
          <div class="classroom-actions">
            <a href="view.html?id=${classroom.id}" class="btn btn-primary btn-small">View Classroom</a>
          </div>
        </div>
      `;
    }).join('');
  }

  // Escape HTML
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Auto-format invite code input
  if (inviteCodeInput) {
    inviteCodeInput.addEventListener('input', (e) => {
      let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      e.target.value = value;
    });

    inviteCodeInput.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text');
      let value = pasted.toUpperCase().replace(/[^A-Z0-9]/g, '');
      e.target.value = value;
    });
  }

  // Show teacher-only message and hide join form (teachers cannot join classrooms)
  function showTeacherOnlyState() {
    const welcomeSection = document.querySelector('.welcome-section');
    const formContainer = document.querySelector('.form-container');
    if (welcomeSection) {
      welcomeSection.innerHTML = `
        <h1 class="welcome-title">Join a Classroom</h1>
        <div class="notice notice-info" style="margin-top: 16px; padding: 20px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px;">
          <p style="margin: 0; color: var(--text-primary);">
            <strong>Only students can join classrooms.</strong> As a teacher, you create and manage your own classrooms from the dashboard.
          </p>
          <a href="dashboard.html" class="btn btn-primary" style="margin-top: 16px; display: inline-block;">Go to Classroom Dashboard</a>
        </div>
      `;
    }
    if (formContainer) formContainer.style.display = 'none';
    const myClassroomsBlock = document.getElementById('myClassroomsList')?.parentElement;
    if (myClassroomsBlock) myClassroomsBlock.style.display = 'none';
  }

  // Initialize
  async function init() {
    const isAuth = await checkAuthentication();
    if (!isAuth) return;

    // Teachers cannot join; show message and hide form
    const { data: profile } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', currentUser.id)
      .single();
    if (profile?.role === 'teacher') {
      showTeacherOnlyState();
      return;
    }

    await loadMyClassrooms();

    if (joinForm) {
      joinForm.addEventListener('submit', handleSubmit);
    }

    if (inviteCodeInput) {
      inviteCodeInput.focus();
    }
  }

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
