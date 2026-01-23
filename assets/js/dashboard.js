// Dashboard JavaScript - COMPLETE FINAL VERSION
// Use existing Supabase client (created in HTML)

const supabase = window.supabaseClient;

if (!supabase) {
    console.error('Supabase not initialized!');
    window.location.href = '../auth/login.html';
}

// DOM Elements
const usernameEl = document.getElementById('username');
const userLevelEl = document.getElementById('userLevel');
const userXPEl = document.getElementById('userXP');
const userCoinsEl = document.getElementById('userCoins');
const userHintsEl = document.getElementById('userHints');
const logoutBtn = document.getElementById('logoutBtn');
const themeToggle = document.getElementById('themeToggle');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navMenu = document.getElementById('navMenu');

let currentUser = null;
let userProfile = null;

// ======================
// THEME TOGGLE
// ======================
// Check for saved theme preference or default to light mode
const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
    document.body.classList.add('dark-mode');
}

// Toggle theme on button click
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        
        // Save preference to localStorage
        const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        
        // Add animation effect
        themeToggle.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            themeToggle.style.transform = '';
        }, 300);
    });
}

// ======================
// MOBILE MENU TOGGLE
// ======================
if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        
        // Animate hamburger menu
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

// ======================
// CHECK AUTHENTICATION
// ======================
async function checkAuthentication() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (!session) {
            window.location.href = '../auth/login.html';
            return false;
        }

        currentUser = session.user;
        return true;
    } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '../auth/login.html';
        return false;
    }
}

// ======================
// LOAD USER PROFILE
// ======================
async function loadUserProfile() {
    if (!currentUser) return;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                await createUserProfile();
                return;
            }
            throw error;
        }

        userProfile = data;
        updateDashboardUI();
        
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// ======================
// CREATE USER PROFILE
// ======================
async function createUserProfile() {
    try {
        const { data, error } = await supabase
            .from('users')
            .insert({
                id: currentUser.id,
                email: currentUser.email,
                username: currentUser.user_metadata?.username || currentUser.email.split('@')[0],
                role: currentUser.user_metadata?.role || 'student',
                year_group: currentUser.user_metadata?.year_group || null,
                xp: 0,
                level: 1,
                brain_coins: 0,
                hint_tokens: 5
            })
            .select()
            .single();

        if (error) throw error;

        userProfile = data;
        updateDashboardUI();
        
    } catch (error) {
        console.error('Error creating profile:', error);
    }
}

// ======================
// UPDATE DASHBOARD UI
// ======================
function updateDashboardUI() {
    if (!userProfile) return;

    // Update username
    if (usernameEl) {
        usernameEl.textContent = userProfile.username || 'Student';
    }

    // Update stats
    if (userLevelEl) userLevelEl.textContent = userProfile.level || 1;
    if (userXPEl) userXPEl.textContent = (userProfile.xp || 0).toLocaleString();
    if (userCoinsEl) userCoinsEl.textContent = (userProfile.brain_coins || 0).toLocaleString();
    if (userHintsEl) userHintsEl.textContent = userProfile.hint_tokens || 5;

    updateLevelProgress();
    animateStats();
}

// ======================
// UPDATE LEVEL PROGRESS
// ======================
function updateLevelProgress() {
    if (!userProfile) return;
    
    const currentLevel = userProfile.level || 1;
    const currentXP = userProfile.xp || 0;
    
    const currentLevelXP = ((currentLevel - 1) * (currentLevel - 1)) * 100;
    const nextLevelXP = (currentLevel * currentLevel) * 100;
    
    const xpInCurrentLevel = currentXP - currentLevelXP;
    const xpNeededForLevel = nextLevelXP - currentLevelXP;
    const progressPercentage = Math.max(0, Math.min(100, (xpInCurrentLevel / xpNeededForLevel) * 100));

    const progressBar = document.querySelector('.progress-bar-fill');
    if (progressBar) {
        progressBar.style.width = progressPercentage + '%';
    }

    const progressLabel = document.querySelector('.progress-label');
    if (progressLabel) {
        progressLabel.innerHTML = `
            <span>Level ${currentLevel}</span>
            <span>${xpInCurrentLevel} / ${xpNeededForLevel} XP</span>
        `;
    }
}

// ======================
// ANIMATE STATS
// ======================
function animateStats() {
    const statValues = document.querySelectorAll('.stat-value');
    
    statValues.forEach((stat, index) => {
        stat.style.opacity = '0';
        stat.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            stat.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            stat.style.opacity = '1';
            stat.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// ======================
// LOGOUT
// ======================
async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        localStorage.removeItem('rememberMe');
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to log out');
    }
}

// ======================
// INITIALIZE DASHBOARD
// ======================
async function initializeDashboard() {
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) return;

    await loadUserProfile();
}

// ======================
// EVENT LISTENERS
// ======================
if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
}

// ======================
// RUN ON PAGE LOAD
// ======================
document.addEventListener('DOMContentLoaded', initializeDashboard);

// ======================
// AUTH STATE LISTENER
// ======================
if (supabase?.auth) {
    supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
            window.location.href = '../auth/login.html';
        }
    });
}