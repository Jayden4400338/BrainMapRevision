const SCAFFOLD = {
  language: {
    points: ["Metaphor / simile", "Personification", "Alliteration", "Onomatopoeia", "Imagery", "Repetition", "Connotations", "Tone / mood", "Word choice (diction)", "Rhyme scheme"],
    starters: ["The poet uses the word \"...\" to suggest...", "The metaphor \"...\" implies...", "The use of [device] creates a sense of...", "The connotations of \"...\" emphasise...", "Through the imagery of \"...\", the poet conveys..."],
    example: "The poet uses the metaphor \"...\" to suggest the character feels trapped, which creates a sense of despair. The connotations of darkness and confinement reinforce this mood throughout the stanza.",
  },
  structure: {
    points: ["Stanza length / regularity", "Enjambment / caesura", "Line length variation", "Volta / turning point", "Rhyme scheme / rhythm", "Punctuation for effect", "Opening / closing line", "Repetition of structure"],
    starters: ["The use of enjambment here mirrors...", "The short line \"...\" creates a sense of...", "The caesura in this line suggests...", "The structure of the stanza reflects...", "By breaking the rhyme scheme here, the poet..."],
    example: "The poet uses enjambment across these lines to reflect the relentless pace of the subject. The line runs on without pause, mirroring the speaker's inability to stop or reflect on what is happening.",
  },
  themes: {
    points: ["Power / conflict", "Nature / the natural world", "Identity / self", "Time / mortality", "Love / loss", "Memory", "Society / injustice", "Isolation / belonging"],
    starters: ["This line links to the theme of... because...", "The poet explores the idea of... through...", "This connects to the wider theme of... as...", "The imagery here symbolises... which suggests...", "The poet challenges the idea that... by..."],
    example: "This line directly connects to the poem's theme of loss. The image of \"...\" symbolises something irretrievably gone, and the melancholy tone reinforces how the speaker has been changed by this experience.",
  },
  general: {
    points: ["Personal response", "Historical / biographical context", "Comparison to another poem", "Effect on the reader", "Ambiguity / multiple meanings", "Structure of the whole poem"],
    starters: ["This line is effective because...", "A reader might feel... when reading this because...", "In context, this line suggests...", "This could be interpreted as... or alternatively as...", "This reminds me of... because..."],
    example: "A reader might feel unsettled by this line because the poet deliberately subverts expectations. The contrast between the joyful imagery and the darker undertones creates an ambiguous effect that lingers after reading.",
  },
};

const API = "https://poetrydb.org";
const STORAGE_KEY = "bmr_poetry_annotations_v1";

let currentPoem = null;
let annotations = [];
let editingIndex = null;
let currentLineIndex = null;
let activeType = "language";
let currentUserId = null;

const authorSelect = document.getElementById("authorSelect");
const titleSelect = document.getElementById("titleSelect");
const loadPoemBtn = document.getElementById("loadPoemBtn");
const randomPoemBtn = document.getElementById("randomPoemBtn");
const poemCard = document.getElementById("poemCard");
const modalBackdrop = document.getElementById("analysisModalBackdrop");
const modalSelectedLine = document.getElementById("modalSelectedLine");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");
const modalSaveBtn = document.getElementById("modalSaveBtn");
const analysisTextarea = document.getElementById("analysisTextarea");
const exampleToggleBtn = document.getElementById("exampleToggleBtn");
const examplePanel = document.getElementById("examplePanel");
const scaffoldPoints = document.getElementById("scaffoldPoints");
const sentenceStarters = document.getElementById("sentenceStarters");
const annotationList = document.getElementById("annotationList");
const annotationCount = document.getElementById("annotationCount");
const saveAllAnalysisBtn = document.getElementById("saveAllAnalysisBtn");
const saveAllStatus = document.getElementById("saveAllStatus");

function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function poemKey() {
  if (!currentPoem) return "";
  return `${currentPoem.author}|||${currentPoem.title}`;
}

function saveAnnotations() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
  } catch {}
}

function loadAnnotations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) annotations = JSON.parse(raw);
  } catch {}
}

async function ensureUserId() {
  if (currentUserId) return currentUserId;
  if (!window.supabaseClient) return null;
  try {
    const { data, error } = await window.supabaseClient.auth.getUser();
    if (error || !data?.user?.id) return null;
    currentUserId = data.user.id;
    return currentUserId;
  } catch {
    return null;
  }
}

