// Quiz Engine for BrainMapRevision
(function() {
    // ======================
    // STATE MANAGEMENT
    // ======================
    let currentQuiz = null;
    let currentQuestionIndex = 0;
    let selectedQuestions = [];
    let userAnswers = [];
    let hintsUsed = 0;
    let currentUser = null;
    let timerInterval = null;
    let quizStartTime = null;
    let questionAnswered = false; // Track if current question is answered
    let completedQuizzes = new Set(); // Track completed quiz IDs to prevent farming
    let allQuizQuestions = [];

    // ======================
    // DOM ELEMENTS
    // ======================
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const quizzesListSection = document.getElementById('quizzesListSection');
    const quizzesGrid = document.getElementById('quizzesGrid');
    const quizInterface = document.getElementById('quizInterface');
    const resultsScreen = document.getElementById('resultsScreen');

    // Filters
    const subjectFilter = document.getElementById('subjectFilter');
    const topicFilter = document.getElementById('topicFilter');
    const difficultyFilter = document.getElementById('difficultyFilter');
    const questionCountFilter = document.getElementById('questionCountFilter');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');

    // Quiz Interface
    const quizTitle = document.getElementById('quizTitle');
    const quizSubject = document.getElementById('quizSubject');
    const quizTopic = document.getElementById('quizTopic');
    const currentQuestionEl = document.getElementById('currentQuestion');
    const totalQuestionsEl = document.getElementById('totalQuestions');
    const quizProgressBar = document.getElementById('quizProgressBar');
    const questionText = document.getElementById('questionText');
    const questionOptions = document.getElementById('questionOptions');
    const hintSection = document.getElementById('hintSection');
    const hintText = document.getElementById('hintText');
    const useHintBtn = document.getElementById('useHintBtn');
    const submitAnswerBtn = document.getElementById('submitAnswerBtn');
    const exitQuizBtn = document.getElementById('exitQuizBtn');

    // Results
    const scorePercentage = document.getElementById('scorePercentage');
    const scoreFraction = document.getElementById('scoreFraction');
    const scoreRingFill = document.getElementById('scoreRingFill');
    const xpEarned = document.getElementById('xpEarned');
    const coinsEarned = document.getElementById('coinsEarned');
    const hintsUsedEl = document.getElementById('hintsUsed');
    const retakeQuizBtn = document.getElementById('retakeQuizBtn');
    const reviewAnswersBtn = document.getElementById('reviewAnswersBtn');

    // ======================
    // INITIALIZATION
    // ======================
    async function init() {
        console.log('🚀 Initializing quiz engine...');
        
        await loadCurrentUser();
        await loadSubjects();
        await loadAvailableQuizzes();
        setupEventListeners();
        
        console.log('✅ Quiz engine initialized');
    }

    // ======================
    // LOAD USER
    // ======================
    async function loadCurrentUser() {
        try {
            const { data: { user }, error } = await window.supabaseClient.auth.getUser();
            
            if (error) throw error;
            
            if (!user) {
                window.location.href = '../auth/login.html';
                return;
            }

            // Get user profile
            const { data: profile, error: profileError } = await window.supabaseClient
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;

            currentUser = profile;
            updateHintTokenDisplay();
            
            // Load completed quizzes for this user
            loadCompletedQuizzes();
            
        } catch (error) {
            console.error('Error loading user:', error);
            showError('Failed to load user data');
        }
    }

    // ======================
    // LOAD SUBJECTS
    // ======================
    async function loadSubjects() {
        try {
            const { data, error } = await window.supabaseClient
                .from('subjects')
                .select('id, name, slug')
                .order('name');

            if (error) throw error;

            // Populate subject filter
            subjectFilter.innerHTML = '<option value="">All Subjects</option>';
            data.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject.id;
                option.textContent = subject.name;
                subjectFilter.appendChild(option);
            });

        } catch (error) {
            console.error('Error loading subjects:', error);
        }
    }

    // ======================
    // LOAD AVAILABLE QUIZZES
    // ======================
    async function loadAvailableQuizzes() {
        try {
            showLoading();

            // Always fetch then filter client-side for reliable filtering UX
            const { data, error } = await window.supabaseClient
                .from('quiz_questions')
                .select(`
                    *,
                    subjects (
                        name,
                        slug
                    )
                `)
                .order('topic');

            if (error) throw error;

            allQuizQuestions = Array.isArray(data) ? data : [];
            let filtered = [...allQuizQuestions];

            if (subjectFilter.value) {
                const subjectId = Number(subjectFilter.value);
                filtered = filtered.filter((q) => Number(q.subject_id) === subjectId);
            }

            if (difficultyFilter.value) {
                filtered = filtered.filter((q) => q.difficulty === difficultyFilter.value);
            }

            if (topicFilter.value) {
                filtered = filtered.filter((q) => q.topic === topicFilter.value);
            }

            if (!filtered || filtered.length === 0) {
                quizzesGrid.innerHTML = '<p class="no-results">No quizzes match your filters. Try adjusting them.</p>';
                quizzesListSection.style.display = 'block';
                hideLoading();
                return;
            }

            // Group questions by topic
            const quizzesByTopic = groupQuestionsByTopic(filtered);
            
            displayAvailableQuizzes(quizzesByTopic);
            hideLoading();

        } catch (error) {
            console.error('Error loading quizzes:', error);
            showError();
        }
    }

    // ======================
    // GROUP QUESTIONS BY TOPIC
    // ======================
    function groupQuestionsByTopic(questions) {
        const grouped = {};

        questions.forEach(q => {
            const key = `${q.subject_id}-${q.topic}`;
            
            if (!grouped[key]) {
                grouped[key] = {
                    subject_id: q.subject_id,
                    subject_name: q.subjects?.name || 'Unknown',
                    topic: q.topic,
                    questions: [],
                    difficulty: q.difficulty
                };
            }

            grouped[key].questions.push(q);
        });

        return Object.values(grouped);
    }

    // ======================
    // DISPLAY AVAILABLE QUIZZES
    // ======================
    function displayAvailableQuizzes(quizzes) {
        quizzesGrid.innerHTML = '';

        if (quizzes.length === 0) {
            quizzesGrid.innerHTML = '<p class="no-results">No quizzes available</p>';
            return;
        }

        quizzes.forEach(quiz => {
            const card = createQuizCard(quiz);
            quizzesGrid.appendChild(card);
        });

        quizzesListSection.style.display = 'block';
        document.getElementById('resultsCount').textContent = `${quizzes.length} quiz${quizzes.length !== 1 ? 'zes' : ''} available`;
    }

    // ======================
    // CREATE QUIZ CARD
    // ======================
    function createQuizCard(quiz) {
        const card = document.createElement('div');
        card.className = 'quiz-card';
        
        const questionCount = parseInt(questionCountFilter.value) || 10;
        const availableQuestions = quiz.questions.length;
        const actualCount = Math.min(questionCount, availableQuestions);
        
        // Calculate rewards
        const baseXP = 20;
        const baseCoins = 10;
        const xpReward = Math.floor(baseXP * (actualCount / 10));
        const coinReward = Math.floor(baseCoins * (actualCount / 10));

        const subjectColors = {
            'Mathematics': '#3B82F6',
            'English': '#EF4444',
            'Science': '#10B981',
            'History': '#F59E0B',
            'Geography': '#14B8A6'
        };

        const color = subjectColors[quiz.subject_name] || '#A78BFA';

        card.innerHTML = `
            <div class="quiz-card-header">
                <div class="quiz-icon" style="background: ${color}">
                    ${getSubjectIcon(quiz.subject_name)}
                </div>
                <span class="difficulty-badge ${quiz.difficulty}">${quiz.difficulty}</span>
            </div>
            <h3 class="quiz-title">${quiz.topic}</h3>
            <div class="quiz-meta">
                <i class="fa-solid fa-book"></i>
                <span>${quiz.subject_name}</span>
            </div>
            <div class="quiz-stats">
                <div class="quiz-stat">
                    <i class="fa-solid fa-list-ol"></i>
                    <span>${actualCount} Questions</span>
                </div>
            </div>
            <div class="quiz-rewards">
                <div class="reward-badge">
                    <div class="reward-value">
                        <i class="fa-solid fa-star"></i>
                        +${xpReward}
                    </div>
                    <div class="reward-label">XP</div>
                </div>
                <div class="reward-badge">
                    <div class="reward-value">
                        <i class="fa-solid fa-coins"></i>
                        +${coinReward}
                    </div>
                    <div class="reward-label">Coins</div>
                </div>
            </div>
        `;

        card.addEventListener('click', () => startQuiz(quiz));

        return card;
    }

    // ======================
    // GET SUBJECT ICON
    // ======================
    function getSubjectIcon(subject) {
        const icons = {
            'Mathematics': '📐',
            'English': '📖',
            'Science': '🔬',
            'History': '📜',
            'Geography': '🌍',
            'Computer Science': '💻',
            'Art & Design': '🎨',
            'Languages': '🗣️'
        };
        return icons[subject] || '📚';
    }

    // ======================
    // START QUIZ
    // ======================
    async function startQuiz(quiz) {
        const questionCount = parseInt(questionCountFilter.value) || 10;
        
        // Create unique quiz ID based on subject and topic
        const quizId = `${quiz.subject_id}-${quiz.topic}`;
        
        // Check if already completed this quiz
        if (completedQuizzes.has(quizId)) {
            showConfirmModal(
                'Quiz Already Completed',
                'You\'ve already completed this quiz. Retaking it will not award additional XP or coins. Continue anyway?',
                () => proceedWithQuiz(quiz, questionCount, quizId, true)
            );
            return;
        }
        
        proceedWithQuiz(quiz, questionCount, quizId, false);
    }
    
    function proceedWithQuiz(quiz, questionCount, quizId, isRetake) {
        // Shuffle and select questions
        const shuffled = [...quiz.questions].sort(() => Math.random() - 0.5);
        selectedQuestions = shuffled.slice(0, Math.min(questionCount, shuffled.length));
        
        currentQuiz = { ...quiz, isRetake, quizId };
        currentQuestionIndex = 0;
        userAnswers = [];
        hintsUsed = 0;
        questionAnswered = false;
        quizStartTime = new Date();

        // Hide quiz list, show quiz interface
        quizzesListSection.style.display = 'none';
        quizInterface.style.display = 'block';
        resultsScreen.style.display = 'none';

        // Set quiz info
        quizTitle.textContent = quiz.topic + (isRetake ? ' (Retake - No Rewards)' : '');
        quizSubject.textContent = quiz.subject_name;
        quizTopic.textContent = quiz.topic;
        totalQuestionsEl.textContent = selectedQuestions.length;

        displayQuestion();
    }

    // ======================
    // DISPLAY QUESTION
    // ======================
    function displayQuestion() {
        const question = selectedQuestions[currentQuestionIndex];
        
        console.log('Displaying question:', question); // Debug
        
        // Reset question answered state
        questionAnswered = false;
        
        currentQuestionEl.textContent = currentQuestionIndex + 1;
        questionText.textContent = question.question;
        
        // Update progress bar
        const progress = ((currentQuestionIndex + 1) / selectedQuestions.length) * 100;
        quizProgressBar.style.width = `${progress}%`;

        // Clear previous options
        questionOptions.innerHTML = '';
        hintSection.style.display = 'none';

        console.log('Question type:', question.question_type); // Debug

        // Display options based on question type
        if (question.question_type === 'multiple_choice') {
            let options;
            
            // Parse options if it's a string
            if (typeof question.options === 'string') {
                try {
                    options = JSON.parse(question.options);
                } catch (e) {
                    console.error('Failed to parse options:', e);
                    options = [];
                }
            } else if (Array.isArray(question.options)) {
                options = question.options;
            } else {
                console.error('Invalid options format:', question.options);
                options = [];
            }

            console.log('Parsed options:', options); // Debug
            
            if (options.length > 0) {
                options.forEach((option, index) => {
                    const btn = document.createElement('button');
                    btn.className = 'option-btn';
                    btn.textContent = option;
                    btn.onclick = () => selectOption(index);
                    questionOptions.appendChild(btn);
                });
            } else {
                questionOptions.innerHTML = '<p style="color: var(--text-secondary);">No options available for this question.</p>';
            }
        } else {
            // Short answer or other types
            console.log('Creating short answer input'); // Debug
            
            const inputWrapper = document.createElement('div');
            inputWrapper.style.cssText = 'width: 100%; margin-top: 10px;';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'shortAnswerInput';
            input.className = 'short-answer-input';
            input.placeholder = 'Type your answer here...';
            input.style.cssText = `
                width: 100%;
                padding: 18px 24px;
                background: var(--bg-secondary);
                border: 2px solid var(--border-color);
                border-radius: 12px;
                font-size: 1rem;
                color: var(--text-primary);
                transition: var(--transition);
                box-sizing: border-box;
            `;
            
            input.oninput = () => {
                submitAnswerBtn.disabled = !input.value.trim();
                if (input.value.trim()) {
                    input.style.borderColor = 'var(--accent-primary)';
                } else {
                    input.style.borderColor = 'var(--border-color)';
                }
            };
            
            // Submit on Enter key
            input.onkeypress = (e) => {
                if (e.key === 'Enter' && input.value.trim() && !questionAnswered) {
                    submitAnswer();
                }
            };
            
            input.onfocus = () => {
                input.style.borderColor = 'var(--accent-primary)';
                input.style.boxShadow = '0 0 0 3px rgba(167, 139, 250, 0.1)';
            };
            
            input.onblur = () => {
                if (!input.value.trim()) {
                    input.style.borderColor = 'var(--border-color)';
                }
                input.style.boxShadow = 'none';
            };
            
            inputWrapper.appendChild(input);
            questionOptions.appendChild(inputWrapper);
            
            console.log('Input added to DOM'); // Debug
            
            // Auto-focus the input
            setTimeout(() => {
                input.focus();
                console.log('Input focused'); // Debug
            }, 100);
        }

        submitAnswerBtn.disabled = true;
        updateHintTokenDisplay();
    }

    // ======================
    // SELECT OPTION
    // ======================
    function selectOption(index) {
        const buttons = questionOptions.querySelectorAll('.option-btn');
        buttons.forEach(btn => btn.classList.remove('selected'));
        buttons[index].classList.add('selected');
        
        submitAnswerBtn.disabled = false;
    }

    // ======================
    // USE HINT
    // ======================
    async function useHint() {
        // Check if question already answered
        if (questionAnswered) {
            showNotification('You cannot use hints after answering the question!', 'warning');
            return;
        }
        
        if (currentUser.hint_tokens < 1) {
            showNotification('No hint tokens available! Purchase more in the shop.', 'error');
            return;
        }

        const question = selectedQuestions[currentQuestionIndex];
        
        // Deduct hint token
        try {
            const { error } = await window.supabaseClient
                .from('users')
                .update({ hint_tokens: currentUser.hint_tokens - 1 })
                .eq('id', currentUser.id);

            if (error) throw error;

            currentUser.hint_tokens--;
            hintsUsed++;
            updateHintTokenDisplay();

            // Show hint based on question type
            if (question.question_type === 'multiple_choice') {
                // Remove two wrong answers
                const options = typeof question.options === 'string' 
                    ? JSON.parse(question.options) 
                    : question.options;
                const correctIndex = options.indexOf(question.correct_answer);
                const wrongIndexes = options
                    .map((opt, idx) => idx)
                    .filter(idx => idx !== correctIndex);

                const toRemove = wrongIndexes.sort(() => Math.random() - 0.5).slice(0, 2);
                
                const buttons = questionOptions.querySelectorAll('.option-btn');
                toRemove.forEach(idx => {
                    buttons[idx].disabled = true;
                    buttons[idx].style.opacity = '0.3';
                    buttons[idx].style.cursor = 'not-allowed';
                });

                hintText.textContent = 'Two incorrect answers have been removed! 💡';
            } else {
                // Show explanation or give a clue
                if (question.explanation) {
                    hintText.textContent = `💡 Hint: ${question.explanation}`;
                } else {
                    hintText.textContent = `💡 Think about the key concepts for ${question.topic}. The answer is related to the topic you're studying.`;
                }
            }

            hintSection.style.display = 'block';
            
            // Animate hint section
            hintSection.style.animation = 'slideDown 0.3s ease';
            
            showNotification('Hint used! -1 token', 'success');

        } catch (error) {
            console.error('Error using hint:', error);
            showNotification('Failed to use hint. Please try again.', 'error');
        }
    }

    // ======================
    // SUBMIT ANSWER
    // ======================
    function submitAnswer() {
        // Prevent multiple submissions
        if (questionAnswered) return;
        
        const question = selectedQuestions[currentQuestionIndex];
        let userAnswer;
        let isCorrect;

        if (question.question_type === 'multiple_choice') {
            const selectedBtn = questionOptions.querySelector('.option-btn.selected');
            if (!selectedBtn) return;

            userAnswer = selectedBtn.textContent;
            isCorrect = userAnswer === question.correct_answer;

            // Show correct/incorrect
            const buttons = questionOptions.querySelectorAll('.option-btn');
            buttons.forEach(btn => {
                btn.disabled = true;
                if (btn.textContent === question.correct_answer) {
                    btn.classList.add('correct');
                } else if (btn.classList.contains('selected')) {
                    btn.classList.add('incorrect');
                }
            });

        } else {
            const input = document.getElementById('shortAnswerInput');
            if (!input) return;
            
            userAnswer = input.value.trim();
            isCorrect = userAnswer.toLowerCase() === question.correct_answer.toLowerCase();

            // Disable input and show result
            input.disabled = true;
            
            if (isCorrect) {
                input.style.borderColor = '#48BB78';
                input.style.background = 'rgba(72, 187, 120, 0.2)';
            } else {
                input.style.borderColor = '#F56565';
                input.style.background = 'rgba(245, 101, 101, 0.2)';
                
                // Show correct answer
                const correctAnswerDiv = document.createElement('div');
                correctAnswerDiv.style.cssText = `
                    margin-top: 15px;
                    padding: 15px;
                    background: rgba(72, 187, 120, 0.1);
                    border: 1px solid rgba(72, 187, 120, 0.3);
                    border-radius: 10px;
                    color: var(--text-primary);
                `;
                correctAnswerDiv.innerHTML = `<strong>Correct answer:</strong> ${question.correct_answer}`;
                questionOptions.appendChild(correctAnswerDiv);
            }
        }

        // Mark as answered - prevents hint use
        questionAnswered = true;

        // Store answer
        userAnswers.push({
            questionId: question.id,
            userAnswer: userAnswer,
            correctAnswer: question.correct_answer,
            isCorrect: isCorrect
        });

        // Show explanation
        if (question.explanation) {
            hintText.textContent = question.explanation;
            hintSection.style.display = 'block';
        }

        // Disable hint button after answer
        if (useHintBtn) {
            useHintBtn.disabled = true;
            useHintBtn.style.opacity = '0.5';
            useHintBtn.style.cursor = 'not-allowed';
        }

        // Change button to "Next"
        submitAnswerBtn.textContent = currentQuestionIndex < selectedQuestions.length - 1 ? 'Next Question' : 'Finish Quiz';
        submitAnswerBtn.onclick = nextQuestion;
    }

    // ======================
    // NEXT QUESTION
    // ======================
    function nextQuestion() {
        currentQuestionIndex++;

        if (currentQuestionIndex < selectedQuestions.length) {
            displayQuestion();
            submitAnswerBtn.textContent = 'Submit Answer';
            submitAnswerBtn.onclick = submitAnswer;
            
            // Re-enable hint button for new question
            if (useHintBtn) {
                useHintBtn.disabled = false;
                useHintBtn.style.opacity = '1';
                useHintBtn.style.cursor = 'pointer';
            }
        } else {
            finishQuiz();
        }
    }

    // ======================
    // FINISH QUIZ
    // ======================
    async function finishQuiz() {
        const score = userAnswers.filter(a => a.isCorrect).length;
        const total = selectedQuestions.length;
        const percentage = Math.round((score / total) * 100);

        // Check if this is a retake (no rewards)
        const isRetake = currentQuiz.isRetake;
        
        let totalXP = 0;
        let totalCoins = 0;

        if (!isRetake) {
            // Calculate rewards only for first attempt
            const baseXP = 20;
            const perfectBonus = percentage === 100 ? 50 : 0;
            const hintPenalty = hintsUsed * 2;
            totalXP = Math.max(baseXP + perfectBonus - hintPenalty, 10);

            const baseCoins = 10;
            const perfectCoinBonus = percentage === 100 ? 25 : 0;
            totalCoins = baseCoins + perfectCoinBonus;
        }

        // Save quiz to database
        try {
            const { error: quizError } = await window.supabaseClient
                .from('quizzes')
                .insert({
                    user_id: currentUser.id,
                    subject_id: currentQuiz.subject_id,
                    score: score,
                    total_questions: total,
                    xp_earned: totalXP,
                    coins_earned: totalCoins,
                    hints_used: hintsUsed,
                    completion_time: Math.floor((new Date() - quizStartTime) / 1000)
                });

            if (quizError) throw quizError;

            let xpData = null;

            // Award XP and Coins only if not a retake
            if (!isRetake) {
                // Award XP
                const { data: xpResult, error: xpError } = await window.supabaseClient
                    .rpc('increment_xp', {
                        user_uuid: currentUser.id,
                        xp_amount: totalXP
                    });

                if (xpError) throw xpError;
                xpData = xpResult;

                // Award Coins
                const { error: coinError } = await window.supabaseClient
                    .rpc('award_coins', {
                        user_uuid: currentUser.id,
                        coin_amount: totalCoins
                    });

                if (coinError) throw coinError;

                // Mark quiz as completed to prevent farming
                completedQuizzes.add(currentQuiz.quizId);
                
                // Save to localStorage to persist across sessions
                saveCompletedQuizzes();
            }

            // Show results
            showResults(score, total, percentage, totalXP, totalCoins, xpData, isRetake);

        } catch (error) {
            console.error('Error saving quiz:', error);
            showNotification('Quiz completed but failed to save results.', 'error');
        }
    }
    
    // ======================
    // SAVE/LOAD COMPLETED QUIZZES
    // ======================
    function saveCompletedQuizzes() {
        try {
            const completed = Array.from(completedQuizzes);
            localStorage.setItem(`completedQuizzes_${currentUser.id}`, JSON.stringify(completed));
        } catch (e) {
            console.warn('Could not save completed quizzes:', e);
        }
    }
    
    function loadCompletedQuizzes() {
        try {
            if (!currentUser) return;
            const stored = localStorage.getItem(`completedQuizzes_${currentUser.id}`);
            if (stored) {
                const completed = JSON.parse(stored);
                completedQuizzes = new Set(completed);
            }
        } catch (e) {
            console.warn('Could not load completed quizzes:', e);
            completedQuizzes = new Set();
        }
    }

    // ======================
    // SHOW RESULTS
    // ======================
    function showResults(score, total, percentage, xp, coins, xpData, isRetake) {
        quizInterface.style.display = 'none';
        resultsScreen.style.display = 'block';

        scorePercentage.textContent = `${percentage}%`;
        scoreFraction.textContent = `${score}/${total}`;
        
        if (isRetake) {
            xpEarned.textContent = `+0 XP`;
            coinsEarned.textContent = `+0 Coins`;
            xpEarned.parentElement.querySelector('.stat-label').textContent = 'No Rewards (Retake)';
            coinsEarned.parentElement.querySelector('.stat-label').textContent = 'No Rewards (Retake)';
            
            // Show retake notice
            showNotification('Retake completed! No XP or coins awarded.', 'info');
        } else {
            xpEarned.textContent = `+${xp} XP`;
            coinsEarned.textContent = `+${coins} Coins`;
            xpEarned.parentElement.querySelector('.stat-label').textContent = 'Experience Earned';
            coinsEarned.parentElement.querySelector('.stat-label').textContent = 'Brain Coins';
        }
        
        hintsUsedEl.textContent = `${hintsUsed} Used`;

        // Animate score ring
        const circumference = 2 * Math.PI * 90;
        const offset = circumference - (percentage / 100) * circumference;
        scoreRingFill.style.strokeDasharray = `${circumference} ${circumference}`;
        scoreRingFill.style.strokeDashoffset = circumference;
        
        setTimeout(() => {
            scoreRingFill.style.transition = 'stroke-dashoffset 1s ease';
            scoreRingFill.style.strokeDashoffset = offset;
        }, 100);

        // Show level up if applicable (only on first attempt)
        if (!isRetake && xpData && xpData[0]?.leveled_up) {
            showLevelUpAnimation(xpData[0].new_level);
        }
    }

    // ======================
    // LEVEL UP ANIMATION
    // ======================
    function showLevelUpAnimation(newLevel) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;

        overlay.innerHTML = `
            <div style="text-align: center; color: white;">
                <div style="font-size: 5rem; margin-bottom: 20px;">🎉</div>
                <h2 style="font-size: 3rem; margin-bottom: 10px;">Level Up!</h2>
                <p style="font-size: 1.5rem;">You're now level ${newLevel}</p>
            </div>
        `;

        document.body.appendChild(overlay);

        setTimeout(() => {
            overlay.remove();
        }, 3000);
    }

    // ======================
    // EXIT QUIZ
    // ======================
    function exitQuiz() {
        showConfirmModal(
            'Exit Quiz?',
            'Are you sure you want to exit? Your progress will be lost.',
            () => {
                quizInterface.style.display = 'none';
                resultsScreen.style.display = 'none';
                quizzesListSection.style.display = 'block';
            }
        );
    }

    // ======================
    // NOTIFICATION SYSTEM
    // ======================
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icons = {
            success: '✓',
            error: '✗',
            info: 'ℹ',
            warning: '⚠'
        };

        const colors = {
            success: '#10B981',
            error: '#F56565',
            info: '#3B82F6',
            warning: '#F59E0B'
        };

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 500;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
        `;

        notification.innerHTML = `
            <span style="font-size: 1.2rem;">${icons[type]}</span>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    // ======================
    // CONFIRMATION MODAL
    // ======================
    function showConfirmModal(title, message, onConfirm) {
        const modal = document.createElement('div');
        modal.className = 'custom-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            animation: scaleIn 0.2s ease;
        `;

        modalContent.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 20px;">⚠️</div>
            <h2 style="font-size: 1.8rem; color: var(--text-primary); margin-bottom: 15px;">${title}</h2>
            <p style="color: var(--text-secondary); font-size: 1.1rem; margin-bottom: 30px;">${message}</p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button class="btn btn-secondary" id="modalCancel">Cancel</button>
                <button class="btn btn-primary" id="modalConfirm">Confirm</button>
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        document.getElementById('modalCancel').onclick = () => {
            modal.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => modal.remove(), 200);
        };

        document.getElementById('modalConfirm').onclick = () => {
            modal.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => {
                modal.remove();
                onConfirm();
            }, 200);
        };

        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.animation = 'fadeOut 0.2s ease';
                setTimeout(() => modal.remove(), 200);
            }
        };
    }

    // ======================
    // UPDATE HINT TOKEN DISPLAY
    // ======================
    function updateHintTokenDisplay() {
        if (useHintBtn) {
            useHintBtn.textContent = `Use Hint (${currentUser?.hint_tokens || 0} available)`;
            useHintBtn.disabled = !currentUser || currentUser.hint_tokens < 1;
        }
    }

    // ======================
    // UI HELPERS
    // ======================
    function showLoading() {
        loadingState.style.display = 'flex';
        errorState.style.display = 'none';
        quizzesListSection.style.display = 'none';
    }

    function hideLoading() {
        loadingState.style.display = 'none';
    }

    function showError() {
        loadingState.style.display = 'none';
        errorState.style.display = 'flex';
    }

    // ======================
    // EVENT LISTENERS
    // ======================
    function setupEventListeners() {
        // Clear filters
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                subjectFilter.value = '';
                topicFilter.value = '';
                difficultyFilter.value = '';
                questionCountFilter.value = '10';
                topicFilter.innerHTML = '<option value="">All Topics</option>';
                loadAvailableQuizzes();
            });
        }

        // Subject filter - load topics when subject changes
        if (subjectFilter) {
            subjectFilter.addEventListener('change', async () => {
                // Clear and reload topics
                topicFilter.innerHTML = '<option value="">All Topics</option>';
                
                if (subjectFilter.value) {
                    try {
                        const subjectId = Number(subjectFilter.value);
                        const source = allQuizQuestions.length ? allQuizQuestions : [];
                        const topicRows = source.filter((q) => Number(q.subject_id) === subjectId);

                        if (topicRows.length) {
                            // Get unique topics
                            const topics = [...new Set(topicRows.map(q => q.topic))].sort();
                            
                            topics.forEach(topic => {
                                const option = document.createElement('option');
                                option.value = topic;
                                option.textContent = topic;
                                topicFilter.appendChild(option);
                            });
                        }
                    } catch (err) {
                        console.error('Error loading topics:', err);
                    }
                }

                if (topicFilter.value && !Array.from(topicFilter.options).some((opt) => opt.value === topicFilter.value)) {
                    topicFilter.value = '';
                }
                
                loadAvailableQuizzes();
            });
        }

        // Other filter changes
        [topicFilter, difficultyFilter, questionCountFilter].forEach(filter => {
            if (filter) {
                filter.addEventListener('change', loadAvailableQuizzes);
            }
        });

        // Quiz actions
        if (useHintBtn) useHintBtn.addEventListener('click', useHint);
        if (submitAnswerBtn) submitAnswerBtn.addEventListener('click', submitAnswer);
        if (exitQuizBtn) exitQuizBtn.addEventListener('click', exitQuiz);

        // Results actions
        if (retakeQuizBtn) {
            retakeQuizBtn.addEventListener('click', () => {
                resultsScreen.style.display = 'none';
                quizzesListSection.style.display = 'block';
                loadAvailableQuizzes();
            });
        }

        // Quick start buttons
        document.querySelectorAll('.quick-start-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const subject = btn.dataset.subject;
                if (subject) {
                    // Find subject ID
                    const { data } = await window.supabaseClient
                        .from('subjects')
                        .select('id')
                        .eq('slug', subject)
                        .single();
                    
                    if (data) {
                        subjectFilter.value = data.id;
                        // Trigger change event to load topics
                        subjectFilter.dispatchEvent(new Event('change'));
                    }
                }
            });
        });

        // Random quiz
        const randomQuizBtn = document.getElementById('randomQuizBtn');
        if (randomQuizBtn) {
            randomQuizBtn.addEventListener('click', async () => {
                const { data } = await window.supabaseClient
                    .from('quiz_questions')
                    .select('*, subjects(name, slug)')
                    .limit(10);
                
                if (data && data.length > 0) {
                    const randomQuiz = {
                        subject_id: data[0].subject_id,
                        subject_name: data[0].subjects?.name || 'Random',
                        topic: 'Mixed Topics',
                        questions: data,
                        difficulty: 'medium'
                    };
                    startQuiz(randomQuiz);
                }
            });
        }
    }

    // ======================
    // INITIALIZE ON LOAD
    // ======================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
