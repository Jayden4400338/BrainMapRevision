(function () {
  const supabase = window.supabaseClient;
  const accessError = document.getElementById("adminAccessError");
  const hubGrid = document.getElementById("adminHubGrid");
  const hubStats = document.getElementById("hubStats");

  function setStat(id, value) {
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
      if (hubGrid) hubGrid.style.display = "none";
      if (hubStats) hubStats.style.display = "none";
      return false;
    }

    return true;
  }

  async function loadHubStats() {
    const { data, error } = await supabase.rpc("admin_get_usage_analytics");
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return;

    setStat("hubTotalUsers", row.total_users ?? 0);
    setStat("hubActive24h", row.active_24h ?? 0);
    setStat("hubTotalQuizzes", row.total_quizzes ?? 0);

    const avgScore = Number(row.avg_quiz_score ?? 0);
    setStat("hubAvgScore", `${avgScore.toFixed(1)}%`);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      if (!(await ensureAdminAccess())) return;
      await loadHubStats();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to load admin hub.");
    }
  });
})();
