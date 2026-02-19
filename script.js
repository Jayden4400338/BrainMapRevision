
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

const THEME_STORAGE_KEY = 'equippedThemeName';
const CUSTOM_THEME_STORAGE_KEY = 'customThemePalette';
const THEME_PRESETS = {
    'ocean-wave': { primary: '#0EA5E9', secondary: '#06B6D4' },
    'forest-sanctuary': { primary: '#10B981', secondary: '#34D399' },
    'sunset-blaze': { primary: '#F59E0B', secondary: '#EC4899' },
    'neon-nights': { primary: '#8B5CF6', secondary: '#EC4899' },
    'retro-arcade': { primary: '#EF4444', secondary: '#F59E0B' },
    'galaxy': { primary: '#6366F1', secondary: '#8B5CF6' },
};

function normalizeThemeName(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/\s+theme$/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function hexToRgba(hex, alpha = 0.16) {
    const clean = String(hex || '').replace('#', '');
    if (clean.length !== 6) return `rgba(59, 130, 246, ${alpha})`;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function setThemeVariable(name, value) {
    const root = document.documentElement;
    root.style.setProperty(name, value);
    body.style.setProperty(name, value);
}

function removeThemeVariable(name) {
    const root = document.documentElement;
    root.style.removeProperty(name);
    body.style.removeProperty(name);
}

function applyThemeColors(primary, secondary, themeName, persist = true) {
    if (!primary || !secondary) return false;
    setThemeVariable('--accent-primary', primary);
    setThemeVariable('--accent-secondary', secondary);
    setThemeVariable('--accent-gradient', `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`);
    setThemeVariable('--shadow', hexToRgba(primary, body.classList.contains('dark-mode') ? 0.22 : 0.16));
    if (persist && themeName) {
        localStorage.setItem(THEME_STORAGE_KEY, themeName);
    }
    return true;
}

function normalizeHex(value, fallback) {
    if (!value) return fallback;
    const color = String(value).trim();
    if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
    return fallback;
}

function defaultCustomThemePalette() {
    return {
        light: {
            accentPrimary: '#3B82F6',
            accentSecondary: '#60A5FA',
            textPrimary: '#0F172A',
            textSecondary: '#64748B',
            bgSecondary: '#FFFFFF',
            borderColor: '#E2E8F0',
            cardBg: '#FFFFFF',
            navBg: '#FFFFFF',
            bgPrimaryStart: '#F0F9FF',
            bgPrimaryEnd: '#E0F2FE',
        },
        dark: {
            accentPrimary: '#60A5FA',
            accentSecondary: '#93C5FD',
            textPrimary: '#F8FAFC',
            textSecondary: '#94A3B8',
            bgSecondary: '#1E293B',
            borderColor: '#334155',
            cardBg: '#1E293B',
            navBg: '#1E293B',
            bgPrimaryStart: '#0F172A',
            bgPrimaryEnd: '#1E293B',
        },
    };
}

function normalizeCustomThemePalette(raw) {
    const defaults = defaultCustomThemePalette();
    if (!raw || typeof raw !== 'object') return defaults;

    const hasDualMode = raw.light && raw.dark;
    const normalized = defaultCustomThemePalette();

    if (!hasDualMode) {
        Object.keys(defaults.light).forEach((key) => {
            normalized.light[key] = normalizeHex(raw[key], defaults.light[key]);
        });
        return normalized;
    }

    ['light', 'dark'].forEach((mode) => {
        Object.keys(defaults[mode]).forEach((key) => {
            normalized[mode][key] = normalizeHex(raw[mode]?.[key], defaults[mode][key]);
        });
    });

    return normalized;
}

function getStoredCustomThemePalette() {
    try {
        const raw = localStorage.getItem(CUSTOM_THEME_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return normalizeCustomThemePalette(parsed);
    } catch {
        return null;
    }
}

function applyCustomThemePalette(palette, persist = true) {
    if (!palette || typeof palette !== 'object') return false;
    const normalized = normalizeCustomThemePalette(palette);
    const mode = body.classList.contains('dark-mode') ? 'dark' : 'light';
    const activePalette = normalized[mode];

    const accentPrimary = activePalette.accentPrimary;
    const accentSecondary = activePalette.accentSecondary;
    const textPrimary = activePalette.textPrimary;
    const textSecondary = activePalette.textSecondary;
    const bgSecondary = activePalette.bgSecondary;
    const borderColor = activePalette.borderColor;
    const cardBg = activePalette.cardBg;
    const navBg = activePalette.navBg;
    const bgPrimaryStart = activePalette.bgPrimaryStart;
    const bgPrimaryEnd = activePalette.bgPrimaryEnd;

    setThemeVariable('--accent-primary', accentPrimary);
    setThemeVariable('--accent-secondary', accentSecondary);
    setThemeVariable('--accent-gradient', `linear-gradient(135deg, ${accentPrimary} 0%, ${accentSecondary} 100%)`);
    setThemeVariable('--text-primary', textPrimary);
    setThemeVariable('--text-secondary', textSecondary);
    setThemeVariable('--bg-secondary', bgSecondary);
    setThemeVariable('--border-color', borderColor);
    setThemeVariable('--card-bg', cardBg);
    setThemeVariable('--nav-bg', navBg);
    setThemeVariable('--bg-primary', `linear-gradient(135deg, ${bgPrimaryStart} 0%, ${bgPrimaryEnd} 100%)`);
    setThemeVariable('--shadow', hexToRgba(accentPrimary, body.classList.contains('dark-mode') ? 0.22 : 0.16));

    if (persist) {
        localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(normalized));
        localStorage.setItem(THEME_STORAGE_KEY, 'Custom Theme Creator');
    }

    return true;
}

function clearCustomThemePalette() {
    removeThemeVariable('--text-primary');
    removeThemeVariable('--text-secondary');
    removeThemeVariable('--bg-secondary');
    removeThemeVariable('--border-color');
    removeThemeVariable('--card-bg');
    removeThemeVariable('--nav-bg');
    removeThemeVariable('--bg-primary');
    removeThemeVariable('--accent-primary');
    removeThemeVariable('--accent-secondary');
    removeThemeVariable('--accent-gradient');
    removeThemeVariable('--shadow');
    localStorage.removeItem(CUSTOM_THEME_STORAGE_KEY);
}

function clearThemeColors() {
    removeThemeVariable('--accent-primary');
    removeThemeVariable('--accent-secondary');
    removeThemeVariable('--accent-gradient');
    removeThemeVariable('--shadow');
}

function applyNamedTheme(themeName, persist = true) {
    const normalized = normalizeThemeName(themeName);
    if (normalized === 'custom-theme-creator') {
        const customPalette = getStoredCustomThemePalette();
        if (customPalette) {
            return applyCustomThemePalette(customPalette, persist);
        }
        return false;
    }
    const palette = THEME_PRESETS[normalized];
    if (!palette) return false;
    return applyThemeColors(palette.primary, palette.secondary, themeName, persist);
}

function resolveAvatarBorderColor(rawColor) {
    const value = String(rawColor || '').trim().toLowerCase();
    if (!value) return '';
    if (/^#[0-9a-f]{6}$/i.test(value)) return value;
    const named = {
        gold: '#F59E0B',
        rainbow: '#EC4899',
        blue: '#3B82F6',
        green: '#10B981',
        purple: '#8B5CF6',
        red: '#EF4444',
        silver: '#94A3B8',
    };
    return named[value] || '';
}

function getAvatarAppearanceFromInventoryRows(rows) {
    const appearance = { borderColor: '', filter: '' };
    for (const row of (Array.isArray(rows) ? rows : [])) {
        const shopItem = row?.shop_items;
        if (!shopItem || shopItem.category !== 'cosmetic') continue;
        const props = shopItem.properties || {};
        const type = String(props.type || '').toLowerCase();

        if (type === 'border') {
            appearance.borderColor = resolveAvatarBorderColor(props.color || props.frame_color || '');
            if (typeof props.filter === 'string' && props.filter.trim()) {
                appearance.filter = props.filter.trim();
            }
        }

        if (type === 'avatar') {
            if (typeof props.filter === 'string' && props.filter.trim()) {
                appearance.filter = props.filter.trim();
            }
        }
    }
    return appearance;
}

async function fetchAvatarAppearanceForUser(userId) {
    if (!window.supabaseClient || !userId) return { borderColor: '', filter: '' };
    try {
        const { data, error } = await window.supabaseClient
            .from('user_inventory')
            .select('is_equipped, shop_items(category, properties)')
            .eq('user_id', userId)
            .eq('is_equipped', true);
        if (error) return { borderColor: '', filter: '' };
        return getAvatarAppearanceFromInventoryRows(data);
    } catch {
        return { borderColor: '', filter: '' };
    }
}

function applyAvatarAppearance(element, appearance) {
    if (!element) return;
    if (appearance?.borderColor) {
        element.style.borderColor = appearance.borderColor;
    } else {
        element.style.removeProperty('border-color');
    }
    if (appearance?.filter) {
        element.style.filter = appearance.filter;
    } else {
        element.style.removeProperty('filter');
    }
}

async function syncEquippedThemeFromDb() {
    if (!window.supabaseClient) return;
    try {
        const { data: { user }, error: userError } = await window.supabaseClient.auth.getUser();
        if (userError || !user) return;

        const { data, error } = await window.supabaseClient
            .from('user_inventory')
            .select('is_equipped, shop_items(name, category, properties)')
            .eq('user_id', user.id)
            .eq('is_equipped', true);

        if (error || !Array.isArray(data)) return;

        const equippedTheme = data.find((row) => {
            return row.shop_items && row.shop_items.category === 'theme';
        });

        if (!equippedTheme || !equippedTheme.shop_items) return;

        const item = equippedTheme.shop_items;
        const byNameApplied = applyNamedTheme(item.name, true);
        if (!byNameApplied && item.properties?.colors) {
            applyThemeColors(item.properties.colors.primary, item.properties.colors.secondary, item.name, true);
        } else if (!byNameApplied && normalizeThemeName(item.name) === 'custom-theme-creator') {
            const customPalette = getStoredCustomThemePalette();
            if (customPalette) applyCustomThemePalette(customPalette, true);
        }
    } catch (error) {
        console.warn('Theme sync failed:', error);
    }
}

window.applyNamedTheme = applyNamedTheme;
window.applyThemeColors = applyThemeColors;
window.clearThemeColors = clearThemeColors;
window.applyCustomThemePalette = applyCustomThemePalette;
window.getStoredCustomThemePalette = getStoredCustomThemePalette;
window.clearCustomThemePalette = clearCustomThemePalette;


const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
    body.classList.add('dark-mode');
}

// Apply equipped theme after dark/light mode is set so custom palettes pick the correct mode.
const persistedThemeName = localStorage.getItem(THEME_STORAGE_KEY);
if (persistedThemeName) {
    applyNamedTheme(persistedThemeName, false);
}


if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        

        const theme = body.classList.contains('dark-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        const equippedThemeName = localStorage.getItem(THEME_STORAGE_KEY);
        if (equippedThemeName) {
            applyNamedTheme(equippedThemeName, false);
        }
        

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

    const avatarAppearance = await fetchAvatarAppearanceForUser(user.id);
    const navAvatarElement = navProfile.querySelector('.nav-profile-picture, .nav-profile-placeholder');
    applyAvatarAppearance(navAvatarElement, avatarAppearance);
  } catch (error) {
    console.error('Error loading navbar profile:', error);
    navProfile.style.display = 'none';
  }
}
window.loadNavbarProfile = loadNavbarProfile;
window.fetchAvatarAppearanceForUser = fetchAvatarAppearanceForUser;
window.applyAvatarAppearance = applyAvatarAppearance;

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
  document.addEventListener('DOMContentLoaded', syncEquippedThemeFromDb);
}

