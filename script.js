
const themeToggle = document.getElementById('themeToggle');
const body = document.body;


const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
    body.classList.add('dark-mode');
}


if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        

        const theme = body.classList.contains('dark-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        

        themeToggle.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            themeToggle.style.transform = '';
        }, 300);
    });
}


const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navMenu = document.getElementById('navMenu');

if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        

        const spans = mobileMenuBtn.querySelectorAll('span');
        if (navMenu.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translateY(10px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translateY(-10px)';
        } else {
            spans[0].style.transform = '';
            spans[1].style.opacity = '1';
            spans[2].style.transform = '';
        }
    });
}


const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 768 && navMenu) {
            navMenu.classList.remove('active');
            const spans = mobileMenuBtn?.querySelectorAll('span');
            if (spans) {
                spans[0].style.transform = '';
                spans[1].style.opacity = '1';
                spans[2].style.transform = '';
            }
        }
    });
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all feature cards and subject cards
const cards = document.querySelectorAll('.feature-card, .subject-card, .stat-item');
cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
});

// Add active state to navigation on scroll
const sections = document.querySelectorAll('section[id]');

window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.pageYOffset >= sectionTop - 100) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// Add hover effect to buttons
const buttons = document.querySelectorAll('.btn');
buttons.forEach(button => {
    button.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
    });
    
    button.addEventListener('mouseleave', function() {
        this.style.transform = '';
    });
});

// Animate stats counter on scroll (only if stats section exists)
const statNumbers = document.querySelectorAll('.stat-number');
let hasAnimated = false;

const animateStats = () => {
    if (hasAnimated) return;
    
    const statsSection = document.querySelector('.stats');
    if (!statsSection) return; // Exit if stats section doesn't exist on this page
    
    const rect = statsSection.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight && rect.bottom >= 0;
    
    if (isVisible) {
        hasAnimated = true;
        statNumbers.forEach(stat => {
            const text = stat.textContent;
            if (text === '∞') return; // Skip infinity symbol
            
            const target = parseInt(text.replace('+', '').replace('%', ''));
            const suffix = text.includes('+') ? '+' : (text.includes('%') ? '%' : '');
            let current = 0;
            const increment = target / 50;
            
            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    stat.textContent = Math.ceil(current) + suffix;
                    requestAnimationFrame(updateCounter);
                } else {
                    stat.textContent = target + suffix;
                }
            };
            
            updateCounter();
        });
    }
};

// Only add scroll listener if stats section exists
if (document.querySelector('.stats')) {
    window.addEventListener('scroll', animateStats);
    window.addEventListener('load', animateStats);
}

// Add parallax effect to hero section (only if hero exists)
const hero = document.querySelector('.hero');
if (hero) {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        hero.style.transform = `translateY(${scrolled * 0.5}px)`;
        hero.style.opacity = 1 - (scrolled / 500);
    });
}

// Load and display navbar profile picture
async function loadNavbarProfile() {
  const navProfile = document.getElementById('navProfile');
  if (!navProfile) return;

  try {
    // Get Supabase client
    const supabase = window.supabaseClient;
    if (!supabase) return;

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      navProfile.style.display = 'none';
      return;
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('username, profile_picture_url')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // Show placeholder with initials
      const initials = (user.email || 'U').substring(0, 2).toUpperCase();
      const path = window.location.pathname;
      let profilePath;
      if (path.includes('/classroom/')) {
        profilePath = '../profile.html';
      } else if (path.includes('/pages/')) {
        profilePath = 'profile.html';
      } else {
        profilePath = 'pages/profile.html';
      }
      navProfile.innerHTML = `<div class="nav-profile-placeholder" onclick="window.location.href='${profilePath}'">${initials}</div>`;
      return;
    }

    // Display profile picture or placeholder
    // Determine correct path based on current page location
    const path = window.location.pathname;
    let profilePath;
    if (path.includes('/classroom/')) {
      profilePath = '../profile.html';
    } else if (path.includes('/pages/')) {
      profilePath = 'profile.html';
    } else {
      profilePath = 'pages/profile.html';
    }
    
    if (profile.profile_picture_url) {
      navProfile.innerHTML = `<img src="${profile.profile_picture_url}" alt="Profile" class="nav-profile-picture" onclick="window.location.href='${profilePath}'">`;
    } else {
      const initials = (profile.username || user.email || 'U').substring(0, 2).toUpperCase();
      navProfile.innerHTML = `<div class="nav-profile-placeholder" onclick="window.location.href='${profilePath}'">${initials}</div>`;
    }
  } catch (error) {
    console.error('Error loading navbar profile:', error);
    navProfile.style.display = 'none';
  }
}

// Update homepage primary CTA based on auth state
async function updateHeroPrimaryCta() {
  const ctaLink = document.getElementById('heroPrimaryCtaLink');
  const ctaText = document.getElementById('heroPrimaryCtaText');

  if (!ctaLink || !ctaText || !window.supabaseClient) return;

  try {
    const { data: { user }, error } = await window.supabaseClient.auth.getUser();
    if (error) return;

    if (user) {
      ctaLink.href = 'pages/dashboard.html';
      ctaText.textContent = 'Dashboard';
    } else {
      ctaLink.href = 'auth/signup.html';
      ctaText.textContent = 'Get Started Free';
    }
  } catch (err) {
    console.warn('Could not update hero CTA from auth state:', err);
  }
}

// Load navbar profile on page load (if Supabase is available)
if (window.supabaseClient) {
  document.addEventListener('DOMContentLoaded', loadNavbarProfile);
  document.addEventListener('DOMContentLoaded', updateHeroPrimaryCta);
}

// Console message for developers
console.log('%cBrainMapRevision', 'color: #FF8C42; font-size: 24px; font-weight: bold;');
console.log('%cOpen Source & Free Forever 🚀', 'color: #FFB366; font-size: 14px;');
console.log('Interested in contributing? Check out our GitHub!');

// Handle window resize
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        // Close mobile menu on resize to desktop
        if (window.innerWidth > 768 && navMenu) {
            navMenu.classList.remove('active');
            const spans = mobileMenuBtn?.querySelectorAll('span');
            if (spans) {
                spans[0].style.transform = '';
                spans[1].style.opacity = '1';
                spans[2].style.transform = '';
            }
        }
    }, 250);
});
