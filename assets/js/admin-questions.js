(function () {
  const supabase = window.supabaseClient;
  const accessError = document.getElementById("adminAccessError");
  const panel = document.getElementById("adminQuestionPanel");
  const tableBody = document.getElementById("adminQuestionTableBody");
  const searchInput = document.getElementById("questionSearchInput");
  const pageSizeSelect = document.getElementById("questionPageSizeSelect");
  const refreshButton = document.getElementById("refreshQuestionsBtn");
  const prevPageBtn = document.getElementById("questionsPrevPageBtn");
  const nextPageBtn = document.getElementById("questionsNextPageBtn");
  const pageInfo = document.getElementById("questionsPageInfo");

  const subjectInput = document.getElementById("qSubjectSlug");
  const topicInput = document.getElementById("qTopic");
  const difficultyInput = document.getElementById("qDifficulty");
  const correctInput = document.getElementById("qCorrect");
  const textInput = document.getElementById("qText");
  const optionsInput = document.getElementById("qOptions");
  const explanationInput = document.getElementById("qExplanation");
  const addButton = document.getElementById("addQuestionBtn");
  let questions = [];
  let currentPage = 1;
  let pageSize = Number(pageSizeSelect?.value || 25);

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  async function ensureAdminAccess() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      window.location.href = "../../auth/login.html";
      return false;
    }

    const { data: me, error: meError } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (meError || !me || me.role !== "admin") {
      if (accessError) accessError.style.display = "block";
      if (panel) panel.style.display = "none";
      return false;
    }

    return true;
  }

  function renderQuestions(filterText = "") {
    const term = filterText.trim().toLowerCase();
    const filtered = term
      ? questions.filter((row) => {
          return (
            String(row.subject_slug || "").toLowerCase().includes(term) ||
            String(row.topic || "").toLowerCase().includes(term) ||
            String(row.question || "").toLowerCase().includes(term) ||
            String(row.difficulty || "").toLowerCase().includes(term)
          );
        })
      : questions;

    if (!filtered.length) {
      tableBody.innerHTML = '<tr><td colspan="6" class="admin-empty">No matching questions.</td></tr>';
      if (pageInfo) pageInfo.textContent = "Page 1 of 1";
      if (prevPageBtn) prevPageBtn.disabled = true;
      if (nextPageBtn) nextPageBtn.disabled = true;
      return;
    }

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const visibleRows = filtered.slice(start, end);

    tableBody.innerHTML = visibleRows
      .map(
        (row) => `
      <tr data-question-id="${row.id}">
        <td>${row.id}</td>
        <td>${escapeHtml(row.subject_slug)}</td>
        <td>${escapeHtml(row.topic)}</td>
        <td>${escapeHtml(row.question)}</td>
        <td>${escapeHtml(row.difficulty)}</td>
        <td><button class="admin-danger-btn" data-action="delete">Delete</button></td>
      </tr>
    `
      )
      .join("");

    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
  }

  async function loadQuestions() {
    const { data, error } = await supabase.rpc("admin_get_recent_questions", {
      limit_count: 100,
    });
    if (error) throw error;

    questions = Array.isArray(data) ? data : [];
    if (!questions.length) {
      tableBody.innerHTML = '<tr><td colspan="6" class="admin-empty">No questions yet.</td></tr>';
      return;
    }
    renderQuestions(searchInput?.value || "");
  }

  async function addQuestion() {
    const optionsText = optionsInput.value.trim();
    let optionsJson;
    try {
      optionsJson = JSON.parse(optionsText);
    } catch {
      throw new Error("Options must be valid JSON array.");
    }

    if (!Array.isArray(optionsJson)) {
      throw new Error("Options must be a JSON array.");
    }

    const { error } = await supabase.rpc("admin_add_quiz_question", {
      subject_slug: subjectInput.value.trim(),
      topic: topicInput.value.trim(),
      question_text: textInput.value.trim(),
      options_json: optionsJson,
      correct_answer_text: correctInput.value.trim(),
      difficulty_text: difficultyInput.value,
      explanation_text: explanationInput.value.trim() || null,
    });

    if (error) throw error;

    textInput.value = "";
    optionsInput.value = "";
    correctInput.value = "";
    explanationInput.value = "";
  }

  document.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target === addButton) {
      try {
        addButton.disabled = true;
        await addQuestion();
        await loadQuestions();
      } catch (err) {
        console.error(err);
        alert(err.message || "Failed to add question.");
      } finally {
        addButton.disabled = false;
      }
    }

    if (target.dataset.action === "delete") {
      const row = target.closest("tr[data-question-id]");
      const questionId = Number(row?.getAttribute("data-question-id"));
      if (!questionId) return;
      if (!window.confirm(`Delete question #${questionId}?`)) return;

      try {
        const { error } = await supabase.rpc("admin_delete_quiz_question", {
          question_id: questionId,
        });
        if (error) throw error;
        await loadQuestions();
      } catch (err) {
        console.error(err);
        alert(err.message || "Failed to delete question.");
      }
    }
  });

  searchInput?.addEventListener("input", () => {
    currentPage = 1;
    renderQuestions(searchInput.value);
  });
  pageSizeSelect?.addEventListener("change", () => {
    pageSize = Number(pageSizeSelect.value || 25);
    currentPage = 1;
    renderQuestions(searchInput?.value || "");
  });
  refreshButton?.addEventListener("click", () => {
    loadQuestions().catch((err) => {
      console.error(err);
      alert(err.message || "Failed to refresh questions.");
    });
  });
  prevPageBtn?.addEventListener("click", () => {
    currentPage = Math.max(1, currentPage - 1);
    renderQuestions(searchInput?.value || "");
  });
  nextPageBtn?.addEventListener("click", () => {
    currentPage += 1;
    renderQuestions(searchInput?.value || "");
  });

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      if (!(await ensureAdminAccess())) return;
      await loadQuestions();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to load questions.");
    }
  });
})();
