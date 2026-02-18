(function () {
  function markActiveTopic() {
    var file = window.location.pathname.split('/').pop();
    document.querySelectorAll('.topic-nav a').forEach(function (link) {
      var href = link.getAttribute('href') || '';
      if (href.endsWith(file)) {
        link.classList.add('active');
      }
    });
  }

  function wireAnswers() {
    document.querySelectorAll('.practice-answer-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var answer = btn.nextElementSibling;
        if (!answer) return;
        var open = answer.classList.toggle('open');
        btn.textContent = open ? 'Hide answer' : 'Show answer';
      });
    });
  }

  function wireAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (event) {
        var target = document.querySelector(anchor.getAttribute('href'));
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    markActiveTopic();
    wireAnswers();
    wireAnchors();
  });
})();
