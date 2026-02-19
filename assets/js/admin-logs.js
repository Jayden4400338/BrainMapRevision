(function () {
  const supabase = window.supabaseClient;
  const accessError = document.getElementById("adminAccessError");
  const logsTableWrap = document.getElementById("logsTableWrap");
  const logsTableBody = document.getElementById("adminLogsTableBody");
  const refreshBtn = document.getElementById("refreshLogsBtn");
  const limitSelect = document.getElementById("logsLimitSelect");

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
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
      if (logsTableWrap) logsTableWrap.style.display = "none";
      return false;
    }

    return true;
  }

  function rowHtml(row) {
    const created = row.created_at ? new Date(row.created_at).toLocaleString() : "-";
    const details = row.details ? escapeHtml(JSON.stringify(row.details)) : "{}";

    return `
      <tr>
        <td>${created}</td>
        <td><span class="admin-role-badge">${escapeHtml(row.action_type || "unknown")}</span></td>
        <td>${escapeHtml(row.admin_email || "-")}</td>
        <td>${escapeHtml(row.target_email || "-")}</td>
        <td><code>${details}</code></td>
      </tr>
    `;
  }

  async function loadLogs() {
    const limit = Number(limitSelect?.value || 200);
    const { data, error } = await supabase.rpc("admin_get_recent_logs", {
      limit_count: limit,
    });
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) {
      logsTableBody.innerHTML = '<tr><td colspan="5" class="admin-empty">No admin logs found yet.</td></tr>';
      return;
    }
    logsTableBody.innerHTML = rows.map(rowHtml).join("");
  }

  refreshBtn?.addEventListener("click", () => {
    loadLogs().catch((err) => {
      console.error(err);
      alert(err.message || "Failed to refresh logs.");
    });
  });

  limitSelect?.addEventListener("change", () => {
    loadLogs().catch((err) => {
      console.error(err);
      alert(err.message || "Failed to load logs.");
    });
  });

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      if (!(await ensureAdminAccess())) return;
      await loadLogs();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to load admin logs.");
    }
  });
})();
