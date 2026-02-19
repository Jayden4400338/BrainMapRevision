


(function() {
    
    let allQuestions = [];
    let allSubjects = [];
    let currentView = 'list';
    let filters = {
        subject: '',
        examBoard: '',
        year: '',
        difficulty: '',
        search: ''
    };

    
    const subjectFilter = document.getElementById('subjectFilter');
    const examBoardFilter = document.getElementById('examBoardFilter');
    const yearFilter = document.getElementById('yearFilter');
    const difficultyFilter = document.getElementById('difficultyFilter');
    const searchInput = document.getElementById('searchInput');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const questionsContainer = document.getElementById('questionsContainer');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const emptyState = document.getElementById('emptyState');
    const resultsCount = document.getElementById('resultsCount');
    const viewBtns = document.querySelectorAll('.view-btn');

    
    
    

    async function loadSubjects() {
        try {
            const { data, error } = await window.supabaseClient
                .from('subjects')
                .select('id, name, slug')
                .order('name');

            if (error) throw error;

            allSubjects = data;
            populateSubjectFilter(data);
        } catch (error) {
            console.error('Error loading subjects:', error);
        }
    }

    async function loadQuestions() {
        try {
            showLoading();

            const { data, error } = await window.supabaseClient
                .from('past_paper_questions')
                .select(`
                    *,
                    subjects (
                        name,
                        slug
                    )
                `)
                .order('year', { ascending: false });

            if (error) throw error;

            allQuestions = data;
            populateYearFilter(data);
            applyFilters();
            hideLoading();

        } catch (error) {
            console.error('Error loading questions:', error);
            showError();
        }
    }

    
    
    

    function populateSubjectFilter(subjects) {
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.id;
            option.textContent = subject.name;
            subjectFilter.appendChild(option);
        });

        
        const urlParams = new URLSearchParams(window.location.search);
        const subjectId = urlParams.get('subject');
        if (subjectId) {
            subjectFilter.value = subjectId;
            filters.subject = subjectId;
        }
    }

    function populateYearFilter(questions) {
        const years = [...new Set(questions.map(q => q.year))].sort((a, b) => b - a);
        
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearFilter.appendChild(option);
        });
    }

    
    
    

    function applyFilters() {
        let filtered = [...allQuestions];

        
        if (filters.subject) {
            filtered = filtered.filter(q => q.subject_id == filters.subject);
        }

        
        if (filters.examBoard) {
            filtered = filtered.filter(q => q.exam_board === filters.examBoard);
        }

        
        if (filters.year) {
            filtered = filtered.filter(q => q.year == filters.year);
        }

        
        if (filters.difficulty) {
            filtered = filtered.filter(q => q.difficulty === filters.difficulty);
        }

        
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(q => {
                const questionText = String(q.question_text || '').toLowerCase();
                const topics = Array.isArray(q.topics) ? q.topics.join(' ').toLowerCase() : '';
                return questionText.includes(searchLower) || topics.includes(searchLower);
            });
        }

        displayQuestions(filtered);
        updateResultsCount(filtered.length);
    }

    function clearFilters() {
        filters = {
            subject: '',
            examBoard: '',
            year: '',
            difficulty: '',
            search: ''
        };

        subjectFilter.value = '';
        examBoardFilter.value = '';
        yearFilter.value = '';
        difficultyFilter.value = '';
        searchInput.value = '';

        applyFilters();
    }

    
    
    

    function displayQuestions(questions) {
        if (questions.length === 0) {
            showEmpty();
            return;
        }

        hideEmpty();
        questionsContainer.innerHTML = '';

        questions.forEach(question => {
            const card = createQuestionCard(question);
            questionsContainer.appendChild(card);
        });

        
        questionsContainer.className = `questions-container ${currentView === 'grid' ? 'grid-view' : ''}`;
    }

    function createQuestionCard(question) {
        const card = document.createElement('div');
        card.className = 'question-card';
        card.dataset.id = question.id;

        const subjectName = question.subjects?.name || 'Unknown';
        const topics = question.topics || [];

        card.innerHTML = `
            <div class="question-header">
                <div class="question-meta">
                    <span class="question-badge">${question.exam_board}</span>
                    <div class="question-info">
                        <span><i class="fa-solid fa-book"></i> ${subjectName}</span>
                        <span><i class="fa-solid fa-calendar"></i> ${question.year}</span>
                        <span><i class="fa-solid fa-file"></i> Paper ${question.paper_number}</span>
                        <span><i class="fa-solid fa-hashtag"></i> Q${question.question_number}</span>
                        ${question.difficulty ? `<span><i class="fa-solid fa-signal"></i> ${question.difficulty}</span>` : ''}
                    </div>
                </div>
                <div class="question-marks">
                    ${question.marks} mark${question.marks !== 1 ? 's' : ''}
                </div>
            </div>

            <div class="question-text">
                ${question.question_text}
            </div>

            ${topics.length > 0 ? `
                <div class="question-topics">
                    ${topics.map(topic => `<span class="topic-tag">${topic}</span>`).join('')}
                </div>
            ` : ''}

            <div class="question-actions">
                <button class="btn-outline" onclick="toggleMarkScheme(${question.id})">
                    <i class="fa-solid fa-eye"></i>
                    View Mark Scheme
                </button>
                ${question.revision_guide_id ? `
                    <button class="btn-outline">
                        <i class="fa-solid fa-book-open"></i>
                        Revision Guide
                    </button>
                ` : ''}
                <button class="btn-outline">
                    <i class="fa-solid fa-plus"></i>
                    Add to Board
                </button>
            </div>

            <div class="mark-scheme" id="markScheme${question.id}">
                <div class="mark-scheme-header">
                    <i class="fa-solid fa-clipboard-check"></i>
                    Mark Scheme
                </div>
                <div class="mark-scheme-content">
                    ${question.mark_scheme || 'No mark scheme available.'}
                </div>
                ${question.examiner_comments ? `
                    <div class="mark-scheme-header" style="margin-top: 15px;">
                        <i class="fa-solid fa-comment"></i>
                        Examiner Comments
                    </div>
                    <div class="mark-scheme-content">
                        ${question.examiner_comments}
                    </div>
                ` : ''}
            </div>
        `;

        return card;
    }

    
    
    

    window.toggleMarkScheme = function(questionId) {
        const markScheme = document.getElementById(`markScheme${questionId}`);
        if (markScheme) {
            markScheme.classList.toggle('visible');
        }
    };

    
    
    

    function toggleView(view) {
        currentView = view;
        
        viewBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === view) {
                btn.classList.add('active');
            }
        });

        questionsContainer.className = `questions-container ${view === 'grid' ? 'grid-view' : ''}`;
    }

    
    
    

    function showLoading() {
        loadingState.style.display = 'flex';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
        questionsContainer.style.display = 'none';
    }

    function hideLoading() {
        loadingState.style.display = 'none';
        questionsContainer.style.display = '';
    }

    function showError() {
        loadingState.style.display = 'none';
        errorState.style.display = 'flex';
        questionsContainer.style.display = 'none';
    }

    function showEmpty() {
        emptyState.style.display = 'flex';
        questionsContainer.style.display = 'none';
    }

    function hideEmpty() {
        emptyState.style.display = 'none';
        questionsContainer.style.display = '';
    }

    function updateResultsCount(count) {
        resultsCount.textContent = `Showing ${count} question${count !== 1 ? 's' : ''}`;
    }

    
    
    

    function setupEventListeners() {
        
        subjectFilter.addEventListener('change', (e) => {
            filters.subject = e.target.value;
            applyFilters();
        });

        examBoardFilter.addEventListener('change', (e) => {
            filters.examBoard = e.target.value;
            applyFilters();
        });

        yearFilter.addEventListener('change', (e) => {
            filters.year = e.target.value;
            applyFilters();
        });

        difficultyFilter.addEventListener('change', (e) => {
            filters.difficulty = e.target.value;
            applyFilters();
        });

        
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filters.search = e.target.value;
                applyFilters();
            }, 300);
        });

        
        clearFiltersBtn.addEventListener('click', clearFilters);

        
        viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toggleView(btn.dataset.view);
            });
        });
    }

    
    
    

    async function init() {
       
        
        setupEventListeners();
        await loadSubjects();
        await loadQuestions();
        
    
    }

    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