async function fetchPoemAnnotationsFromDb(poemKeyValue) {
  const userId = await ensureUserId();
  if (!userId || !window.supabaseClient) return null;
  try {
    const { data, error } = await window.supabaseClient
      .from("poetry_annotations")
      .select("id, poem_key, line_index, line_text, analysis_type, analysis_text, created_at")
      .eq("user_id", userId)
      .eq("poem_key", poemKeyValue)
      .order("line_index", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Could not load poetry annotations from DB:", error.message);
      return null;
    }

    return (data || []).map((row) => ({
      id: row.id,
      poemKey: row.poem_key,
      lineIndex: row.line_index,
      lineText: row.line_text,
      type: row.analysis_type,
      text: row.analysis_text,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    }));
  } catch (err) {
    console.warn("Could not load poetry annotations from DB:", err);
    return null;
  }
}

async function saveAnnotationToDb(annotation, existingId = null) {
  const userId = await ensureUserId();
  if (!userId || !window.supabaseClient) return null;

  const payload = {
    user_id: userId,
    poem_key: annotation.poemKey,
    line_index: annotation.lineIndex,
    line_text: annotation.lineText,
    analysis_type: annotation.type,
    analysis_text: annotation.text,
  };

  try {
    if (existingId) {
      const { data, error } = await window.supabaseClient
        .from("poetry_annotations")
        .update(payload)
        .eq("id", existingId)
        .eq("user_id", userId)
        .select("id, poem_key, line_index, line_text, analysis_type, analysis_text, created_at")
        .single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await window.supabaseClient
      .from("poetry_annotations")
      .insert(payload)
      .select("id, poem_key, line_index, line_text, analysis_type, analysis_text, created_at")
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn("Could not save poetry annotation to DB:", err);
    return null;
  }
}

async function deleteAnnotationFromDb(annotationId) {
  const userId = await ensureUserId();
  if (!userId || !window.supabaseClient || !annotationId) return false;
  try {
    const { error } = await window.supabaseClient
      .from("poetry_annotations")
      .delete()
      .eq("id", annotationId)
      .eq("user_id", userId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Could not delete poetry annotation from DB:", err);
    return false;
  }
}

function setSaveAllStatus(message, isError = false) {
  if (!saveAllStatus) return;
  saveAllStatus.textContent = message || "";
  saveAllStatus.style.color = isError ? "var(--error)" : "var(--text-secondary)";
}

async function saveAllCurrentPoemAnnotations() {
  if (!currentPoem) {
    setSaveAllStatus("Load a poem first.", true);
    return;
  }

  const relevant = annotations.filter((a) => a.poemKey === poemKey());
  if (!relevant.length) {
    setSaveAllStatus("No annotations to save for this poem.", true);
    return;
  }

  if (saveAllAnalysisBtn) saveAllAnalysisBtn.disabled = true;
  setSaveAllStatus("Saving analysis...");

  let savedCount = 0;
  for (const ann of relevant) {
    const saved = await saveAnnotationToDb(ann, ann.id || null);
    if (saved) {
      ann.id = saved.id;
      ann.createdAt = saved.created_at ? new Date(saved.created_at).getTime() : ann.createdAt;
      savedCount += 1;
    }
  }

  saveAnnotations();
  renderAnnotationList();
  if (saveAllAnalysisBtn) saveAllAnalysisBtn.disabled = false;

  if (savedCount === relevant.length) {
    setSaveAllStatus(`Saved ${savedCount} annotation${savedCount === 1 ? "" : "s"} to DB.`);
  } else {
    setSaveAllStatus(`Saved ${savedCount}/${relevant.length}. Check DB connection or RLS.`, true);
  }
}

async function fetchAuthors() {
  const res = await fetch(`${API}/author`);
  if (!res.ok) throw new Error("Failed to load authors");
  const json = await res.json();
  return json.authors || [];
}

async function fetchTitlesByAuthor(author) {
  const res = await fetch(`${API}/author/${encodeURIComponent(author)}/title`);
  if (!res.ok) throw new Error("Failed to load titles");
  const json = await res.json();
  return (json || []).map((p) => p.title);
}

async function fetchPoem(author, title) {
  const res = await fetch(`${API}/author,title/${encodeURIComponent(author)};${encodeURIComponent(title)}`);
  if (!res.ok) throw new Error("Failed to load poem");
  const json = await res.json();
  if (!Array.isArray(json) || !json.length) throw new Error("Poem not found");
  return json[0];
}

async function fetchRandomPoem() {
  const res = await fetch(`${API}/random`);
  if (!res.ok) throw new Error("Failed to load random poem");
  const json = await res.json();
  if (!Array.isArray(json) || !json.length) throw new Error("Random poem not found");
  return json[0];
}

function showPoemLoading() {
  poemCard.innerHTML = `
    <div class="poem-meta">
      <div class="skeleton-line" style="width:55%;margin-bottom:8px;height:18px;"></div>
      <div class="skeleton-line" style="width:30%;height:13px;"></div>
    </div>
    <div class="poem-skeleton">
      ${Array.from({ length: 12 }, () => `<div class="skeleton-line" style="width:${40 + Math.random() * 45}%;"></div>`).join("")}
    </div>`;
}

function showPoemError(message) {
  poemCard.innerHTML = `<div class="load-error"><i class="fa-solid fa-triangle-exclamation"></i><p>${escHtml(message)}</p></div>`;
}

async function setPoem(poem) {
  currentPoem = poem;
  const key = poemKey();
  const dbAnnotations = await fetchPoemAnnotationsFromDb(key);
  if (Array.isArray(dbAnnotations)) {
    annotations = annotations.filter((a) => a.poemKey !== key).concat(dbAnnotations);
    saveAnnotations();
  }
  renderPoem();
  renderAnnotationList();
}

function renderPoem() {
  if (!currentPoem) return;
  const lines = currentPoem.lines || [];
  const linesHtml = lines
    .map((line, i) => {
      const ann = annotations.filter((a) => a.lineIndex === i && a.poemKey === poemKey());
      const typeClass = ann.length ? `highlighted-${ann[ann.length - 1].type}` : "";
      return `<span class="poem-line ${typeClass}" data-line-index="${i}" role="button" tabindex="0">${escHtml(line) || "&nbsp;"}</span>`;
    })
    .join("");

  poemCard.innerHTML = `
    <div class="poem-meta">
      <div class="poem-title-display">${escHtml(currentPoem.title)}</div>
      <div class="poem-author-display">${escHtml(currentPoem.author)}</div>
    </div>
    <div class="poem-lines-wrap">${linesHtml}</div>`;

  poemCard.querySelectorAll(".poem-line").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = parseInt(el.getAttribute("data-line-index"), 10);
      const line = currentPoem.lines[idx];
      if (!line || !line.trim()) return;
      openModal(idx, line);
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") el.click();
    });
  });
}

