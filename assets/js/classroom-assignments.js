(() => {
  const supabaseClient = window.supabaseClient;
  if (!supabaseClient) {
    window.location.href = '../../auth/login.html';
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const classroomId = urlParams.get('classroom');

  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const errorMessage = document.getElementById('errorMessage');
  const assignmentsContent = document.getElementById('assignmentsContent');
  const assignmentsList = document.getElementById('assignmentsList');
  const assignmentsEmpty = document.getElementById('assignmentsEmpty');
  const classroomSubtitle = document.getElementById('classroomSubtitle');
  const backToViewLink = document.getElementById('backToViewLink');
  const createAssignmentBtn = document.getElementById('createAssignmentBtn');
  const createAssignmentModal = document.getElementById('createAssignmentModal');
  const createAssignmentForm = document.getElementById('createAssignmentForm');
  const createAssignmentCancelBtn = document.getElementById('createAssignmentCancelBtn');
  const createAssignmentSubmitBtn = document.getElementById('createAssignmentSubmitBtn');
  const deleteAssignmentModal = document.getElementById('deleteAssignmentModal');
  const deleteAssignmentCancelBtn = document.getElementById('deleteAssignmentCancelBtn');
  const deleteAssignmentConfirmBtn = document.getElementById('deleteAssignmentConfirmBtn');

  const EXAM_BOARDS = ['AQA', 'Edexcel', 'OCR', 'WJEC', 'SQA'];

  let currentUser = null;
  let userProfile = null;
  let classroomName = '';
  let quillEditor = null;
  let addedResources = [];
  let subjects = [];
  let revisionGuides = [];
  let deleteTargetAssignmentId = null;

  function showError(msg) {
    if (loadingState) loadingState.style.display = 'none';
    if (assignmentsContent) assignmentsContent.style.display = 'none';
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

  function stripHtmlToText(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || '').trim().slice(0, 80) + (div.textContent && div.textContent.length > 80 ? '…' : '');
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
    return true;
  }

  async function loadClassroomMeta() {
    if (userProfile.role === 'teacher') {
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
    const { data } = await supabaseClient.rpc('get_classroom_for_student', {
      p_classroom_id: parseInt(classroomId, 10),
      p_student_id: currentUser.id
    });
    if (data && data.length > 0) {
      classroomName = data[0].name || 'Classroom';
      return classroomName;
    }
    return null;
  }

  async function loadSubjects() {
    const { data } = await supabaseClient.from('subjects').select('id, name, slug').order('name');
    subjects = data || [];
  }

  async function loadRevisionGuides() {
    const { data } = await supabaseClient.from('revision_guides').select('id, title, subject_id').order('title').limit(200);
    revisionGuides = data || [];
  }

  function resourceHref(r, basePath = '') {
    const b = basePath || (window.location.pathname.includes('/classroom/') ? '../' : '');
    switch (r.kind) {
      case 'subject':
        return `${b}subjects.html`;
      case 'past_papers':
        return `${b}past-papers.html?subject=${r.ref_id}`;
      case 'revision_guide':
        return `${b}subjects.html`;
      case 'flashcards':
        return `${b}flashcards.html`;
      case 'quiz':
        return `${b}quizzes.html`;
      case 'link':
        return r.url || '#';
      default:
        return '#';
    }
  }

  function resourceLabel(r) {
    if (r.label) return r.label;
    switch (r.kind) {
      case 'subject':
        return subjects.find(s => s.id === r.ref_id)?.name || 'Subject';
      case 'past_papers':
        return (r.ref_extra ? r.ref_extra + ' ' : '') + (subjects.find(s => s.id === r.ref_id)?.name || '') + ' Past papers';
      case 'revision_guide':
        return revisionGuides.find(g => g.id === r.ref_id)?.title || 'Revision guide';
      case 'flashcards':
        return (subjects.find(s => s.id === r.ref_id)?.name || '') + ' Flashcards';
      case 'quiz':
        return (subjects.find(s => s.id === r.ref_id)?.name || '') + ' Quizzes';
      case 'link':
        return r.url || 'Link';
      default:
        return r.kind;
    }
  }

  async function loadAssignments() {
    if (!assignmentsList) return;
    assignmentsList.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Loading assignments...</p></div>';
    if (assignmentsEmpty) assignmentsEmpty.style.display = 'none';

    const { data: assignments, error } = await supabaseClient
      .from('assignments')
      .select('id, title, description, due_date, created_at')
      .eq('classroom_id', classroomId)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading assignments:', error);
      assignmentsList.innerHTML = '<p style="text-align:center;color:var(--text-secondary);">Unable to load assignments.</p>';
      return;
    }

    if (!assignments || assignments.length === 0) {
      assignmentsList.innerHTML = '';
      if (assignmentsEmpty) assignmentsEmpty.style.display = 'block';
      return;
    }

    const ids = assignments.map(a => a.id);
    const { data: resources } = await supabaseClient
      .from('assignment_resources')
      .select('*')
      .in('assignment_id', ids)
      .order('sort_order');

    const byAid = {};
    (resources || []).forEach(res => {
      if (!byAid[res.assignment_id]) byAid[res.assignment_id] = [];
      byAid[res.assignment_id].push(res);
    });

    const isTeacher = userProfile.role === 'teacher';

    assignmentsList.innerHTML = assignments.map(a => {
      const due = a.due_date ? new Date(a.due_date).toLocaleDateString() : 'No due date';
      const isOverdue = a.due_date && new Date(a.due_date) < new Date();
      const desc = stripHtmlToText(a.description || '');
      const base = window.location.pathname.includes('/classroom/') ? '../' : '';
      const resList = (byAid[a.id] || []).map(r => {
        const label = r.label || resourceLabel(r);
        let href = '#';
        if (r.kind === 'link') href = r.url || '#';
        else if (r.kind === 'subject') href = base + 'subjects.html';
        else if (r.kind === 'past_papers') href = base + 'past-papers.html?subject=' + (r.ref_id || '') + (r.ref_extra ? '&examBoard=' + encodeURIComponent(r.ref_extra) : '');
        else if (r.kind === 'revision_guide') href = base + 'subjects.html';
        else if (r.kind === 'flashcards') href = base + 'flashcards.html' + (r.ref_id ? '?subject=' + r.ref_id : '');
        else if (r.kind === 'quiz') href = base + 'quizzes.html' + (r.ref_id ? '?subject=' + r.ref_id : '');
        return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener" class="resource-chip">${escapeHtml(label)}</a>`;
      }).join('');
      return `
        <div class="assignment-item" data-assignment-id="${a.id}">
          <div style="flex:1;">
            <h4 style="margin-bottom:5px;color:var(--text-primary);">${escapeHtml(a.title)}</h4>
            <p style="margin:0;color:var(--text-secondary);font-size:0.9rem;">${escapeHtml(desc)}</p>
            ${resList ? `<div class="assignment-resources" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">${resList}</div>` : ''}
            <p style="margin:5px 0 0 0;font-size:0.85rem;color:${isOverdue ? '#DC2626' : 'var(--text-secondary)'}">Due: ${due}</p>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <a href="view.html?id=${classroomId}" class="btn btn-secondary btn-small">View</a>
            ${isTeacher ? `<button type="button" class="btn btn-secondary btn-small btn-delete-assignment" data-id="${a.id}" data-title="${escapeHtml(a.title)}">Delete</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    if (isTeacher) {
      assignmentsList.querySelectorAll('.btn-delete-assignment').forEach(btn => {
        btn.addEventListener('click', () => {
          deleteTargetAssignmentId = btn.dataset.id;
          const t = document.getElementById('deleteAssignmentText');
          if (t) t.textContent = `Delete "${btn.dataset.title || 'this assignment'}"? This cannot be undone.`;
          if (deleteAssignmentModal) deleteAssignmentModal.style.display = 'flex';
        });
      });
    }
  }

  function openCreateModal() {
    addedResources = [];
    if (createAssignmentModal) createAssignmentModal.style.display = 'flex';
    if (createAssignmentForm) createAssignmentForm.reset();
    const wrap = document.getElementById('resourcePickerWrap');
    const pickerSubject = document.getElementById('resourceSubjectId');
    const pickerExam = document.getElementById('resourceExamBoard');
    const pickerGuide = document.getElementById('resourceRevisionGuideId');
    const pickerUrl = document.getElementById('resourceUrl');
    const pickerLabel = document.getElementById('resourceLabel');
    if (wrap) wrap.style.display = 'none';
    if (pickerSubject) pickerSubject.innerHTML = '<option value="">— Subject —</option>' + subjects.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
    if (pickerExam) {
      pickerExam.innerHTML = '<option value="">— Board —</option>' + EXAM_BOARDS.map(b => `<option value="${b}">${b}</option>`).join('');
      pickerExam.style.display = 'none';
    }
    if (pickerGuide) { pickerGuide.innerHTML = ''; pickerGuide.style.display = 'none'; }
    if (pickerUrl) { pickerUrl.value = ''; pickerUrl.style.display = 'none'; }
    if (pickerLabel) { pickerLabel.value = ''; pickerLabel.style.display = 'none'; }
    renderAddedResources();
    if (!quillEditor && typeof Quill !== 'undefined') {
      const el = document.getElementById('assignmentDescriptionEditor');
      if (el) {
        quillEditor = new Quill(el, { theme: 'snow', placeholder: 'Instructions for students...' });
      }
    }
    if (quillEditor) quillEditor.root.innerHTML = '';
  }

  function closeCreateModal() {
    if (createAssignmentModal) createAssignmentModal.style.display = 'none';
  }

  function renderAddedResources() {
    const list = document.getElementById('addedResourcesList');
    if (!list) return;
    list.innerHTML = addedResources.map((r, i) => {
      const lab = r.displayLabel || resourceLabel(r);
      return `<span class="resource-chip-added">${escapeHtml(lab)} <button type="button" class="resource-chip-remove" data-i="${i}" aria-label="Remove">×</button></span>`;
    }).join('');
    list.style.display = addedResources.length ? 'flex' : 'none';
    list.querySelectorAll('.resource-chip-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        addedResources.splice(parseInt(btn.dataset.i, 10), 1);
        renderAddedResources();
      });
    });
  }

  function showResourcePicker() {
    const kind = (document.getElementById('resourceKind') || {}).value;
    const wrap = document.getElementById('resourcePickerWrap');
    const pickerSubject = document.getElementById('resourceSubjectId');
    const pickerExam = document.getElementById('resourceExamBoard');
    const pickerGuide = document.getElementById('resourceRevisionGuideId');
    const pickerUrl = document.getElementById('resourceUrl');
    const pickerLabel = document.getElementById('resourceLabel');
    if (!wrap) return;
    pickerSubject.style.display = 'none';
    pickerExam.style.display = 'none';
    pickerGuide.style.display = 'none';
    pickerUrl.style.display = 'none';
    pickerLabel.style.display = 'none';
    if (kind === 'subject' || kind === 'past_papers' || kind === 'flashcards' || kind === 'quiz') {
      wrap.style.display = 'inline-flex';
      pickerSubject.style.display = 'inline-block';
      if (kind === 'past_papers' && pickerExam) pickerExam.style.display = 'inline-block';
    } else if (kind === 'revision_guide') {
      wrap.style.display = 'inline-flex';
      if (pickerGuide) {
        pickerGuide.style.display = 'inline-block';
        pickerGuide.innerHTML = '<option value="">— Guide —</option>' + revisionGuides.map(g => `<option value="${g.id}">${escapeHtml(g.title)}</option>`).join('');
      }
    } else if (kind === 'link') {
      wrap.style.display = 'inline-flex';
      if (pickerUrl) pickerUrl.style.display = 'inline-block';
      if (pickerLabel) pickerLabel.style.display = 'inline-block';
    } else {
      wrap.style.display = 'none';
    }
  }

  function onAddResource() {
    const kind = (document.getElementById('resourceKind') || {}).value;
    if (!kind) return;
    const pickerSubject = document.getElementById('resourceSubjectId');
    const pickerExam = document.getElementById('resourceExamBoard');
    const pickerGuide = document.getElementById('resourceRevisionGuideId');
    const pickerUrl = document.getElementById('resourceUrl');
    const pickerLabel = document.getElementById('resourceLabel');
    let refId = null, refExtra = null, url = null, label = null, displayLabel = null;
    if (kind === 'subject') {
      refId = pickerSubject?.value ? parseInt(pickerSubject.value, 10) : null;
      if (!refId) return;
      displayLabel = subjects.find(s => s.id === refId)?.name || 'Subject';
    } else if (kind === 'past_papers') {
      refId = pickerSubject?.value ? parseInt(pickerSubject.value, 10) : null;
      refExtra = pickerExam?.value || null;
      if (!refId) return;
      const sub = subjects.find(s => s.id === refId)?.name || '';
      displayLabel = (refExtra ? refExtra + ' ' : '') + sub + ' Past papers';
      label = displayLabel;
    } else if (kind === 'revision_guide') {
      refId = pickerGuide?.value ? parseInt(pickerGuide.value, 10) : null;
      if (!refId) return;
      displayLabel = revisionGuides.find(g => g.id === refId)?.title || 'Revision guide';
      label = displayLabel;
    } else if (kind === 'flashcards' || kind === 'quiz') {
      refId = pickerSubject?.value ? parseInt(pickerSubject.value, 10) : null;
      if (!refId) return;
      const sub = subjects.find(s => s.id === refId)?.name || '';
      displayLabel = kind === 'flashcards' ? sub + ' Flashcards' : sub + ' Quizzes';
      label = displayLabel;
    } else if (kind === 'link') {
      url = (pickerUrl?.value || '').trim();
      label = (pickerLabel?.value || '').trim() || url;
      if (!url) return;
      displayLabel = label || url;
    }
    addedResources.push({ kind, ref_id: refId, ref_extra: refExtra, url, label, displayLabel });
    renderAddedResources();
    document.getElementById('resourceKind').value = '';
    showResourcePicker();
  }

  async function handleCreateAssignment(e) {
    e.preventDefault();
    const titleEl = document.getElementById('assignmentTitle');
    const dueEl = document.getElementById('assignmentDueDate');
    const title = titleEl?.value?.trim();
    if (!title) return;
    const description = (quillEditor && quillEditor.root) ? quillEditor.root.innerHTML : (document.getElementById('assignmentDescriptionHtml')?.value || '');
    let dueDate = null;
    if (dueEl?.value) dueDate = new Date(dueEl.value).toISOString();
    if (createAssignmentSubmitBtn) {
      createAssignmentSubmitBtn.disabled = true;
      createAssignmentSubmitBtn.textContent = 'Creating…';
    }
    try {
      const { data: created, error } = await supabaseClient.rpc('create_assignment', {
        p_teacher_id: currentUser.id,
        p_classroom_id: parseInt(classroomId, 10),
        p_title: title,
        p_description: description,
        p_due_date: dueDate,
        p_content_type: null,
        p_content_id: null
      });
      if (error) throw error;
      const assignmentId = (Array.isArray(created) && created[0]) ? created[0].id : (created && created.id) ? created.id : null;
      if (assignmentId && addedResources.length > 0) {
        const rows = addedResources.map((r, i) => ({
          assignment_id: assignmentId,
          kind: r.kind,
          ref_id: r.ref_id || null,
          ref_extra: r.ref_extra || null,
          url: r.url || null,
          label: r.label || null,
          sort_order: i
        }));
        await supabaseClient.from('assignment_resources').insert(rows);
      }
      closeCreateModal();
      await loadAssignments();
    } catch (err) {
      console.error('Create assignment error:', err);
      alert(err.message || 'Failed to create assignment.');
    } finally {
      if (createAssignmentSubmitBtn) {
        createAssignmentSubmitBtn.disabled = false;
        createAssignmentSubmitBtn.textContent = 'Create';
      }
    }
  }

  async function doDeleteAssignment() {
    if (!deleteTargetAssignmentId) return;
    const btn = deleteAssignmentConfirmBtn;
    if (btn) { btn.disabled = true; btn.textContent = 'Deleting…'; }
    try {
      const { data, error } = await supabaseClient.rpc('delete_assignment', {
        p_assignment_id: parseInt(deleteTargetAssignmentId, 10),
        p_teacher_id: currentUser.id
      });
      if (error) throw error;
      const ok = Array.isArray(data) && data[0] ? data[0].success : (data && data.success);
      if (deleteAssignmentModal) deleteAssignmentModal.style.display = 'none';
      deleteTargetAssignmentId = null;
      if (ok) await loadAssignments();
      else alert('Could not delete assignment.');
    } catch (err) {
      alert(err.message || 'Failed to delete.');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Delete'; }
    }
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

    await loadSubjects();
    if (userProfile.role === 'teacher') await loadRevisionGuides();

    if (loadingState) loadingState.style.display = 'none';
    if (errorState) errorState.style.display = 'none';
    if (assignmentsContent) assignmentsContent.style.display = 'block';

    if (classroomSubtitle) classroomSubtitle.textContent = classroomName;
    if (backToViewLink) backToViewLink.href = `view.html?id=${classroomId}`;
    if (createAssignmentBtn) {
      createAssignmentBtn.style.display = userProfile.role === 'teacher' ? 'inline-flex' : 'none';
      createAssignmentBtn.addEventListener('click', openCreateModal);
    }
    if (createAssignmentForm) createAssignmentForm.addEventListener('submit', handleCreateAssignment);
    if (createAssignmentCancelBtn) createAssignmentCancelBtn.addEventListener('click', closeCreateModal);
    if (createAssignmentModal) {
      createAssignmentModal.addEventListener('click', (ev) => { if (ev.target === createAssignmentModal) closeCreateModal(); });
    }

    const rk = document.getElementById('resourceKind');
    if (rk) rk.addEventListener('change', showResourcePicker);
    const addResBtn = document.getElementById('addResourceBtn');
    if (addResBtn) addResBtn.addEventListener('click', onAddResource);

    if (deleteAssignmentCancelBtn) deleteAssignmentCancelBtn.addEventListener('click', () => { if (deleteAssignmentModal) deleteAssignmentModal.style.display = 'none'; deleteTargetAssignmentId = null; });
    if (deleteAssignmentConfirmBtn) deleteAssignmentConfirmBtn.addEventListener('click', doDeleteAssignment);
    if (deleteAssignmentModal) deleteAssignmentModal.addEventListener('click', (ev) => { if (ev.target === deleteAssignmentModal) { deleteAssignmentModal.style.display = 'none'; deleteTargetAssignmentId = null; } });

    await loadAssignments();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