function ensureNotificationModalStyles() {
    if (document.getElementById('userNotificationModalStyles')) return;
    const style = document.createElement('style');
    style.id = 'userNotificationModalStyles';
    style.textContent = `
      .notify-modal-backdrop { position: fixed; inset: 0; background: rgba(2,6,23,.56); z-index: 3000; display: grid; place-items: center; padding: 16px; }
      .notify-modal { width: min(560px, 96vw); background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 14px; padding: 16px; box-shadow: 0 20px 44px rgba(2,6,23,.35); }
      .notify-modal h3 { margin: 0 0 8px; font-size: 1.08rem; color: var(--text-primary); }
      .notify-modal p { margin: 0 0 10px; color: var(--text-secondary); }
      .notify-modal-meta { font-size: .78rem; color: var(--text-secondary); margin-bottom: 12px; }
      .notify-modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
      .notify-modal-actions button { border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-secondary); color: var(--text-primary); padding: 8px 10px; cursor: pointer; }
      .notify-modal-actions .primary { border-color: var(--accent-primary); color: var(--accent-primary); }
    `;
    document.head.appendChild(style);
}

function escapeModalText(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

async function showUnreadNotificationsModal() {
    if (!window.supabaseClient) return;
    if (window.__notifyModalBusy) return;
    window.__notifyModalBusy = true;
    try {
        const { data: { user }, error: userError } = await window.supabaseClient.auth.getUser();
        if (userError || !user) return;

        const { data, error } = await window.supabaseClient.rpc('get_my_unread_notifications', { limit_count: 3 });
        if (error || !Array.isArray(data) || !data.length) return;

        ensureNotificationModalStyles();
        const queue = [...data];

        const showNext = async () => {
            const row = queue.shift();
            if (!row) return;

            const backdrop = document.createElement('div');
            backdrop.className = 'notify-modal-backdrop';
            backdrop.innerHTML = `
              <div class="notify-modal" role="dialog" aria-modal="true">
                <h3>${escapeModalText(row.title || 'Notification')}</h3>
                <p>${escapeModalText(row.message || '')}</p>
                <div class="notify-modal-meta">${new Date(row.created_at).toLocaleString()}</div>
                <div class="notify-modal-actions">
                  <button data-action="dismiss">Dismiss</button>
                  <button class="primary" data-action="read-next">Mark Read</button>
                </div>
              </div>
            `;

            const close = async (markRead) => {
                if (markRead) {
                    await window.supabaseClient.rpc('mark_my_notification_read', { notification_id: row.id });
                }
                backdrop.remove();
                if (queue.length) await showNext();
            };

            backdrop.addEventListener('click', async (event) => {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;
                if (target === backdrop || target.dataset.action === 'dismiss') {
                    await close(false);
                }
                if (target.dataset.action === 'read-next') {
                    await close(true);
                }
            });

            document.body.appendChild(backdrop);
        };

        await showNext();
    } catch (error) {
        console.warn('Could not show notifications:', error);
    } finally {
        window.__notifyModalBusy = false;
    }
}

if (window.supabaseClient) {
    document.addEventListener('DOMContentLoaded', showUnreadNotificationsModal);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) showUnreadNotificationsModal();
    });
    window.addEventListener('focus', () => showUnreadNotificationsModal());
    setInterval(() => {
        if (!document.hidden) showUnreadNotificationsModal();
    }, 30000);
}

// Password visibility toggle (auth pages)
function initPasswordToggles() {
    const toggleButtons = document.querySelectorAll('.password-toggle-btn');
    if (!toggleButtons.length) return;

    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            if (!targetId) return;

            const input = document.getElementById(targetId);
            if (!input) return;

            const showPassword = input.type === 'password';
            input.type = showPassword ? 'text' : 'password';
            btn.classList.toggle('is-visible', showPassword);
            btn.setAttribute('aria-label', showPassword ? 'Hide password' : 'Show password');
        });
    });
}

document.addEventListener('DOMContentLoaded', initPasswordToggles);

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