function renderScaffold() {
  const data = SCAFFOLD[activeType];
  scaffoldPoints.innerHTML = data.points.map((p) => `<span class="scaffold-chip">${escHtml(p)}</span>`).join("");
  sentenceStarters.innerHTML = data.starters.map((s) => `<span class="scaffold-chip">${escHtml(s)}</span>`).join("");
  examplePanel.textContent = data.example;
}

function openModal(lineIndex, lineText, existingAnnotIndex = null) {
  currentLineIndex = lineIndex;
  editingIndex = existingAnnotIndex;
  activeType = "language";
  modalSelectedLine.textContent = `"${lineText}"`;

  if (existingAnnotIndex !== null) {
    const ann = annotations[existingAnnotIndex];
    activeType = ann.type;
    analysisTextarea.value = ann.text;
  } else {
    analysisTextarea.value = "";
  }

  document.querySelectorAll(".type-tab").forEach((t) => t.classList.toggle("active", t.dataset.type === activeType));
  renderScaffold();
  examplePanel.classList.remove("is-open");
  exampleToggleBtn.innerHTML = '<i class="fa-solid fa-lightbulb"></i> Show example analysis';
  modalBackdrop.style.display = "grid";
  analysisTextarea.focus();
}

function closeModal() {
  modalBackdrop.style.display = "none";
  currentLineIndex = null;
  editingIndex = null;
}

function renderAnnotationList() {
  const relevant = annotations.filter((a) => a.poemKey === poemKey());
  annotationCount.textContent = relevant.length ? `(${relevant.length})` : "";

  if (!relevant.length) {
    annotationList.innerHTML = '<div class="analysis-empty">No annotations yet.<br>Click a line to start.</div>';
    return;
  }

  annotationList.innerHTML = relevant
    .map((ann) => {
      const globalIndex = annotations.indexOf(ann);
      return `
        <div class="analysis-item" data-global="${globalIndex}">
          <span class="analysis-item-type type-${ann.type}">${ann.type}</span>
          <div class="analysis-item-quote">"${escHtml(ann.lineText)}"</div>
          <div class="analysis-item-text">${escHtml(ann.text)}</div>
          <button class="analysis-item-delete" data-delete="${globalIndex}" title="Delete annotation"><i class="fa-solid fa-xmark"></i></button>
        </div>`;
    })
    .join("");

  annotationList.querySelectorAll(".analysis-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      if (e.target.closest("[data-delete]")) return;
      const idx = parseInt(item.dataset.global, 10);
      const ann = annotations[idx];
      openModal(ann.lineIndex, ann.lineText, idx);
    });
  });

  annotationList.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.delete, 10);
      const target = annotations[idx];
      if (target?.id) await deleteAnnotationFromDb(target.id);
      annotations.splice(idx, 1);
      saveAnnotations();
      renderPoem();
      renderAnnotationList();
    });
  });
}

