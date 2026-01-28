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

  // Get classroom ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const classroomId = urlParams.get('id');

  if (!classroomId) {
    showError('No classroom ID provided');
    return;
  }

  // DOM Elements
  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const errorMessage = document.getElementById('errorMessage');
  const classroomContent = document.getElementById('classroomContent');
  const classroomName = document.getElementById('classroomName');
  const classroomSubject = document.getElementById('classroomSubject');
  const classroomYear = document.getElementById('classroomYear');
  const teacherSection = document.getElementById('teacherSection');
  const teacherActions = document.getElementById('teacherActions');
  const studentsSection = document.getElementById('studentsSection');
  const inviteCodeBig = document.getElementById('inviteCodeBig');
  const studentsLink = document.getElementById('studentsLink');
  const assignmentsLink = document.getElementById('assignmentsLink');
  const createAssignmentLink = document.getElementById('createAssignmentLink');
  const viewAllStudentsLink = document.getElementById('viewAllStudentsLink');
  const teacherAssignmentsActions = document.getElementById('teacherAssignmentsActions');

  let currentUser = null;
  let userProfile = null;
  let classroomData = null;

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

      // Get user profile
      const { data: profile, error: profileError } = await supabaseClient
        .from('users')
        .select('role, username')
        .eq('id', currentUser.id)
        .single();

      if (profileError) {
        console.warn('Could not load profile:', profileError);
        userProfile = { role: 'student' };
      } else {
        userProfile = profile;
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

  // Show error
  function showError(message) {
    if (loadingState) loadingState.style.display = 'none';
    if (classroomContent) classroomContent.style.display = 'none';
    if (errorState) {
      errorState.style.display = 'block';
      if (errorMessage) errorMessage.textContent = message;
    }
    console.error('❌', message);
  }

  // Load classroom data
  async function loadClassroom() {
    try {
      // Check if user is teacher (can view any classroom they own)
      // or student (can view classrooms they're in)
      let classroom = null;

      if (userProfile.role === 'teacher') {
        // Teachers can view their own classrooms
        const { data, error } = await supabaseClient
          .from('classrooms')
          .select(`
            *,
            subjects:subject_id (
              id,
              name,
              slug
            )
          `)
          .eq('id', classroomId)
          .eq('teacher_id', currentUser.id)
          .single();

        if (error) throw error;
        classroom = data;
      } else {
        // Students can view classrooms they're members of
        // Use the helper function or check membership
        const { data: membership } = await supabaseClient
          .from('classroom_students')
          .select('classroom_id')
          .eq('classroom_id', classroomId)
          .eq('student_id', currentUser.id)
          .single();

        if (!membership) {
          throw new Error('You are not a member of this classroom.');
        }

        // Get classroom using helper function
        const { data: classroomData, error: classroomError } = await supabaseClient
          .rpc('get_classroom_by_invite_code', {
            p_invite_code: 'dummy' // We'll get it another way
          });

        // Alternative: Try to get classroom through a view or function
        // For now, let's use a different approach - get classroom details
        // Since students can't query classrooms directly, we need a function
        
        // Try to get classroom via a function that checks membership
        const { data: classroomResult, error: getError } = await supabaseClient
          .rpc('get_classroom_for_student', {
            p_classroom_id: parseInt(classroomId),
            p_student_id: currentUser.id
          });

        if (!getError && classroomResult && classroomResult.length > 0) {
          classroom = classroomResult[0];
          
          // Get subject info separately
          if (classroom.subject_id) {
            const { data: subject } = await supabaseClient
              .from('subjects')
              .select('id, name, slug')
              .eq('id', classroom.subject_id)
              .single();
            
            if (subject) {
              classroom.subjects = subject;
            }
          }
        } else {
          // Fallback: Get basic info from classroom_students join
          const { data: membership } = await supabaseClient
            .from('classroom_students')
            .select(`
              classroom_id,
              classrooms:classroom_id (
                id,
                name,
                subject_id,
                year_group,
                created_at
              )
            `)
            .eq('classroom_id', classroomId)
            .eq('student_id', currentUser.id)
            .single();

          if (membership && membership.classrooms) {
            classroom = membership.classrooms;
            
            // Get subject if available
            if (classroom.subject_id) {
              const { data: subject } = await supabaseClient
                .from('subjects')
                .select('id, name, slug')
                .eq('id', classroom.subject_id)
                .single();
              
              if (subject) {
                classroom.subjects = subject;
              }
            }
          } else {
            throw new Error('Unable to load classroom. You may not have access to this classroom.');
          }
        }
      }

      if (!classroom) {
        throw new Error('Classroom not found or you do not have access.');
      }

      classroomData = classroom;
      displayClassroom(classroom);
      loadClassroomStats();
      loadAssignments();
      
      if (userProfile.role === 'teacher') {
        loadStudents();
      }

    } catch (error) {
      console.error('❌ Error loading classroom:', error);
      showError(error.message || 'Failed to load classroom. Please try again.');
    }
  }

  // Display classroom
  function displayClassroom(classroom) {
    if (loadingState) loadingState.style.display = 'none';
    if (classroomContent) classroomContent.style.display = 'block';

    // Set classroom name
    if (classroomName) {
      classroomName.textContent = classroom.name || 'Unnamed Classroom';
    }

    // Set subject and year
    const subjectName = classroom.subjects?.name || 'No Subject';
    const yearGroup = classroom.year_group || 'All Years';

    if (classroomSubject) classroomSubject.textContent = subjectName;
    if (classroomYear) classroomYear.textContent = yearGroup;

    // Show teacher section if user is teacher
    const isTeacher = userProfile.role === 'teacher' && classroom.teacher_id === currentUser.id;
    
    if (isTeacher) {
      if (teacherSection) teacherSection.style.display = 'block';
      if (teacherActions) teacherActions.style.display = 'flex';
      if (studentsSection) studentsSection.style.display = 'block';
      if (teacherAssignmentsActions) teacherAssignmentsActions.style.display = 'flex';
      
      // Set invite code
      if (inviteCodeBig && classroom.invite_code) {
        inviteCodeBig.textContent = classroom.invite_code;
      }

      // Update links with classroom ID
      if (studentsLink) studentsLink.href = `students.html?classroom=${classroom.id}`;
      if (assignmentsLink) assignmentsLink.href = `assignments.html?classroom=${classroom.id}`;
      if (createAssignmentLink) createAssignmentLink.href = `assignments.html?classroom=${classroom.id}`;
      if (viewAllStudentsLink) viewAllStudentsLink.href = `students.html?classroom=${classroom.id}`;

      // Store invite code for fullscreen
      window.currentInviteCode = classroom.invite_code;
    } else {
      if (teacherSection) teacherSection.style.display = 'none';
      if (teacherActions) teacherActions.style.display = 'none';
      if (studentsSection) studentsSection.style.display = 'none';
      if (teacherAssignmentsActions) teacherAssignmentsActions.style.display = 'none';
    }
  }

  // Load classroom statistics
  async function loadClassroomStats() {
    try {
      const stats = {
        totalStudents: 0,
        totalAssignments: 0,
        activeAssignments: 0,
        completedSubmissions: 0
      };

      // Get student count
      const { count: studentCount } = await supabaseClient
        .from('classroom_students')
        .select('*', { count: 'exact', head: true })
        .eq('classroom_id', classroomId);

      stats.totalStudents = studentCount || 0;

      // Get assignment counts
      const { count: assignmentCount } = await supabaseClient
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('classroom_id', classroomId);

      stats.totalAssignments = assignmentCount || 0;

      // Get active assignments (due date in future)
      const { count: activeCount } = await supabaseClient
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('classroom_id', classroomId)
        .gte('due_date', new Date().toISOString());

      stats.activeAssignments = activeCount || 0;

      // Get completed submissions
      const { data: assignments } = await supabaseClient
        .from('assignments')
        .select('id')
        .eq('classroom_id', classroomId);

      if (assignments && assignments.length > 0) {
        const assignmentIds = assignments.map(a => a.id);
        const { count: completedCount } = await supabaseClient
          .from('assignment_submissions')
          .select('*', { count: 'exact', head: true })
          .in('assignment_id', assignmentIds);

        stats.completedSubmissions = completedCount || 0;
      }

      // Update UI
      const totalStudentsEl = document.getElementById('totalStudents');
      const totalAssignmentsEl = document.getElementById('totalAssignments');
      const activeAssignmentsEl = document.getElementById('activeAssignments');
      const completedSubmissionsEl = document.getElementById('completedSubmissions');

      if (totalStudentsEl) totalStudentsEl.textContent = stats.totalStudents;
      if (totalAssignmentsEl) totalAssignmentsEl.textContent = stats.totalAssignments;
      if (activeAssignmentsEl) activeAssignmentsEl.textContent = stats.activeAssignments;
      if (completedSubmissionsEl) completedSubmissionsEl.textContent = stats.completedSubmissions;

    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  // Load assignments
  async function loadAssignments() {
    try {
      const assignmentsList = document.getElementById('assignmentsList');
      if (!assignmentsList) return;

      // Get assignments for this classroom
      const { data: assignments, error } = await supabaseClient
        .from('assignments')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading assignments:', error);
        assignmentsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Unable to load assignments</p>';
        return;
      }

      if (!assignments || assignments.length === 0) {
        assignmentsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No assignments yet.</p>';
        return;
      }

      assignmentsList.innerHTML = assignments.map(assignment => {
        const dueDate = assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date';
        const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date();
        
        return `
          <div class="assignment-item">
            <div>
              <h4 style="margin-bottom: 5px; color: var(--text-primary);">${escapeHtml(assignment.title)}</h4>
              <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">
                ${assignment.description || 'No description'}
              </p>
              <p style="margin: 5px 0 0 0; color: var(--text-secondary); font-size: 0.85rem;">
                Due: <span style="color: ${isOverdue ? '#F56565' : 'inherit'}">${dueDate}</span>
              </p>
            </div>
            <div>
              <a href="assignments.html?classroom=${classroomId}&assignment=${assignment.id}" class="btn btn-secondary btn-small">
                View
              </a>
            </div>
          </div>
        `;
      }).join('');

    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  }

  // Load students (teacher only) – uses RPC for name, pfp, year_group
  async function loadStudents() {
    try {
      const studentsList = document.getElementById('studentsList');
      if (!studentsList) return;

      let rows = [];
      const { data: rpcData, error: rpcError } = await supabaseClient
        .rpc('get_classroom_students_with_profiles', {
          p_classroom_id: parseInt(classroomId, 10),
          p_teacher_id: currentUser.id
        });

      if (!rpcError && rpcData && rpcData.length > 0) {
        rows = rpcData.slice(0, 10);
      } else if (rpcError) {
        console.warn('RPC get_classroom_students_with_profiles not available or error:', rpcError);
        const { data: fallback, error } = await supabaseClient
          .from('classroom_students')
          .select('student_id, joined_at')
          .eq('classroom_id', classroomId)
          .order('joined_at', { ascending: false })
          .limit(10);
        if (!error && fallback?.length) {
          rows = fallback.map(r => ({ student_id: r.student_id, username: null, year_group: null, profile_picture_url: null, joined_at: r.joined_at }));
        }
      }

      if (!rows || rows.length === 0) {
        studentsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No students yet.</p>';
        return;
      }

      studentsList.innerHTML = rows.map(row => {
        const name = row.username || (row.email ? row.email.split('@')[0] : 'Unknown');
        const yearGroup = row.year_group || '—';
        const joinedDate = row.joined_at ? new Date(row.joined_at).toLocaleDateString() : '—';
        const imgUrl = row.profile_picture_url || '';
        const sid = row.student_id;
        const avatarHtml = imgUrl
          ? `<img src="${escapeHtml(imgUrl)}" alt="" class="student-avatar-img" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`
          : `<span class="student-avatar-placeholder" style="width:40px;height:40px;border-radius:50%;background:var(--accent-primary);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:600;font-size:0.9rem;">${escapeHtml(String(name).charAt(0).toUpperCase())}</span>`;
        return `
          <div class="student-item" data-student-id="${sid || ''}">
            <div style="display:flex;align-items:center;gap:12px;">
              ${avatarHtml}
              <div>
                <h4 style="margin-bottom:2px; color: var(--text-primary);">${escapeHtml(name)}</h4>
                <p style="margin:0; color: var(--text-secondary); font-size:0.85rem;">Year: ${escapeHtml(yearGroup)} · Joined: ${joinedDate}</p>
              </div>
            </div>
            <div>
              <a href="students.html?classroom=${classroomId}" class="btn btn-secondary btn-small">View all</a>
            </div>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('Error loading students:', error);
      const studentsList = document.getElementById('studentsList');
      if (studentsList) studentsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Unable to load students</p>';
    }
  }

  // Escape HTML
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Fullscreen invite code functions
  window.showFullscreenInviteFromView = function() {
    if (window.currentInviteCode) {
      showFullscreenInviteCode(window.currentInviteCode);
    }
  };

  window.copyInviteCodeFromView = function() {
    if (window.currentInviteCode) {
      copyInviteCode(window.currentInviteCode);
    }
  };

  window.showFullscreenInviteCode = function(code) {
    const modal = document.getElementById('fullscreenInviteModal');
    const codeText = document.getElementById('fullscreenInviteCodeText');
    
    if (modal && codeText) {
      codeText.textContent = code;
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  };

  window.closeFullscreenInvite = function() {
    const modal = document.getElementById('fullscreenInviteModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  };

  window.copyInviteCode = function(code) {
    navigator.clipboard.writeText(code).then(() => {
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10B981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideIn 0.3s ease;
      `;
      toast.textContent = 'Invite code copied!';
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeFullscreenInvite();
    }
  });

  // Initialize
  async function init() {
    const isAuth = await checkAuthentication();
    if (!isAuth) return;

    await loadClassroom();
  }

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Add styles for animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
})();
