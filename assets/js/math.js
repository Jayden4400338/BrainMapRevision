/**
 * math.js — Mathematics Subject Page Logic
 * Handles topic filtering, concept panels, and quiz stats.
 */

(function () {

  // ── Tab Filtering ──────────────────────────────────────────────────────
  const tabs = document.querySelectorAll('.math-tab');
  const topicCards = document.querySelectorAll('.math-topic-card');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.dataset.filter;

      topicCards.forEach(card => {
        const category = card.dataset.category;
        if (filter === 'all' || category === filter) {
          card.classList.remove('hidden');
          // Staggered reveal animation
          card.style.animationDelay = '';
          card.style.opacity = '0';
          card.style.transform = 'translateY(16px)';
          requestAnimationFrame(() => {
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          });
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });

  // ── Concept Panel Toggle ───────────────────────────────────────────────
  window.toggleConcept = function (btn) {
    const card = btn.closest('.topic-card-inner');
    const panel = card.querySelector('.topic-concept-panel');

    if (!panel) return;

    const isOpen = panel.style.display === 'block';

    if (isOpen) {
      panel.style.display = 'none';
      btn.classList.remove('active');
      btn.innerHTML = '<i class="fa-solid fa-book-open"></i> Key Concepts';
    } else {
      panel.style.display = 'block';
      btn.classList.add('active');
      btn.innerHTML = '<i class="fa-solid fa-chevron-up"></i> Hide Concepts';
    }
  };

  // ── Load Quiz Count from Supabase ──────────────────────────────────────
  async function loadMathQuizStats() {
    if (!window.supabaseClient) return;

    try {
      // Get the mathematics subject
      const { data: subject } = await window.supabaseClient
        .from('subjects')
        .select('id')
        .eq('slug', 'mathematics')
        .single();

      if (!subject) return;

      // Count quiz questions
      const { count } = await window.supabaseClient
        .from('quiz_questions')
        .select('id', { count: 'exact', head: true })
        .eq('subject_id', subject.id);

      if (count !== null) {
        const statEl = document.getElementById('statQuizQuestions');
        if (statEl) statEl.textContent = count + '+';

        const heroQuizzes = document.getElementById('totalQuizzes');
        if (heroQuizzes) {
          // Group by topic for quiz count
          const { data: topics } = await window.supabaseClient
            .from('quiz_questions')
            .select('topic')
            .eq('subject_id', subject.id);

          if (topics) {
            const uniqueTopics = new Set(topics.map(t => t.topic));
            heroQuizzes.textContent = uniqueTopics.size;
          }
        }
      }
    } catch (err) {
      console.warn('Could not load math quiz stats:', err);
    }
  }

  // ── Animate cards on load ──────────────────────────────────────────────
  function animateCardsOnLoad() {
    topicCards.forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';

      setTimeout(() => {
        card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 80 * i);
    });
  }

  // ── URL param: auto-expand a topic from query string ──────────────────
  function handleUrlTopic() {
    const params = new URLSearchParams(window.location.search);
    const topic = params.get('topic');
    if (!topic) return;

    const targetCard = [...topicCards].find(c => c.dataset.topic === topic);
    if (!targetCard) return;

    // Scroll to it
    setTimeout(() => {
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Open its concept panel
      const btn = targetCard.querySelector('.topic-expand-btn');
      if (btn) toggleConcept(btn);
    }, 500);
  }

  // ── Smooth scroll for hero action buttons ─────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // ── Init ───────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    animateCardsOnLoad();
    loadMathQuizStats();
    handleUrlTopic();
  });

})();