async function initAuthors() {
  try {
    const authors = await fetchAuthors();
    authorSelect.innerHTML = '<option value="">- Choose author -</option>' + authors.map((a) => `<option value="${escHtml(a)}">${escHtml(a)}</option>`).join("");
  } catch {
    authorSelect.innerHTML = '<option value="">Error loading authors</option>';
  }
}

authorSelect.addEventListener("change", async () => {
  const author = authorSelect.value;
  titleSelect.disabled = true;
  titleSelect.innerHTML = '<option value="">Loading...</option>';
  loadPoemBtn.disabled = true;
  if (!author) {
    titleSelect.innerHTML = '<option value="">- Pick an author first -</option>';
    return;
  }

  try {
    const titles = await fetchTitlesByAuthor(author);
    titleSelect.innerHTML = '<option value="">- Choose poem -</option>' + titles.map((t) => `<option value="${escHtml(t)}">${escHtml(t)}</option>`).join("");
    titleSelect.disabled = false;
  } catch {
    titleSelect.innerHTML = '<option value="">Error loading poems</option>';
  }
});

titleSelect.addEventListener("change", () => {
  loadPoemBtn.disabled = !titleSelect.value;
});

loadPoemBtn.addEventListener("click", async () => {
  const author = authorSelect.value;
  const title = titleSelect.value;
  if (!author || !title) return;
  showPoemLoading();
  try {
    await setPoem(await fetchPoem(author, title));
  } catch (err) {
    showPoemError(err.message);
  }
});

randomPoemBtn.addEventListener("click", async () => {
  showPoemLoading();
  try {
    await setPoem(await fetchRandomPoem());
  } catch (err) {
    showPoemError(err.message);
  }
});

document.querySelectorAll(".type-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    activeType = tab.dataset.type;
    document.querySelectorAll(".type-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    renderScaffold();
  });
});

scaffoldPoints.addEventListener("click", (e) => {
  if (!e.target.classList.contains("scaffold-chip")) return;
  analysisTextarea.value += (analysisTextarea.value ? "\n" : "") + `${e.target.textContent}: `;
  analysisTextarea.focus();
});

sentenceStarters.addEventListener("click", (e) => {
  if (!e.target.classList.contains("scaffold-chip")) return;
  analysisTextarea.value += (analysisTextarea.value ? "\n" : "") + e.target.textContent;
  analysisTextarea.focus();
});

exampleToggleBtn.addEventListener("click", () => {
  const open = examplePanel.classList.toggle("is-open");
  exampleToggleBtn.innerHTML = open ? '<i class="fa-solid fa-eye-slash"></i> Hide example' : '<i class="fa-solid fa-lightbulb"></i> Show example analysis';
});

modalCloseBtn.addEventListener("click", closeModal);
modalCancelBtn.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});

modalSaveBtn.addEventListener("click", async () => {
  const text = analysisTextarea.value.trim();
  if (!text || !currentPoem) return;

  const existing = editingIndex !== null ? annotations[editingIndex] : null;
  const annotation = {
    id: existing?.id,
    poemKey: poemKey(),
    lineIndex: currentLineIndex,
    lineText: currentPoem.lines[currentLineIndex],
    type: activeType,
    text,
    createdAt: Date.now(),
  };

  const saved = await saveAnnotationToDb(annotation, existing?.id || null);
  if (saved) {
    annotation.id = saved.id;
    annotation.createdAt = saved.created_at ? new Date(saved.created_at).getTime() : annotation.createdAt;
  }

  if (editingIndex !== null) {
    annotations[editingIndex] = annotation;
  } else {
    annotations.push(annotation);
  }

  saveAnnotations();
  closeModal();
  renderPoem();
  renderAnnotationList();
});

if (saveAllAnalysisBtn) {
  saveAllAnalysisBtn.addEventListener("click", saveAllCurrentPoemAnnotations);
}

loadAnnotations();
initAuthors();
