(() => {
  const supabaseClient = window.supabaseClient;
  if (!supabaseClient) {
    window.location.href = '../../auth/login.html';
    return;
  }

  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const errorMessage = document.getElementById('errorMessage');
  const analyticsContent = document.getElementById('analyticsContent');
  const totalClassroomsEl = document.getElementById('totalClassrooms');
  const totalStudentsEl = document.getElementById('totalStudents');
  const totalAssignmentsEl = document.getElementById('totalAssignments');
  const completedSubmissionsEl = document.getElementById('completedSubmissions');
  const classroomsAnalyticsList = document.getElementById('classroomsAnalyticsList');

  let currentUser = null;

  function showError(msg) {
    if (loadingState) loadingState.style.display = 'none';
    if (analyticsContent) analyticsContent.style.display = 'none';
    if (errorState) {
      errorState.style.display = 'block';
      if (errorMessage) errorMessage.textContent = msg;
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function checkAuth() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) {
      window.location.href = '../../auth/login.html';
      return false;
    }
    currentUser = session.user;
    const { data: profile } = await supabaseClient.from('users').select('role').eq('id', currentUser.id).single();
    if (profile?.role !== 'teacher') {
      showError('Only teachers can view classroom analytics.');
      return false;
    }
    return true;
  }

  async function loadAnalytics() {
    const { data: classrooms, error: classroomsError } = await supabaseClient
      .from('classrooms')
      .select('id, name')
      .eq('teacher_id', currentUser.id);

    if (classroomsError || !classrooms?.length) {
      if (totalClassroomsEl) totalClassroomsEl.textContent = '0';
      if (totalStudentsEl) totalStudentsEl.textContent = '0';
      if (totalAssignmentsEl) totalAssignmentsEl.textContent = '0';
      if (completedSubmissionsEl) completedSubmissionsEl.textContent = '0';
      if (classroomsAnalyticsList) {
        classroomsAnalyticsList.innerHTML = '<p style="text-align:center;color:var(--text-secondary);">No classrooms yet. Create one from the dashboard.</p>';
      }
      return;
    }

    let totalStudents = 0;
    let totalAssignments = 0;
    let totalSubmissions = 0;
    const cards = [];

    for (const c of classrooms) {
      const { data: stats } = await supabaseClient.rpc('get_classroom_stats', { p_classroom_id: c.id });
      const s = Array.isArray(stats) && stats.length ? stats[0] : null;
      const students = s ? Number(s.total_students) : 0;
      const assignments = s ? Number(s.total_assignments) : 0;
      const submissions = s ? Number(s.completed_submissions) : 0;
      totalStudents += students;
      totalAssignments += assignments;
      totalSubmissions += submissions;
      cards.push({
        id: c.id,
        name: c.name,
        students,
        assignments,
        submissions
      });
    }

    if (totalClassroomsEl) totalClassroomsEl.textContent = String(classrooms.length);
    if (totalStudentsEl) totalStudentsEl.textContent = String(totalStudents);
    if (totalAssignmentsEl) totalAssignmentsEl.textContent = String(totalAssignments);
    if (completedSubmissionsEl) completedSubmissionsEl.textContent = String(totalSubmissions);

    if (classroomsAnalyticsList) {
      if (cards.length === 0) {
        classroomsAnalyticsList.innerHTML = '<p style="text-align:center;color:var(--text-secondary);">No classrooms yet.</p>';
      } else {
        classroomsAnalyticsList.innerHTML = cards.map(c => `
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
                <h3 class="classroom-name">${escapeHtml(c.name)}</h3>
                <p class="classroom-meta">
                  <span>${c.students} students</span>
                  <span class="classroom-separator">·</span>
                  <span>${c.assignments} assignments</span>
                  <span class="classroom-separator">·</span>
                  <span>${c.submissions} submissions</span>
                </p>
              </div>
            </div>
            <div class="classroom-actions">
              <a href="view.html?id=${c.id}" class="btn btn-primary btn-small">View</a>
              <a href="analytics.html?classroom=${c.id}" class="btn btn-secondary btn-small">Details</a>
            </div>
          </div>
        `).join('');
      }
    }
  }

  async function init() {
    const ok = await checkAuth();
    if (!ok) return;

    if (loadingState) loadingState.style.display = 'none';
    if (errorState) errorState.style.display = 'none';
    if (analyticsContent) analyticsContent.style.display = 'block';

    await loadAnalytics();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
