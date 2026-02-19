(function () {
  const supabase = window.supabaseClient;
  let currentUserId = null;
  const accessError = document.getElementById("adminAccessError");
  const settingsPanel = document.getElementById("settingsPanel");
  const shopItemsPanel = document.getElementById("shopItemsPanel");

  const emailInput = document.getElementById("settingsEmail");
  const roleSelect = document.getElementById("settingsRole");
  const applyButton = document.getElementById("settingsApplyBtn");
  const multiRoleEmail = document.getElementById("multiRoleEmail");
  const multiRoleStudent = document.getElementById("multiRoleStudent");
  const multiRoleTeacher = document.getElementById("multiRoleTeacher");
  const multiRoleAdmin = document.getElementById("multiRoleAdmin");
  const multiRoleApplyBtn = document.getElementById("multiRoleApplyBtn");

  const shopItemName = document.getElementById("shopItemName");
  const shopItemDescription = document.getElementById("shopItemDescription");
  const shopItemCategory = document.getElementById("shopItemCategory");
  const shopItemPrice = document.getElementById("shopItemPrice");
  const shopItemMinLevel = document.getElementById("shopItemMinLevel");
  const shopItemProperties = document.getElementById("shopItemProperties");
  const shopItemActive = document.getElementById("shopItemActive");
  const shopItemAddBtn = document.getElementById("shopItemAddBtn");
  const refreshShopItemsBtn = document.getElementById("refreshShopItemsBtn");
  const shopItemsTableBody = document.getElementById("adminShopItemsTableBody");
  const avatarShopItemSelect = document.getElementById("avatarShopItemSelect");
  const avatarShopImageInput = document.getElementById("avatarShopImageInput");
  const avatarShopImageUploadBtn = document.getElementById("avatarShopImageUploadBtn");
  const settingsAvatarPreview = document.getElementById("settingsAvatarPreview");
  const settingsAvatarInput = document.getElementById("settingsAvatarInput");
  const settingsAvatarBtn = document.getElementById("settingsAvatarBtn");

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
    currentUserId = session.user.id;

    const { data: me, error: meError } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (meError || !me || me.role !== "admin") {
      if (accessError) accessError.style.display = "block";
      if (settingsPanel) settingsPanel.style.display = "none";
      if (shopItemsPanel) shopItemsPanel.style.display = "none";
      return false;
    }

    return true;
  }

  async function applyRoleByEmail() {
    const email = (emailInput.value || "").trim();
    if (!email) throw new Error("Email is required.");

    const { data, error } = await supabase.rpc("admin_set_user_role_by_email", {
      target_email: email,
      new_role: roleSelect.value,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : null;
    if (!row) {
      alert("Role updated.");
      return;
    }
    alert(`Updated ${row.email} to role ${row.role}.`);
  }

  function defaultAvatarDataUrl(seedText) {
    const initials = String(seedText || "U")
      .substring(0, 2)
      .toUpperCase();
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="%233B82F6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="36" fill="white" font-weight="700">${initials}</text></svg>`;
  }

  async function loadOwnAvatar() {
    if (!currentUserId || !settingsAvatarPreview) return;
    const { data, error } = await supabase
      .from("users")
      .select("username, email, profile_picture_url")
      .eq("id", currentUserId)
      .single();
    if (error) throw error;

    settingsAvatarPreview.src =
      data?.profile_picture_url || defaultAvatarDataUrl(data?.username || data?.email || "U");
    const appearance = await window.fetchAvatarAppearanceForUser?.(currentUserId);
    window.applyAvatarAppearance?.(settingsAvatarPreview, appearance);
  }

  async function handleSettingsAvatarUpload() {
    const file = settingsAvatarInput?.files?.[0];
    if (!file || !currentUserId) return;
    if (!file.type.startsWith("image/")) throw new Error("Please select an image file.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Image size must be less than 5MB.");

    const fileExt = file.name.split(".").pop();
    const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-pictures")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("profile-pictures").getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from("users")
      .update({ profile_picture_url: publicUrl })
      .eq("id", currentUserId);
    if (updateError) throw updateError;

    await loadOwnAvatar();
    if (window.loadNavbarProfile) {
      await window.loadNavbarProfile();
    }
    alert("Profile picture updated.");
  }

  async function loadShopItems() {
    let rows = [];
    const { data, error } = await supabase.rpc("admin_get_shop_items");
    if (error) {
      const cacheMissing =
        String(error.message || "").includes("schema cache") ||
        String(error.message || "").includes("admin_get_shop_items");
      if (!cacheMissing) throw error;

      const fallback = await supabase
        .from("shop_items")
        .select("id, name, category, price, min_level, is_active, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (fallback.error) throw fallback.error;
      rows = Array.isArray(fallback.data) ? fallback.data : [];
    } else {
      rows = Array.isArray(data) ? data : [];
    }

    if (!rows.length) {
      shopItemsTableBody.innerHTML = '<tr><td colspan="8" class="admin-empty">No shop items found.</td></tr>';
      return;
    }

    shopItemsTableBody.innerHTML = rows
      .map((row) => {
        const created = row.created_at ? new Date(row.created_at).toLocaleString() : "-";
        const toggleLabel = row.is_active ? "Deactivate" : "Activate";
        const toggleClass = row.is_active ? "btn btn-secondary" : "btn btn-primary";
        return `
          <tr>
            <td>${row.id}</td>
            <td>${escapeHtml(row.name)}</td>
            <td>${escapeHtml(row.category)}</td>
            <td>${row.price}</td>
            <td>${row.min_level}</td>
            <td>${row.is_active ? "yes" : "no"}</td>
            <td>${created}</td>
            <td>
              <div class="admin-shop-actions">
                <button class="${toggleClass}" data-action="toggle-shop-item" data-item-id="${row.id}" data-next-active="${row.is_active ? "false" : "true"}">${toggleLabel}</button>
                <button class="btn admin-danger-btn" data-action="delete-shop-item" data-item-id="${row.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  async function loadAvatarCosmeticItems() {
    if (!avatarShopItemSelect) return;
    const { data, error } = await supabase
      .from("shop_items")
      .select("id, name, properties")
      .eq("category", "cosmetic")
      .order("name", { ascending: true });
    if (error) throw error;

    const avatarItems = (Array.isArray(data) ? data : []).filter((row) => {
      const type = String(row?.properties?.type || "").toLowerCase();
      return type === "avatar";
    });

    if (!avatarItems.length) {
      avatarShopItemSelect.innerHTML = '<option value="">No avatar cosmetics found</option>';
      return;
    }

    avatarShopItemSelect.innerHTML = avatarItems
      .map((row) => `<option value="${row.id}">${escapeHtml(row.name)} (#${row.id})</option>`)
      .join("");
  }

  async function setShopItemActive(itemId, nextActive) {
    const { error } = await supabase.rpc("admin_set_shop_item_active", {
      target_item_id: Number(itemId),
      active_state: !!nextActive,
    });
    if (error) throw error;
  }

  async function deleteShopItem(itemId) {
    const { data, error } = await supabase.rpc("admin_delete_shop_item", {
      target_item_id: Number(itemId),
    });
    if (error) throw error;
    const ok = data === true || (Array.isArray(data) && data[0] === true);
    if (!ok) throw new Error("Shop item was not deleted.");
  }

  async function uploadAvatarCosmeticImage() {
    const itemId = Number(avatarShopItemSelect?.value || 0);
    if (!itemId) throw new Error("Select an avatar cosmetic item.");
    const file = avatarShopImageInput?.files?.[0];
    if (!file) throw new Error("Choose an image file first.");
    if (!file.type.startsWith("image/")) throw new Error("Please select an image file.");
    if (file.size > 8 * 1024 * 1024) throw new Error("Image size must be under 8MB.");

    const ext = file.name.split(".").pop();
    const filePath = `shop-avatar-${itemId}-${Date.now()}.${ext}`;
    let publicUrl = "";

    const tryBuckets = ["shop-assets", "profile-pictures"];
    let lastError = null;
    for (const bucket of tryBuckets) {
      const uploaded = await supabase.storage.from(bucket).upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploaded.error) {
        lastError = uploaded.error;
        continue;
      }
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      publicUrl = urlData?.publicUrl || "";
      if (publicUrl) break;
    }

    if (!publicUrl) {
      throw lastError || new Error("Failed to upload shop avatar image.");
    }

    const { error } = await supabase.rpc("admin_set_shop_item_image", {
      target_item_id: itemId,
      new_image_url: publicUrl,
    });
    if (error) throw error;
  }

  async function addShopItem() {
    const name = (shopItemName.value || "").trim();
    if (!name) throw new Error("Item name is required.");

    const price = Number(shopItemPrice.value || 0);
    if (!Number.isFinite(price) || price <= 0) throw new Error("Price must be greater than 0.");

    const minLevel = Number(shopItemMinLevel.value || 1);
    if (!Number.isFinite(minLevel) || minLevel < 1) throw new Error("Min level must be at least 1.");

    let properties = {};
    const rawProperties = (shopItemProperties.value || "").trim();
    if (rawProperties) {
      try {
        properties = JSON.parse(rawProperties);
      } catch {
        throw new Error("Properties must be valid JSON.");
      }
    }

    const { error } = await supabase.rpc("admin_add_shop_item", {
      item_name: name,
      item_description: (shopItemDescription.value || "").trim() || null,
      item_category: shopItemCategory.value,
      item_price: price,
      item_min_level: minLevel,
      item_properties: properties,
      item_is_active: !!shopItemActive.checked,
    });
    if (error) throw error;

    shopItemName.value = "";
    shopItemDescription.value = "";
    shopItemCategory.value = "theme";
    shopItemPrice.value = "";
    shopItemMinLevel.value = "1";
    shopItemProperties.value = "";
    shopItemActive.checked = true;
  }

  async function applyMultipleRolesByEmail() {
    const email = (multiRoleEmail?.value || "").trim();
    if (!email) throw new Error("Email is required.");

    const roles = [];
    if (multiRoleStudent?.checked) roles.push("student");
    if (multiRoleTeacher?.checked) roles.push("teacher");
    if (multiRoleAdmin?.checked) roles.push("admin");
    if (!roles.length) throw new Error("Select at least one role.");

    const { data, error } = await supabase.rpc("admin_set_user_roles_by_email", {
      target_email: email,
      new_roles: roles,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : null;
    if (!row) {
      alert("Roles updated.");
      return;
    }
    alert(`Updated ${row.email}. Roles: ${(row.roles || []).join(", ")}`);
  }

  applyButton?.addEventListener("click", async () => {
    try {
      applyButton.disabled = true;
      await applyRoleByEmail();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update role.");
    } finally {
      applyButton.disabled = false;
    }
  });

  shopItemAddBtn?.addEventListener("click", async () => {
    try {
      shopItemAddBtn.disabled = true;
      await addShopItem();
      await loadShopItems();
      alert("Shop item added.");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to add shop item.");
    } finally {
      shopItemAddBtn.disabled = false;
    }
  });

  multiRoleApplyBtn?.addEventListener("click", async () => {
    try {
      multiRoleApplyBtn.disabled = true;
      await applyMultipleRolesByEmail();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update multiple roles.");
    } finally {
      multiRoleApplyBtn.disabled = false;
    }
  });

  refreshShopItemsBtn?.addEventListener("click", () => {
    loadShopItems().catch((err) => {
      console.error(err);
      alert(err.message || "Failed to refresh shop items.");
    });
  });

  shopItemsTableBody?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.getAttribute("data-action");
    const itemId = Number(target.getAttribute("data-item-id"));
    if (!action || !itemId) return;

    try {
      target.setAttribute("disabled", "disabled");
      if (action === "toggle-shop-item") {
        const nextActive = String(target.getAttribute("data-next-active")) === "true";
        await setShopItemActive(itemId, nextActive);
      }
      if (action === "delete-shop-item") {
        const confirmed = window.confirm(`Delete shop item #${itemId}? This cannot be undone.`);
        if (!confirmed) return;
        await deleteShopItem(itemId);
      }
      await loadShopItems();
      await loadAvatarCosmeticItems();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update shop item.");
    } finally {
      target.removeAttribute("disabled");
    }
  });

  settingsAvatarBtn?.addEventListener("click", () => {
    settingsAvatarInput?.click();
  });

  settingsAvatarInput?.addEventListener("change", async () => {
    try {
      settingsAvatarBtn.disabled = true;
      await handleSettingsAvatarUpload();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update avatar.");
    } finally {
      settingsAvatarBtn.disabled = false;
      if (settingsAvatarInput) settingsAvatarInput.value = "";
    }
  });

  avatarShopImageUploadBtn?.addEventListener("click", async () => {
    try {
      avatarShopImageUploadBtn.disabled = true;
      await uploadAvatarCosmeticImage();
      if (avatarShopImageInput) avatarShopImageInput.value = "";
      await loadShopItems();
      alert("Avatar cosmetic image uploaded and linked.");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to upload avatar cosmetic image.");
    } finally {
      avatarShopImageUploadBtn.disabled = false;
    }
  });

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      if (!(await ensureAdminAccess())) return;
      await loadOwnAvatar();
      await loadShopItems();
      await loadAvatarCosmeticItems();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to load settings.");
    }
  });
})();
