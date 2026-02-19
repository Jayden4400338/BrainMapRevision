(function () {
  const supabase = window.supabaseClient;
  const accessError = document.getElementById("adminAccessError");
  const tableWrap = document.getElementById("activityTableWrap");
  const tableBody = document.getElementById("adminActivityTableBody");
  const refreshBtn = document.getElementById("refreshActivityBtn");

  function roleBadge(role) {
    return `<span class="admin-role-badge ${role}">${role}</span>`;
  }

  function statusBadge(status) {
    const safeStatus = status || "offline";
    return `<span class="admin-status-badge ${safeStatus}"><span class="admin-status-dot"></span>${safeStatus}</span>`;
  }

  function formatDate(value) {
    if (!value) return "Never";
    const date = new Date(value);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
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
      if (tableWrap) tableWrap.style.display = "none";
      return false;
    }

    return true;
  }

  async function loadActivity() {
    const { data, error } = await supabase.rpc("admin_get_user_activity");
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="5" class="admin-empty">No users found.</td></tr>';
      return;
    }

    tableBody.innerHTML = rows
      .map((row) => {
        const mins = row.minutes_since_login == null ? "-" : `${row.minutes_since_login}`;
        return `
        <tr>
          <td>
            <div class="admin-user-main">
              <strong>${row.username || "Unknown"}</strong>
              <small>${row.email || ""}</small>
            </div>
          </td>
          <td>${roleBadge(row.role || "student")}</td>
          <td>${statusBadge(row.status)}</td>
          <td>${formatDate(row.last_login)}</td>
          <td>${mins}</td>
        </tr>
      `;
      })
      .join("");
  }

  refreshBtn?.addEventListener("click", () => {
    loadActivity().catch((err) => {
      console.error(err);
      alert(err.message || "Failed to refresh activity.");
    });
  });

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      if (!(await ensureAdminAccess())) return;
      await loadActivity();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to load activity.");
    }
  });
})();
