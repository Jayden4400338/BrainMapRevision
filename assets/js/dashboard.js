
(() => {
  
  
  
  const supabaseClient = window.supabaseClient;

  if (!supabaseClient) {
    console.error('❌ Supabase not initialized!');
    window.location.href = '../auth/login.html';
    return;
  }

  
  
  
  const usernameEl = document.getElementById('username');
  const userLevelEl = document.getElementById('userLevel');
  const userXPEl = document.getElementById('userXP');
  const userCoinsEl = document.getElementById('userCoins');
  const userHintsEl = document.getElementById('userHints');
  const logoutBtn = document.getElementById('logoutBtn');

  let currentUser = null;
  let userProfile = null;

  function normalizeRoles(profile) {
    const roles = Array.isArray(profile?.roles) ? profile.roles : [];
    const normalized = roles
      .map((r) => String(r || '').trim().toLowerCase())
      .filter((r) => ['student', 'teacher', 'admin'].includes(r));

    if (!normalized.length) {
      const fallback = String(profile?.role || 'student').toLowerCase();
      return ['student', 'teacher', 'admin'].includes(fallback) ? [fallback] : ['student'];
    }

    return [...new Set(normalized)];
  }

  function getPrimaryRole(profile) {
    const roles = normalizeRoles(profile);
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('teacher')) return 'teacher';
    return 'student';
  }

  
  
  
  function showLoading(show = true) {
    const container = document.querySelector('.dashboard-container');
    if (!container) return;

    if (show) {
      container.style.opacity = '0.5';
      container.style.pointerEvents = 'none';
    } else {
      container.style.opacity = '1';
      container.style.pointerEvents = 'auto';
    }
  }

  
  
  
  function showError(message) {
    console.error('❌', message);
    
    
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #F56565;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  
  
  
  async function checkAuthentication() {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();

      if (error) throw error;

      if (!session) {
        console.log('No session found, redirecting to login...');
        window.location.href = '../auth/login.html';
        return false;
      }

      currentUser = session.user;
      console.log('✅ User authenticated:', currentUser.email);
      return true;
    } catch (error) {
      console.error('❌ Auth error:', error);
      showError('Authentication failed. Please log in again.');
      
      setTimeout(() => {
        window.location.href = '../auth/login.html';
      }, 2000);
      
      return false;
    }
  }

  
  
  
  async function loadUserProfile(retryCount = 0) {
    if (!currentUser) return;

    try {
      showLoading(true);
      
      
      try {
        const { data: streakData, error: streakError } = await supabaseClient
          .rpc('update_study_streak', {
            user_uuid: currentUser.id
          });

        if (!streakError && streakData && streakData.length > 0) {
          const streak = streakData[0];
          if (streak.bonus_awarded) {
            showStreakBonus(streak.new_streak, streak.bonus_xp, streak.bonus_coins);
          }
        }
      } catch (err) {
        console.warn('Could not update streak:', err);
      }
      
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating new profile...');
          await createUserProfile();
          return;
        }
        
        
        if (error.message?.includes('row-level security') && retryCount < 3) {
          console.log(`RLS policy issue, retrying... (${retryCount + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return loadUserProfile(retryCount + 1);
        }
        
        throw error;
      }

      userProfile = data;
      console.log('✅ Profile loaded:', userProfile);
      updateDashboardUI();
      showLoading(false);
      
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      showError('Failed to load profile data. Please refresh the page.');
      showLoading(false);
    }
  }

  
  
  
  function showStreakBonus(streak, xp, coins) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      background: linear-gradient(135deg, #10B981 0%, #34D399 100%);
      color: white;
      padding: 20px 30px;
      border-radius: 12px;
      box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
      z-index: 9999;
      animation: slideIn 0.5s ease;
      max-width: 300px;
    `;

    notification.innerHTML = `
      <div style="font-size: 2rem; margin-bottom: 10px;">🔥</div>
      <h3 style="font-size: 1.2rem; margin-bottom: 8px;">${streak}-Day Streak!</h3>
      <p style="margin: 0; opacity: 0.9;">
        Bonus: +${xp} XP, +${coins} Coins
      </p>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.5s ease';
      setTimeout(() => notification.remove(), 500);
    }, 4000);
  }

  
  
  
  async function createUserProfile() {
    try {
      console.log('Creating profile for user:', currentUser.id);
      
      const profileData = {
        id: currentUser.id,
        email: currentUser.email,
        username: currentUser.user_metadata?.username || currentUser.email.split('@')[0],
        roles: [
          String(currentUser.user_metadata?.role || 'student').toLowerCase()
        ],
        role: String(currentUser.user_metadata?.role || 'student').toLowerCase(),
        year_group: currentUser.user_metadata?.year_group || null,
        xp: 0,
        level: 1,
        brain_coins: 0,
        hint_tokens: 5
      };

      const { data, error } = await supabaseClient
        .from('users')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        
        if (error.code === '23505') { 
          console.log('Profile already exists, fetching...');
          await loadUserProfile();
          return;
        }
        throw error;
      }

      userProfile = data;
      console.log('✅ Profile created:', userProfile);
      updateDashboardUI();
      showLoading(false);
      
    } catch (error) {
      console.error('❌ Error creating profile:', error);
      showError('Failed to create user profile. Please contact support.');
      showLoading(false);
    }
  }

  
  
  
  function updateDashboardUI() {
    if (!userProfile) {
      console.warn('No user profile to display');
      return;
    }

    const primaryRole = getPrimaryRole(userProfile);
    console.log('Updating dashboard UI for role:', primaryRole);

    
    if (usernameEl) {
      usernameEl.textContent = userProfile.username || 'Student';
    }

    
    if (userLevelEl) userLevelEl.textContent = userProfile.level || 1;
    if (userXPEl) userXPEl.textContent = (userProfile.xp || 0).toLocaleString();
    if (userCoinsEl) userCoinsEl.textContent = (userProfile.brain_coins || 0).toLocaleString();
    if (userHintsEl) userHintsEl.textContent = userProfile.hint_tokens || 5;

    updateLevelProgress();
    animateDashboardStats();
    
    
    if (primaryRole === 'admin') {
      console.log('User is an admin, loading admin dashboard');
      showAdminDashboard();
    } else if (primaryRole === 'teacher') {
      console.log('User is a teacher, loading teacher dashboard');
      showTeacherDashboard();
    } else {
      console.log('User is a student, loading student dashboard');
      showStudentDashboard();
    }
  }
  
  
  
  
  function showTeacherDashboard() {
    const quickActionsGrid = document.querySelector('.quick-actions');
    if (!quickActionsGrid) {
      console.warn('Quick actions grid not found');
      return;
    }
    
    console.log('Loading teacher dashboard for:', userProfile.username);
    
    
    const teacherCard = document.createElement('a');
    teacherCard.href = 'classroom/dashboard.html';
    teacherCard.className = 'action-card teacher-only';
    teacherCard.innerHTML = `
      <div class="action-icon" style="background: linear-gradient(135deg, #10B981 0%, #34D399 100%);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <h3 class="action-title">
        My Classrooms
        <span class="teacher-badge">Teacher</span>
      </h3>
      <p class="action-description">Manage your classes and students</p>
    `;
    
    
    quickActionsGrid.insertBefore(teacherCard, quickActionsGrid.firstChild);
    
    
    const assignmentsCard = document.createElement('a');
    assignmentsCard.href = 'classroom/assignments.html';
    assignmentsCard.className = 'action-card teacher-only';
    assignmentsCard.innerHTML = `
      <div class="action-icon" style="background: linear-gradient(135deg, #10B981 0%, #34D399 100%);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      </div>
      <h3 class="action-title">
        Assignments
        <span class="teacher-badge">Teacher</span>
      </h3>
      <p class="action-description">Create and track student assignments</p>
    `;
    
    
    quickActionsGrid.insertBefore(assignmentsCard, quickActionsGrid.children[1]);

    const createClassroomCard = document.createElement('a');
    createClassroomCard.href = 'classroom/create.html';
    createClassroomCard.className = 'action-card teacher-only';
    createClassroomCard.innerHTML = `
      <div class="action-icon" style="background: linear-gradient(135deg, #10B981 0%, #34D399 100%);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </div>
      <h3 class="action-title">
        Create Classroom
        <span class="teacher-badge">Teacher</span>
      </h3>
      <p class="action-description">Set up a new classroom and invite students.</p>
    `;
    quickActionsGrid.insertBefore(createClassroomCard, quickActionsGrid.children[2]);

    const classAnalyticsCard = document.createElement('a');
    classAnalyticsCard.href = 'classroom/analytics.html';
    classAnalyticsCard.className = 'action-card teacher-only';
    classAnalyticsCard.innerHTML = `
      <div class="action-icon" style="background: linear-gradient(135deg, #10B981 0%, #34D399 100%);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      </div>
      <h3 class="action-title">
        Class Analytics
        <span class="teacher-badge">Teacher</span>
      </h3>
      <p class="action-description">Track class performance and engagement.</p>
    `;
    quickActionsGrid.insertBefore(classAnalyticsCard, quickActionsGrid.children[3]);
    
    
    const welcomeTitle = document.querySelector('.welcome-title');
    if (welcomeTitle) {
      const usernameSpan = welcomeTitle.querySelector('#username');
      if (usernameSpan) {
        usernameSpan.textContent = userProfile.username;
      }
      
      welcomeTitle.innerHTML = welcomeTitle.innerHTML.replace('👋', '👨‍🏫');
    }
    
    
    const welcomeSection = document.querySelector('.welcome-section');
    if (welcomeSection) {
      welcomeSection.style.borderTop = '4px solid #10B981';
    }
    
    
  }

  function showAdminDashboard() {
    const quickActionsGrid = document.querySelector('.quick-actions');
    if (!quickActionsGrid) return;

    const adminCards = [
      { href: 'admin/index.html', title: 'Admin Hub', desc: 'Open the full admin control center.' },
      { href: 'admin/users.html', title: 'User Management', desc: 'Grant admin perms, XP, coins and hint tokens.' },
      { href: 'admin/questions.html', title: 'Question Manager', desc: 'Add your own quiz questions quickly.' },
      { href: 'admin/activity.html', title: 'Live Activity', desc: 'See active, idle, and offline users.' },
      { href: 'admin/analytics.html', title: 'Time Analytics', desc: 'Review total time spent on the platform.' },
      { href: 'admin/settings.html', title: 'Admin Settings', desc: 'Change platform settings and defaults.' }
    ];

    adminCards.reverse().forEach((item) => {
      const card = document.createElement('a');
      card.href = item.href;
      card.className = 'action-card admin-only';
      card.innerHTML = `
        <div class="action-icon" style="background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9"/>
          </svg>
        </div>
        <h3 class="action-title">${item.title} <span class="teacher-badge">Admin</span></h3>
        <p class="action-description">${item.desc}</p>
      `;
      quickActionsGrid.insertBefore(card, quickActionsGrid.firstChild);
    });

    const welcomeTitle = document.querySelector('.welcome-title');
    if (welcomeTitle) {
      welcomeTitle.innerHTML = welcomeTitle.innerHTML.replace('??', '???');
    }
  }
  function showStudentDashboard() {
    
    const teacherElements = document.querySelectorAll('.teacher-only');
    teacherElements.forEach(el => el.remove());
    
   
  }

  
  
  
  function updateLevelProgress() {
    if (!userProfile) return;
    
    const level = userProfile.level || 1;
    const xp = userProfile.xp || 0;

    
    const currentLevelXP = (level - 1) ** 2 * 100;
    const nextLevelXP = level ** 2 * 100;

    const xpInLevel = xp - currentLevelXP;
    const xpNeeded = nextLevelXP - currentLevelXP;
    const progress = Math.max(0, Math.min(100, (xpInLevel / xpNeeded) * 100));

    const bar = document.querySelector('.progress-bar-fill');
    if (bar) {
      bar.style.width = `${progress}%`;
    }

    const label = document.querySelector('.progress-label');
    if (label) {
      label.innerHTML = `
        <span>Level ${level}</span>
        <span>${xpInLevel} / ${xpNeeded} XP</span>
      `;
    }
  }

  
  
  
  function animateDashboardStats() {
    const statCards = document.querySelectorAll('.stat-card');
    
    statCards.forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';

      setTimeout(() => {
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, i * 100);
    });
  }

  
  
  
  async function handleLogout() {
    try {
      showLoading(true);
      
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;

      localStorage.removeItem('rememberMe');
      
      
  
      
      setTimeout(() => {
        window.location.href = '../index.html';
      }, 500);
      
    } catch (error) {
 
      showError('Failed to log out. Please try again.');
      showLoading(false);
    }
  }

  
  
  
  async function init() {

    
    const isAuth = await checkAuthentication();
    if (!isAuth) return;

    await loadUserProfile();
  }

  
  
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    
    init();
  }

  
  supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
    
    if (event === 'SIGNED_OUT') {
      window.location.href = '../auth/login.html';
    } else if (event === 'SIGNED_IN' && !userProfile) {
      
      loadUserProfile();
    }
  });

  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
})();
