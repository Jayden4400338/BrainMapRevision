(function () {
  const supabase = window.supabaseClient;
  const tableBody = document.getElementById("adminUsersTableBody");
  const searchInput = document.getElementById("adminSearchInput");
  const refreshBtn = document.getElementById("refreshUsersBtn");
  const accessError = document.getElementById("adminAccessError");
  const tableWrap = document.getElementById("adminTableWrap");

  const statTotal = document.getElementById("statTotalUsers");
  const statStudents = document.getElementById("statStudents");
  const statTeachers = document.getElementById("statTeachers");
  const statAdmins = document.getElementById("statAdmins");

  let users = [];
  let shopItems = [];
  let adminUserId = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function roleBadge(role) {
    const safeRole = escapeHtml(role || "student");
    return `<span class="admin-role-badge ${safeRole}">${safeRole}</span>`;
  }

  function roleSetHtml(roles, primaryRole) {
    const safeRoles = Array.isArray(roles) && roles.length ? roles : ["student"];
    const extras = safeRoles.filter((role) => role !== primaryRole);
    if (!extras.length) return "";
    return extras
      .map((role) => `<span class="admin-role-badge ${escapeHtml(role)}">${escapeHtml(role)}</span>`)
      .join(" ");
  }

  function renderStats() {
    const students = users.filter((u) => u.role === "student").length;
    const teachers = users.filter((u) => u.role === "teacher").length;
    const admins = users.filter((u) => u.role === "admin").length;
    statTotal.textContent = String(users.length);
    statStudents.textContent = String(students);
    statTeachers.textContent = String(teachers);
    statAdmins.textContent = String(admins);
  }

  function initialsFromUser(user) {
    const seed = user?.username || user?.email || "U";
    return String(seed).substring(0, 2).toUpperCase();
  }

  function userAvatarHtml(user) {
    if (user?.profile_picture_url) {
      return `<img class="admin-user-avatar" src="${escapeHtml(user.profile_picture_url)}" alt="${escapeHtml(user.username || "User")}" />`;
    }
    return `<div class="admin-user-avatar admin-user-avatar-placeholder">${escapeHtml(initialsFromUser(user))}</div>`;
  }

  function rowHtml(user) {
    const roles = Array.isArray(user.roles) && user.roles.length ? user.roles : [user.role || "student"];
    const hasStudent = roles.includes("student");
    const hasTeacher = roles.includes("teacher");
    const hasAdmin = roles.includes("admin");
    const extraRolesHtml = roleSetHtml(roles, user.role || "student");
    const shopOptions = shopItems
      .map((item) => {
        const activeLabel = item.is_active ? "" : " (inactive)";
        return `<option value="${item.id}">#${item.id} ${escapeHtml(item.name)} [${escapeHtml(item.category)}]${activeLabel}</option>`;
      })
      .join("");

    return `
      <tr data-user-id="${user.id}">
        <td>
          <div class="admin-user-main">
            <div class="admin-user-avatar-wrap">${userAvatarHtml(user)}</div>
            <div>
              <strong>${escapeHtml(user.username || "Unknown")}</strong>
              <small>${escapeHtml(user.email || "")}</small>
            </div>
          </div>
        </td>
        <td>
          <div>${roleBadge(user.role)}</div>
          ${extraRolesHtml ? `<div class="admin-role-set">${extraRolesHtml}</div>` : ""}
        </td>
        <td>${user.xp ?? 0}<br><small>Lvl ${user.level ?? 1}</small></td>
        <td>${user.brain_coins ?? 0}</td>
        <td>${user.hint_tokens ?? 0}</td>
        <td>
          <div class="admin-quick-actions">
            <button data-action="quick" data-xp="50">+50 XP</button>
            <button data-action="quick" data-coins="100">+100 Coins</button>
            <button data-action="quick" data-hints="3">+3 Hints</button>
            <select data-field="reward_pack">
              <option value="starter">Starter Pack (+100 XP, +150 Coins, +3 Hints)</option>
              <option value="weekly">Weekly Pack (+250 XP, +300 Coins, +5 Hints)</option>
              <option value="mega">Mega Pack (+500 XP, +600 Coins, +10 Hints)</option>
            </select>
            <input type="text" data-field="reward_note" placeholder="Reward note (optional)" />
            <button data-action="grant-reward">Grant Reward Pack</button>
            <select data-field="shop_item_id">${shopOptions}</select>
            <label class="admin-role-check"><input type="checkbox" data-field="shop_auto_equip" /> auto-equip if applicable</label>
            <button data-action="grant-shop-item">Grant Shop Item</button>
          </div>
        </td>
        <td>
          <div class="admin-custom-controls">
            <input type="number" data-field="xp" placeholder="XP delta (e.g. 250 or -100)" />
            <input type="number" data-field="coins" placeholder="Coin delta" />
            <input type="number" data-field="hints" placeholder="Hint delta" />
            <button data-action="apply">Apply Stats</button>
          </div>
        </td>
        <td>
          <div class="admin-custom-controls">
            <input type="text" data-field="username" value="${escapeHtml(user.username || "")}" placeholder="Username" />
            <input type="url" data-field="pfp_url" value="${escapeHtml(user.profile_picture_url || "")}" placeholder="Profile picture URL" />
            <button data-action="set-pfp-url">Update PFP from URL</button>
            <div class="admin-inline-actions">
              <input type="file" data-field="pfp_file" accept="image/*" />
              <button data-action="upload-pfp">Upload File</button>
              <button data-action="clear-pfp">Clear PFP</button>
            </div>
            <div class="admin-role-check-grid">
              <label class="admin-role-check"><input type="checkbox" data-role="student" ${hasStudent ? "checked" : ""} /> student</label>
              <label class="admin-role-check"><input type="checkbox" data-role="teacher" ${hasTeacher ? "checked" : ""} /> teacher</label>
              <label class="admin-role-check"><input type="checkbox" data-role="admin" ${hasAdmin ? "checked" : ""} /> admin</label>
            </div>
            <button data-action="apply-account">Apply Account Changes</button>
            <input type="text" data-field="new_password" placeholder="Set new password (min 8 chars)" />
            <button class="admin-danger-btn" data-action="set-password">Set Password</button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderTable(filterText = "") {
    const term = filterText.trim().toLowerCase();
    const filtered = term
      ? users.filter(
          (u) =>
            (u.username || "").toLowerCase().includes(term) ||
            (u.email || "").toLowerCase().includes(term)
        )
      : users;

    tableBody.innerHTML = filtered.map(rowHtml).join("");
  }

  async function loadUsers() {
    const full = await supabase.rpc("admin_get_all_users_full");
    if (!full.error) {
      users = Array.isArray(full.data) ? full.data : [];
    } else {
      const fallback = await supabase.rpc("admin_get_all_users");
      if (fallback.error) throw fallback.error;
      users = Array.isArray(fallback.data)
        ? fallback.data.map((u) => ({ ...u, roles: [u.role], profile_picture_url: null }))
        : [];
    }
    renderStats();
    renderTable(searchInput.value);
  }

  async function loadShopItems() {
    const fromRpc = await supabase.rpc("admin_get_shop_items", { limit_count: 300 });
    if (!fromRpc.error) {
      shopItems = Array.isArray(fromRpc.data) ? fromRpc.data : [];
      return;
    }

    const fallback = await supabase
      .from("shop_items")
      .select("id, name, category, is_active")
      .order("name", { ascending: true });
    if (fallback.error) throw fallback.error;
    shopItems = Array.isArray(fallback.data) ? fallback.data : [];
  }

  async function applyUpdate(userId, xpDelta, coinDelta, hintDelta, roleValue) {
    const { error } = await supabase.rpc("admin_update_user_stats", {
      target_user_uuid: userId,
      xp_delta: xpDelta,
      coin_delta: coinDelta,
      hint_delta: hintDelta,
      new_role: roleValue || null,
    });
    if (error) throw error;
  }

  function getRewardPackValues(pack) {
    const key = String(pack || "starter");
    if (key === "weekly") return { xp: 250, coins: 300, hints: 5 };
    if (key === "mega") return { xp: 500, coins: 600, hints: 10 };
    return { xp: 100, coins: 150, hints: 3 };
  }

  async function grantRewardPack(userId, row) {
    const packSelect = row.querySelector('select[data-field="reward_pack"]');
    const noteInput = row.querySelector('input[data-field="reward_note"]');
    const pack = packSelect?.value || "starter";
    const values = getRewardPackValues(pack);
    const note = (noteInput?.value || "").trim();

    const { error } = await supabase.rpc("admin_grant_user_rewards", {
      target_user_uuid: userId,
      xp_amount: values.xp,
      coin_amount: values.coins,
      hint_amount: values.hints,
      note: note || null,
    });
    if (error) throw error;
  }

  async function grantShopItem(userId, row) {
    const itemSelect = row.querySelector('select[data-field="shop_item_id"]');
    const autoEquipInput = row.querySelector('input[data-field="shop_auto_equip"]');
    const itemId = Number(itemSelect?.value || 0);
    if (!itemId) throw new Error("Select a shop item to grant.");

    const { data, error } = await supabase.rpc("admin_grant_shop_item", {
      target_user_uuid: userId,
      target_item_id: itemId,
      auto_equip: !!autoEquipInput?.checked,
    });
    if (error) throw error;
    const rowResult = Array.isArray(data) ? data[0] : null;
    if (rowResult && rowResult.success === false) {
      throw new Error(rowResult.message || "Failed to grant shop item.");
    }
  }

  function collectRoles(row) {
    const roles = [];
    row.querySelectorAll('input[type="checkbox"][data-role]').forEach((input) => {
      if (input.checked) roles.push(String(input.getAttribute("data-role")));
    });
    return roles.length ? roles : ["student"];
  }

  async function applyAccountUpdate(userId, row) {
    const usernameInput = row.querySelector('input[data-field="username"]');
    const pfpUrlInput = row.querySelector('input[data-field="pfp_url"]');
    const roles = collectRoles(row);
    const username = (usernameInput?.value || "").trim();
    const pfpUrl = (pfpUrlInput?.value || "").trim();

    const { error } = await supabase.rpc("admin_update_user_account", {
      target_user_uuid: userId,
      new_username: username || null,
      new_profile_picture_url: pfpUrl === "" ? "" : pfpUrl,
      new_roles: roles,
    });
    if (error) throw error;
  }

  async function clearProfilePicture(userId, row) {
    const pfpUrlInput = row.querySelector('input[data-field="pfp_url"]');
    if (pfpUrlInput) pfpUrlInput.value = "";

    const { error } = await supabase.rpc("admin_update_user_account", {
      target_user_uuid: userId,
      new_username: null,
      new_profile_picture_url: "",
      new_roles: collectRoles(row),
    });
    if (error) throw error;
  }

  async function setProfilePictureFromUrl(userId, row) {
    const pfpUrlInput = row.querySelector('input[data-field="pfp_url"]');
    const url = String(pfpUrlInput?.value || "").trim();
    if (!url) throw new Error("Enter a profile picture URL first.");

    const { error } = await supabase.rpc("admin_update_user_account", {
      target_user_uuid: userId,
      new_username: null,
      new_profile_picture_url: url,
      new_roles: collectRoles(row),
    });
    if (error) throw error;
  }

  async function uploadProfilePictureFile(userId, row) {
    const fileInput = row.querySelector('input[data-field="pfp_file"]');
    const file = fileInput?.files?.[0];
    if (!file) throw new Error("Select an image file first.");
    if (!file.type.startsWith("image/")) throw new Error("Please select an image file.");
    if (file.size > 8 * 1024 * 1024) throw new Error("Image must be under 8MB.");

    const ext = file.name.split(".").pop();
    const filePath = `${adminUserId || userId}-admin-${userId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-pictures")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from("profile-pictures").getPublicUrl(filePath);
    const publicUrl = urlData?.publicUrl || "";
    if (!publicUrl) throw new Error("Failed to get uploaded file URL.");

    const { error } = await supabase.rpc("admin_update_user_account", {
      target_user_uuid: userId,
      new_username: null,
      new_profile_picture_url: publicUrl,
      new_roles: collectRoles(row),
    });
    if (error) throw error;
  }

  async function setUserPassword(userId, row) {
    const passwordInput = row.querySelector('input[data-field="new_password"]');
    const password = String(passwordInput?.value || "");
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");

    const { error } = await supabase.rpc("admin_set_user_password", {
      target_user_uuid: userId,
      new_password: password,
    });
    if (error) throw error;
    if (passwordInput) passwordInput.value = "";
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
    adminUserId = session.user.id;

    const { data: me, error: meError } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (meError || !me || me.role !== "admin") {
      accessError.style.display = "block";
      tableWrap.style.display = "none";
      return false;
    }

    return true;
  }

  document.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const row = target.closest("tr[data-user-id]");
    if (!row) return;
    const userId = row.getAttribute("data-user-id");
    if (!userId) return;

    try {
      if (target.dataset.action === "quick") {
        const xp = Number(target.dataset.xp || 0);
        const coins = Number(target.dataset.coins || 0);
        const hints = Number(target.dataset.hints || 0);
        await applyUpdate(userId, xp, coins, hints, "");
        await loadUsers();
      }

      if (target.dataset.action === "grant-reward") {
        await grantRewardPack(userId, row);
        await loadUsers();
      }

      if (target.dataset.action === "grant-shop-item") {
        await grantShopItem(userId, row);
        await loadUsers();
      }

      if (target.dataset.action === "apply") {
        const xpInput = row.querySelector('input[data-field="xp"]');
        const coinsInput = row.querySelector('input[data-field="coins"]');
        const hintsInput = row.querySelector('input[data-field="hints"]');

        const xp = Number((xpInput && xpInput.value) || 0);
        const coins = Number((coinsInput && coinsInput.value) || 0);
        const hints = Number((hintsInput && hintsInput.value) || 0);
        const roleValue = "";

        await applyUpdate(userId, xp, coins, hints, roleValue);
        await loadUsers();
      }

      if (target.dataset.action === "apply-account") {
        await applyAccountUpdate(userId, row);
        await loadUsers();
      }

      if (target.dataset.action === "upload-pfp") {
        await uploadProfilePictureFile(userId, row);
        await loadUsers();
      }

      if (target.dataset.action === "set-pfp-url") {
        await setProfilePictureFromUrl(userId, row);
        await loadUsers();
      }

      if (target.dataset.action === "clear-pfp") {
        await clearProfilePicture(userId, row);
        await loadUsers();
      }

      if (target.dataset.action === "set-password") {
        await setUserPassword(userId, row);
        alert("Password updated.");
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Update failed.");
    }
  });

  searchInput.addEventListener("input", () => renderTable(searchInput.value));
  refreshBtn.addEventListener("click", () => loadUsers().catch((e) => alert(e.message)));

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      if (!(await ensureAdminAccess())) return;
      await loadShopItems();
      await loadUsers();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to load admin panel.");
    }
  });
})();
