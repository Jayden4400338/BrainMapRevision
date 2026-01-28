(() => {
  const supabaseClient = window.supabaseClient;
  if (!supabaseClient) {
    console.error('Supabase not initialized');
    window.location.href = '../../auth/login.html';
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const classroomId = urlParams.get('classroom');

  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const errorMessage = document.getElementById('errorMessage');
  const studentsContent = document.getElementById('studentsContent');
  const studentsList = document.getElementById('studentsList');
  const studentsEmpty = document.getElementById('studentsEmpty');
  const pageTitle = document.getElementById('pageTitle');
  const classroomSubtitle = document.getElementById('classroomSubtitle');
  const backToViewLink = document.getElementById('backToViewLink');
  const removeConfirmModal = document.getElementById('removeConfirmModal');
  const removeConfirmText = document.getElementById('removeConfirmText');
  const removeCancelBtn = document.getElementById('removeCancelBtn');
  const removeConfirmBtn = document.getElementById('removeConfirmBtn');

  let currentUser = null;
  let userProfile = null;
  let classroomName = '';

  function showError(msg) {
    if (loadingState) loadingState.style.display = 'none';
    if (studentsContent) studentsContent.style.display = 'none';
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
    userProfile = profile || { role: 'student' };
    if (userProfile.role !== 'teacher') {
      showError('Only teachers can view classroom students.');
      return false;
    }
    return true;
  }

  async function loadClassroomMeta() {
    const { data, error } = await supabaseClient
      .from('classrooms')
      .select('name')
      .eq('id', classroomId)
      .eq('teacher_id', currentUser.id)
      .single();
    if (error || !data) return null;
    classroomName = data.name || 'Classroom';
    return data.name;
  }

  async function loadStudents() {
    if (!studentsList) return;
    studentsList.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Loading students...</p></div>';
    if (studentsEmpty) studentsEmpty.style.display = 'none';

    const { data: rows, error } = await supabaseClient.rpc('get_classroom_students_with_profiles', {
      p_classroom_id: parseInt(classroomId, 10),
      p_teacher_id: currentUser.id
    });

    if (error) {
      console.error('Error loading students:', error);
      studentsList.innerHTML = '<p style="text-align:center;color:var(--text-secondary);">Unable to load students. Ensure classroom_students_and_teachers.sql has been run.</p>';
      return;
    }

    if (!rows || rows.length === 0) {
      studentsList.innerHTML = '';
      if (studentsEmpty) {
        studentsEmpty.style.display = 'block';
        studentsEmpty.innerHTML = '<p>No students in this classroom yet. Share the invite code so students can join.</p>';
      }
      return;
    }

    studentsList.innerHTML = rows.map(row => {
      const name = row.username || (row.email ? row.email.split('@')[0] : 'Unknown');
      const yearGroup = row.year_group || '—';
      const joined = row.joined_at ? new Date(row.joined_at).toLocaleDateString() : '—';
      const imgUrl = row.profile_picture_url || '';
      const sid = row.student_id;
      const avatar = imgUrl
        ? `<img src="${escapeHtml(imgUrl)}" alt="" style="width:44px;height:44px;border-radius:50%;object-fit:cover;">`
        : `<span style="width:44px;height:44px;border-radius:50%;background:var(--accent-primary);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:600;font-size:1rem;">${escapeHtml(String(name).charAt(0).toUpperCase())}</span>`;
      return `
        <div class="student-row" data-student-id="${escapeHtml(sid)}" data-student-name="${escapeHtml(name)}">
          <div style="display:flex;align-items:center;gap:14px;">
            ${avatar}
            <div>
              <div style="font-weight:600;color:var(--text-primary);">${escapeHtml(name)}</div>
              <div style="font-size:0.9rem;color:var(--text-secondary);">Year group: ${escapeHtml(yearGroup)} · Joined: ${joined}</div>
            </div>
          </div>
          <div>
            <button type="button" class="btn btn-secondary btn-small remove-student-btn" data-student-id="${escapeHtml(sid)}" data-student-name="${escapeHtml(name)}">Remove</button>
          </div>
        </div>
      `;
    }).join('');

    studentsList.querySelectorAll('.remove-student-btn').forEach(btn => {
      btn.addEventListener('click', () => openRemoveConfirm(btn.dataset.studentId, btn.dataset.studentName));
    });
  }

  let removeTargetId = null;
  function openRemoveConfirm(sid, name) {
    removeTargetId = sid;
    if (removeConfirmText) removeConfirmText.textContent = `Remove ${name} from this classroom? They will need a new invite code to rejoin.`;
    if (removeConfirmModal) removeConfirmModal.style.display = 'flex';
  }

  async function doRemove() {
    if (!removeTargetId) return;
    removeConfirmBtn.disabled = true;
    removeConfirmBtn.textContent = 'Removing...';
    const { data, error } = await supabaseClient.rpc('remove_student_from_classroom', {
      p_classroom_id: parseInt(classroomId, 10),
      p_student_id: removeTargetId,
      p_teacher_id: currentUser.id
    });
    removeConfirmBtn.disabled = false;
    removeConfirmBtn.textContent = 'Remove';
    if (removeConfirmModal) removeConfirmModal.style.display = 'none';
    removeTargetId = null;
    if (error) {
      alert(error.message || 'Failed to remove student.');
      return;
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (result && result.success) {
      await loadStudents();
    } else {
      alert(result?.message || 'Failed to remove student.');
    }
  }

  if (removeCancelBtn) removeCancelBtn.addEventListener('click', () => { if (removeConfirmModal) removeConfirmModal.style.display = 'none'; removeTargetId = null; });
  if (removeConfirmBtn) removeConfirmBtn.addEventListener('click', doRemove);
  if (removeConfirmModal) {
    removeConfirmModal.addEventListener('click', (e) => { if (e.target === removeConfirmModal) { removeConfirmModal.style.display = 'none'; removeTargetId = null; } });
  }

  async function init() {
    if (!classroomId) {
      showError('No classroom specified. Open this page from a classroom link.');
      return;
    }
    const ok = await checkAuth();
    if (!ok) return;

    const name = await loadClassroomMeta();
    if (!name) {
      showError('Classroom not found or you do not have access.');
      return;
    }

    if (loadingState) loadingState.style.display = 'none';
    if (errorState) errorState.style.display = 'none';
    if (studentsContent) studentsContent.style.display = 'block';

    if (pageTitle) pageTitle.textContent = 'Students';
    if (classroomSubtitle) classroomSubtitle.textContent = classroomName;
    if (backToViewLink) backToViewLink.href = `view.html?id=${classroomId}`;

    await loadStudents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
