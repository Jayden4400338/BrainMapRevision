(function () {
  const supabase = window.supabaseClient;
  const accessError = document.getElementById("adminAccessError");
  const stats = document.getElementById("analyticsStats");
  const refreshBtn = document.getElementById("refreshAnalyticsBtn");

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
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
      if (stats) stats.style.display = "none";
      return false;
    }

    return true;
  }

  async function loadAnalytics() {
    const { data, error } = await supabase.rpc("admin_get_usage_analytics");
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return;

    setText("aTotalUsers", row.total_users ?? 0);
    setText("aActive24h", row.active_24h ?? 0);
    setText("aTotalQuizzes", row.total_quizzes ?? 0);

    const avgScore = Number(row.avg_quiz_score ?? 0);
    setText("aAvgQuizScore", `${avgScore.toFixed(1)}%`);
    setText("aTotalStudyMinutes", row.total_study_minutes ?? 0);
  }

  refreshBtn?.addEventListener("click", () => {
    loadAnalytics().catch((err) => {
      console.error(err);
      alert(err.message || "Failed to refresh analytics.");
    });
  });

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      if (!(await ensureAdminAccess())) return;
      await loadAnalytics();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to load analytics.");
    }
  });
})();
