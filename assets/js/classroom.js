(() => {
  const supabaseClient = window.supabaseClient;

  if (!supabaseClient) {
    console.error('❌ Supabase not initialized!');
    // Path is relative to pages/classroom/ where this script is used
    const currentPath = window.location.pathname;
    if (currentPath.includes('/classroom/')) {
      window.location.href = '../../auth/login.html';
    } else {
      window.location.href = '../auth/login.html';
    }
    return;
  }

  // DOM Elements
  const classroomsList = document.getElementById('classroomsList');
  const emptyState = document.getElementById('emptyState');
  const recentActivityList = document.getElementById('recentActivityList');
  const totalClassroomsEl = document.getElementById('totalClassrooms');
  const totalStudentsEl = document.getElementById('totalStudents');
  const activeAssignmentsEl = document.getElementById('activeAssignments');
  const pendingSubmissionsEl = document.getElementById('pendingSubmissions');

  let currentUser = null;
  let userProfile = null;

  // Check authentication and role
  async function checkAuthentication() {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();

      if (error) throw error;

      if (!session) {
        console.log('No session found, redirecting to login...');
        // Path is relative to pages/classroom/ where this script is used
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
        // Path is relative to pages/classroom/ where this script is used
        const currentPath = window.location.pathname;
        if (currentPath.includes('/classroom/')) {
          window.location.href = '../dashboard.html';
        } else {
          window.location.href = 'dashboard.html';
        }
        return false;
      }

      userProfile = profile;
      return true;
    } catch (error) {
      console.error('❌ Auth error:', error);
      showError('Authentication failed. Please log in again.');
      setTimeout(() => {
        // Path is relative to pages/classroom/ where this script is used
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
    console.error('❌', message);
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #F56565;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Load classrooms
  async function loadClassrooms() {
    try {
      console.log('Loading classrooms for teacher:', currentUser.id);
      
      // First, get classrooms
      const { data: classrooms, error: classroomsError } = await supabaseClient
        .from('classrooms')
        .select('*')
        .eq('teacher_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (classroomsError) {
        console.error('❌ Classrooms query error:', classroomsError);
        console.error('Error details:', {
          message: classroomsError.message,
          details: classroomsError.details,
          hint: classroomsError.hint,
          code: classroomsError.code
        });
        throw classroomsError;
      }
      
      console.log('✅ Classrooms loaded:', classrooms?.length || 0);

      if (!classrooms || classrooms.length === 0) {
        displayClassrooms([]);
        updateStats([]);
        return;
      }

      // Get subject IDs
      const subjectIds = classrooms
        .map(c => c.subject_id)
        .filter(id => id !== null);

      // Fetch subjects if there are any
      let subjectsMap = {};
      if (subjectIds.length > 0) {
        const { data: subjects, error: subjectsError } = await supabaseClient
          .from('subjects')
          .select('id, name, slug')
          .in('id', subjectIds);

        if (!subjectsError && subjects) {
          subjectsMap = subjects.reduce((acc, subj) => {
            acc[subj.id] = subj;
            return acc;
          }, {});
        }
      }

      // Combine classrooms with subjects
      const classroomsWithSubjects = classrooms.map(classroom => ({
        ...classroom,
        subjects: classroom.subject_id ? subjectsMap[classroom.subject_id] || null : null
      }));

      displayClassrooms(classroomsWithSubjects);
      updateStats(classroomsWithSubjects);
    } catch (error) {
      console.error('❌ Error loading classrooms:', error);
      
      // Check for specific error types
      let errorMessage = 'Failed to load classrooms. ';
      
      if (error.code === 'PGRST301' || error.message?.includes('permission denied') || error.message?.includes('row-level security')) {
        errorMessage += 'Permission denied. Please ensure you are logged in as a teacher and RLS policies are set up correctly.';
        console.error('💡 RLS Policy Issue - Run the fix_classroom_rls.sql file in Supabase SQL Editor');
      } else if (error.code === '42P01' || error.message?.includes('does not exist')) {
        errorMessage += 'Classrooms table not found. Please run the database schema setup.';
        console.error('💡 Database Schema Issue - Run schema.SQL in Supabase SQL Editor');
      } else if (error.code === '500' || error.status === 500) {
        errorMessage += 'Server error. Please check your database connection and RLS policies.';
        console.error('💡 Server Error - Check Supabase dashboard for details');
      } else {
        errorMessage += 'Please refresh the page or contact support.';
      }
      
      showError(errorMessage);
      
      // Show empty state on error
      if (classroomsList) {
        classroomsList.style.display = 'none';
      }
      if (emptyState) {
        emptyState.style.display = 'block';
        emptyState.querySelector('h3').textContent = 'Error Loading Classrooms';
        emptyState.querySelector('p').textContent = errorMessage;
        const btn = emptyState.querySelector('a');
        if (btn) {
          btn.textContent = 'Refresh Page';
          btn.onclick = () => window.location.reload();
        }
      }
    }
  }

  // Display classrooms
  function displayClassrooms(classrooms) {
    if (!classroomsList) return;

    if (classrooms.length === 0) {
      classroomsList.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    classroomsList.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';

    classroomsList.innerHTML = classrooms.map(classroom => {
      const subjectName = classroom.subjects?.name || 'No Subject';
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
          
          <div class="classroom-details">
            <div class="classroom-stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
              <span class="classroom-stat-value" data-classroom-id="${classroom.id}">-</span>
              <span class="classroom-stat-label">Students</span>
            </div>
            <div class="classroom-stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span class="classroom-stat-value" data-assignments-id="${classroom.id}">-</span>
              <span class="classroom-stat-label">Assignments</span>
            </div>
          </div>

          <div class="classroom-invite">
            <div class="invite-code">
              <label>Invite Code:</label>
              <code class="invite-code-value">${classroom.invite_code}</code>
              <button class="copy-btn" onclick="copyInviteCode('${classroom.invite_code}')" title="Copy invite code">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
              <button class="fullscreen-btn" onclick="showFullscreenInviteCode('${classroom.invite_code}')" title="Show fullscreen for board">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="classroom-actions">
            <a href="view.html?id=${classroom.id}" class="btn btn-secondary btn-small">View</a>
            <a href="students.html?classroom=${classroom.id}" class="btn btn-secondary btn-small">Students</a>
            <a href="assignments.html?classroom=${classroom.id}" class="btn btn-primary btn-small">Assignments</a>
          </div>
        </div>
      `;
    }).join('');

    // Load student counts for each classroom
    classrooms.forEach(classroom => {
      loadClassroomStats(classroom.id);
    });
  }

  // Load stats for a specific classroom
  async function loadClassroomStats(classroomId) {
    try {
      // Get student count
      const { count: studentCount } = await supabaseClient
        .from('classroom_students')
        .select('*', { count: 'exact', head: true })
        .eq('classroom_id', classroomId);

      // Get assignment count
      const { count: assignmentCount } = await supabaseClient
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('classroom_id', classroomId);

      // Update UI
      const studentEl = document.querySelector(`[data-classroom-id="${classroomId}"].classroom-stat-value`);
      const assignmentEl = document.querySelector(`[data-assignments-id="${classroomId}"].classroom-stat-value`);
      
      if (studentEl) studentEl.textContent = studentCount || 0;
      if (assignmentEl) assignmentEl.textContent = assignmentCount || 0;
    } catch (error) {
      console.error(`Error loading stats for classroom ${classroomId}:`, error);
    }
  }

  // Update overall statistics
  async function updateStats(classrooms) {
    try {
      const classroomIds = classrooms.map(c => c.id);
      
      if (classroomIds.length === 0) {
        if (totalClassroomsEl) totalClassroomsEl.textContent = '0';
        if (totalStudentsEl) totalStudentsEl.textContent = '0';
        if (activeAssignmentsEl) activeAssignmentsEl.textContent = '0';
        if (pendingSubmissionsEl) pendingSubmissionsEl.textContent = '0';
        return;
      }

      // Total classrooms
      if (totalClassroomsEl) totalClassroomsEl.textContent = classrooms.length;

      // Total students across all classrooms
      const { count: totalStudents } = await supabaseClient
        .from('classroom_students')
        .select('*', { count: 'exact', head: true })
        .in('classroom_id', classroomIds);

      if (totalStudentsEl) totalStudentsEl.textContent = totalStudents || 0;

      // Active assignments (assignments with due dates in the future)
      const { count: activeAssignments } = await supabaseClient
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .in('classroom_id', classroomIds)
        .gte('due_date', new Date().toISOString());

      if (activeAssignmentsEl) activeAssignmentsEl.textContent = activeAssignments || 0;

      // Pending submissions (assignments without completed submissions)
      const { data: assignments } = await supabaseClient
        .from('assignments')
        .select('id')
        .in('classroom_id', classroomIds);

      if (assignments && assignments.length > 0) {
        const assignmentIds = assignments.map(a => a.id);
        
        // Get all students in these classrooms
        const { data: students } = await supabaseClient
          .from('classroom_students')
          .select('student_id')
          .in('classroom_id', classroomIds);

        if (students && students.length > 0) {
          const studentIds = students.map(s => s.student_id);
          
          // Count pending: total possible submissions - completed submissions
          const totalPossible = assignmentIds.length * studentIds.length;
          
          const { count: completed } = await supabaseClient
            .from('assignment_submissions')
            .select('*', { count: 'exact', head: true })
            .in('assignment_id', assignmentIds)
            .in('student_id', studentIds);

          const pending = Math.max(0, totalPossible - (completed || 0));
          if (pendingSubmissionsEl) pendingSubmissionsEl.textContent = pending;
        } else {
          if (pendingSubmissionsEl) pendingSubmissionsEl.textContent = '0';
        }
      } else {
        if (pendingSubmissionsEl) pendingSubmissionsEl.textContent = '0';
      }

      // Load recent activity
      loadRecentActivity(classroomIds);
    } catch (error) {
      console.error('❌ Error updating stats:', error);
    }
  }

  // Load recent activity
  async function loadRecentActivity(classroomIds) {
    try {
      if (!classroomIds || classroomIds.length === 0) {
        if (recentActivityList) recentActivityList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No recent activity</p>';
        return;
      }

      // Get recent assignments
      const { data: recentAssignments } = await supabaseClient
        .from('assignments')
        .select('*, classrooms:classroom_id(name)')
        .in('classroom_id', classroomIds)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get recent submissions
      const { data: recentSubmissions } = await supabaseClient
        .from('assignment_submissions')
        .select(`
          *,
          assignments:assignment_id(
            title,
            classrooms:classroom_id(name)
          ),
          users:student_id(username)
        `)
        .in('assignment_id', 
          await supabaseClient
            .from('assignments')
            .select('id')
            .in('classroom_id', classroomIds)
            .then(res => res.data?.map(a => a.id) || [])
        )
        .order('completed_at', { ascending: false })
        .limit(5);

      // Combine and sort by date
      const activities = [];
      
      if (recentAssignments) {
        recentAssignments.forEach(assignment => {
          activities.push({
            type: 'assignment_created',
            title: `New assignment: ${assignment.title}`,
            description: `Created in ${assignment.classrooms?.name || 'classroom'}`,
            time: assignment.created_at,
            icon: '📝'
          });
        });
      }

      if (recentSubmissions) {
        recentSubmissions.forEach(submission => {
          activities.push({
            type: 'submission',
            title: `${submission.users?.username || 'Student'} submitted assignment`,
            description: submission.assignments?.title || 'Assignment',
            time: submission.completed_at,
            icon: '✅'
          });
        });
      }

      // Sort by time and limit to 10
      activities.sort((a, b) => new Date(b.time) - new Date(a.time));
      activities.splice(10);

      displayRecentActivity(activities);
    } catch (error) {
      console.error('❌ Error loading recent activity:', error);
      if (recentActivityList) {
        recentActivityList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Failed to load activity</p>';
      }
    }
  }

  // Display recent activity
  function displayRecentActivity(activities) {
    if (!recentActivityList) return;

    if (activities.length === 0) {
      recentActivityList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No recent activity</p>';
      return;
    }

    recentActivityList.innerHTML = activities.map(activity => {
      const timeAgo = getTimeAgo(activity.time);
      return `
        <div class="activity-item">
          <div class="activity-icon">
            <span style="font-size: 24px;">${activity.icon}</span>
          </div>
          <div class="activity-content">
            <div class="activity-title">${escapeHtml(activity.title)}</div>
            <div class="activity-time">${escapeHtml(activity.description)} • ${timeAgo}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Get time ago string
  function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Copy invite code
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
      showError('Failed to copy invite code');
    });
  };

  // Show fullscreen invite code
  window.showFullscreenInviteCode = function(code) {
    // Create or get modal
    let modal = document.getElementById('fullscreenInviteModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'fullscreenInviteModal';
      modal.className = 'fullscreen-modal';
      modal.innerHTML = `
        <div class="fullscreen-content">
          <button class="fullscreen-close" onclick="closeFullscreenInvite()" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div class="fullscreen-invite-code">
            <h2 style="margin-bottom: 20px; color: var(--text-primary);">Classroom Invite Code</h2>
            <div class="invite-code-large" id="fullscreenInviteCodeText"></div>
            <p style="margin-top: 30px; color: var(--text-secondary); font-size: 1.1rem;">
              Students can join using this code
            </p>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    
    const codeText = document.getElementById('fullscreenInviteCodeText');
    if (codeText) {
      codeText.textContent = code;
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };

  window.closeFullscreenInvite = function() {
    const modal = document.getElementById('fullscreenInviteModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
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

    await loadClassrooms();
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
