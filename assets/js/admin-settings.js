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
  const eventNameInput = document.getElementById("eventNameInput");
  const eventTypeSelect = document.getElementById("eventTypeSelect");
  const eventStartBtn = document.getElementById("eventStartBtn");
  const eventEndBtn = document.getElementById("eventEndBtn");
  const eventStartText = document.getElementById("eventStartText");
  const eventEndText = document.getElementById("eventEndText");
  const eventDescriptionInput = document.getElementById("eventDescriptionInput");
  const eventActiveInput = document.getElementById("eventActiveInput");
  const eventCreateBtn = document.getElementById("eventCreateBtn");
  const adminEventsList = document.getElementById("adminEventsList");
  const eventDateModal = document.getElementById("eventDateModal");
  const eventDateModalTitle = document.getElementById("eventDateModalTitle");
  const eventDateModalClose = document.getElementById("eventDateModalClose");
  const eventCalPrev = document.getElementById("eventCalPrev");
  const eventCalNext = document.getElementById("eventCalNext");
  const eventCalMonthLabel = document.getElementById("eventCalMonthLabel");
  const eventCalGrid = document.getElementById("eventCalGrid");
  const eventCalHour = document.getElementById("eventCalHour");
  const eventCalMinute = document.getElementById("eventCalMinute");
  const eventDateApplyBtn = document.getElementById("eventDateApplyBtn");

  let scheduledEvents = [];
  let eventStartAt = null;
  let eventEndAt = null;
  const pickerState = {
    target: "start",
    displayYear: new Date().getFullYear(),
    displayMonth: new Date().getMonth(),
    selectedDate: new Date(),
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatDateTimeLabel(value) {
    if (!value) return "Not set";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "Not set";
    return date.toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function toIsoUtc(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  function getEventDefaults(typeKey) {
    const key = String(typeKey || "").toLowerCase();
    if (key === "double_xp_weekend") {
      return { event_key: key, payload: { xp_multiplier: 2 }, name: "Double XP Weekend" };
    }
    if (key === "triple_xp_happy_hour") {
      return { event_key: key, payload: { xp_multiplier: 3 }, name: "Triple XP Happy Hour" };
    }
    if (key === "unlimited_hints_weekend") {
      return { event_key: key, payload: { unlimited_hints: true }, name: "Unlimited Hints Weekend" };
    }
    if (key === "double_coins_weekend") {
      return { event_key: key, payload: { coin_multiplier: 2 }, name: "Double Coins Weekend" };
    }
    return { event_key: key || "custom_boost", payload: {}, name: "Custom Boost Event" };
  }

  function syncEventDateLabels() {
    if (eventStartText) eventStartText.textContent = formatDateTimeLabel(eventStartAt);
    if (eventEndText) eventEndText.textContent = formatDateTimeLabel(eventEndAt);
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

  async function loadPlatformEvents() {
    if (!adminEventsList) return;
    const { data, error } = await supabase.rpc("admin_get_platform_events", {
      limit_count: 200,
    });
    if (error) throw error;
    scheduledEvents = Array.isArray(data) ? data : [];
    renderPlatformEvents();
  }

  function renderPlatformEvents() {
    if (!adminEventsList) return;
    if (!scheduledEvents.length) {
      adminEventsList.innerHTML = '<div class="admin-empty">No platform events scheduled yet.</div>';
      return;
    }

    adminEventsList.innerHTML = scheduledEvents
      .map((row) => {
        const starts = formatDateTimeLabel(row?.starts_at);
        const ends = formatDateTimeLabel(row?.ends_at);
        const activeText = row?.is_active ? "active" : "inactive";
        return `
          <div class="admin-event-item">
            <div class="admin-event-item-head">
              <strong>${escapeHtml(row?.name || "Untitled event")}</strong>
              <span class="admin-event-item-meta">${escapeHtml(activeText)} | ${escapeHtml(row?.event_key || "event")}</span>
            </div>
            <div class="admin-event-item-meta">Starts: ${escapeHtml(starts)} | Ends: ${escapeHtml(ends)}</div>
            <div class="admin-event-item-meta">${escapeHtml(row?.description || "")}</div>
            <div class="admin-event-item-actions">
              <button class="btn btn-secondary" data-action="toggle-platform-event" data-event-id="${row.id}" data-next-active="${row.is_active ? "false" : "true"}">${row.is_active ? "Disable" : "Enable"}</button>
              <button class="btn admin-danger-btn" data-action="delete-platform-event" data-event-id="${row.id}">Delete</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  async function createPlatformEvent() {
    const defaults = getEventDefaults(eventTypeSelect?.value || "");
    const name = (eventNameInput?.value || "").trim() || defaults.name;
    const startsAt = toIsoUtc(eventStartAt);
    const endsAt = toIsoUtc(eventEndAt);

    if (!startsAt || !endsAt) throw new Error("Start and end date/time are required.");
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      throw new Error("End must be after start.");
    }

    const { error } = await supabase.rpc("admin_create_platform_event", {
      p_event_name: name,
      p_event_key: defaults.event_key,
      p_event_description: (eventDescriptionInput?.value || "").trim() || null,
      p_starts_at: startsAt,
      p_ends_at: endsAt,
      p_payload: defaults.payload,
      p_is_active: !!eventActiveInput?.checked,
    });
    if (error) throw error;

    if (eventNameInput) eventNameInput.value = "";
    if (eventDescriptionInput) eventDescriptionInput.value = "";
    if (eventTypeSelect) eventTypeSelect.value = "double_xp_weekend";
    if (eventActiveInput) eventActiveInput.checked = true;
    eventStartAt = null;
    eventEndAt = null;
    syncEventDateLabels();
  }

  async function setPlatformEventActive(eventId, nextActive) {
    const { error } = await supabase.rpc("admin_set_platform_event_active", {
      target_event_id: Number(eventId),
      active_state: !!nextActive,
    });
    if (error) throw error;
  }

  async function deletePlatformEvent(eventId) {
    const { data, error } = await supabase.rpc("admin_delete_platform_event", {
      target_event_id: Number(eventId),
    });
    if (error) throw error;
    const ok = data === true || (Array.isArray(data) && data[0] === true);
    if (!ok) throw new Error("Event was not deleted.");
  }

  function ensurePickerTimeOptions() {
    if (eventCalHour && !eventCalHour.options.length) {
      eventCalHour.innerHTML = Array.from({ length: 24 }, (_, hour) => {
        const val = String(hour).padStart(2, "0");
        return `<option value="${val}">${val}</option>`;
      }).join("");
    }
    if (eventCalMinute && !eventCalMinute.options.length) {
      eventCalMinute.innerHTML = Array.from({ length: 60 }, (_, minute) => {
        const val = String(minute).padStart(2, "0");
        return `<option value="${val}">${val}</option>`;
      }).join("");
    }
  }

  function openEventDatePicker(target) {
    if (!eventDateModal || !eventCalGrid || !eventCalMonthLabel) return;
    pickerState.target = target === "end" ? "end" : "start";
    const existing = pickerState.target === "end" ? eventEndAt : eventStartAt;
    const sourceDate = existing instanceof Date ? new Date(existing.getTime()) : new Date();
    pickerState.selectedDate = sourceDate;
    pickerState.displayYear = sourceDate.getFullYear();
    pickerState.displayMonth = sourceDate.getMonth();
    if (eventDateModalTitle) {
      eventDateModalTitle.textContent = pickerState.target === "start" ? "Pick Start Date & Time" : "Pick End Date & Time";
    }

    ensurePickerTimeOptions();
    if (eventCalHour) eventCalHour.value = String(sourceDate.getHours()).padStart(2, "0");
    if (eventCalMinute) eventCalMinute.value = String(sourceDate.getMinutes()).padStart(2, "0");
    renderEventCalendar();
    eventDateModal.style.display = "grid";
  }

  function closeEventDatePicker() {
    if (!eventDateModal) return;
    eventDateModal.style.display = "none";
  }

  function renderEventCalendar() {
    if (!eventCalGrid || !eventCalMonthLabel) return;

    const y = pickerState.displayYear;
    const m = pickerState.displayMonth;
    const firstOfMonth = new Date(y, m, 1);
    const firstWeekdayMon0 = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevMonthDays = new Date(y, m, 0).getDate();
    const monthLabel = firstOfMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    eventCalMonthLabel.textContent = monthLabel;

    const cells = [];
    for (let i = 0; i < firstWeekdayMon0; i += 1) {
      const day = prevMonthDays - firstWeekdayMon0 + i + 1;
      cells.push({ day, monthOffset: -1 });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ day, monthOffset: 0 });
    }
    while (cells.length < 42) {
      cells.push({ day: cells.length - (firstWeekdayMon0 + daysInMonth) + 1, monthOffset: 1 });
    }

    eventCalGrid.innerHTML = cells
      .map((cell) => {
        const cellDate = new Date(y, m + cell.monthOffset, cell.day);
        const isSelected =
          pickerState.selectedDate &&
          cellDate.getFullYear() === pickerState.selectedDate.getFullYear() &&
          cellDate.getMonth() === pickerState.selectedDate.getMonth() &&
          cellDate.getDate() === pickerState.selectedDate.getDate();
        const classes = [
          "admin-event-cal-day",
          cell.monthOffset !== 0 ? "is-other-month" : "",
          isSelected ? "is-selected" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return `<button type="button" class="${classes}" data-action="pick-event-day" data-y="${cellDate.getFullYear()}" data-m="${cellDate.getMonth()}" data-d="${cellDate.getDate()}">${cell.day}</button>`;
      })
      .join("");
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

  adminEventsList?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.getAttribute("data-action");
    const eventId = Number(target.getAttribute("data-event-id"));
    if (!action || !eventId) return;

    try {
      target.setAttribute("disabled", "disabled");
      if (action === "toggle-platform-event") {
        const nextActive = String(target.getAttribute("data-next-active")) === "true";
        await setPlatformEventActive(eventId, nextActive);
      }
      if (action === "delete-platform-event") {
        const confirmed = window.confirm(`Delete event #${eventId}? This cannot be undone.`);
        if (!confirmed) return;
        await deletePlatformEvent(eventId);
      }
      await loadPlatformEvents();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update event.");
    } finally {
      target.removeAttribute("disabled");
    }
  });

  eventCreateBtn?.addEventListener("click", async () => {
    try {
      eventCreateBtn.disabled = true;
      await createPlatformEvent();
      await loadPlatformEvents();
      alert("Platform event created.");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to create platform event.");
    } finally {
      eventCreateBtn.disabled = false;
    }
  });

  eventTypeSelect?.addEventListener("change", () => {
    if (!eventNameInput) return;
    if ((eventNameInput.value || "").trim()) return;
    const defaults = getEventDefaults(eventTypeSelect.value);
    eventNameInput.value = defaults.name;
  });

  eventStartBtn?.addEventListener("click", () => openEventDatePicker("start"));
  eventEndBtn?.addEventListener("click", () => openEventDatePicker("end"));
  eventDateModalClose?.addEventListener("click", closeEventDatePicker);
  eventDateModal?.addEventListener("click", (event) => {
    if (event.target === eventDateModal) closeEventDatePicker();
  });

  eventCalPrev?.addEventListener("click", () => {
    pickerState.displayMonth -= 1;
    if (pickerState.displayMonth < 0) {
      pickerState.displayMonth = 11;
      pickerState.displayYear -= 1;
    }
    renderEventCalendar();
  });

  eventCalNext?.addEventListener("click", () => {
    pickerState.displayMonth += 1;
    if (pickerState.displayMonth > 11) {
      pickerState.displayMonth = 0;
      pickerState.displayYear += 1;
    }
    renderEventCalendar();
  });

  eventCalGrid?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.getAttribute("data-action") !== "pick-event-day") return;
    const y = Number(target.getAttribute("data-y"));
    const m = Number(target.getAttribute("data-m"));
    const d = Number(target.getAttribute("data-d"));
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return;
    pickerState.selectedDate = new Date(y, m, d);
    pickerState.displayYear = y;
    pickerState.displayMonth = m;
    renderEventCalendar();
  });

  eventDateApplyBtn?.addEventListener("click", () => {
    if (!(pickerState.selectedDate instanceof Date) || Number.isNaN(pickerState.selectedDate.getTime())) {
      alert("Pick a date first.");
      return;
    }
    const hour = Number(eventCalHour?.value || 0);
    const minute = Number(eventCalMinute?.value || 0);
    const next = new Date(
      pickerState.selectedDate.getFullYear(),
      pickerState.selectedDate.getMonth(),
      pickerState.selectedDate.getDate(),
      Number.isFinite(hour) ? hour : 0,
      Number.isFinite(minute) ? minute : 0,
      0,
      0
    );
    if (pickerState.target === "end") {
      eventEndAt = next;
    } else {
      eventStartAt = next;
    }
    syncEventDateLabels();
    closeEventDatePicker();
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
      syncEventDateLabels();
      const defaults = getEventDefaults(eventTypeSelect?.value || "double_xp_weekend");
      if (eventNameInput && !eventNameInput.value) eventNameInput.value = defaults.name;
      await loadOwnAvatar();
      await loadShopItems();
      await loadAvatarCosmeticItems();
      await loadPlatformEvents();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to load settings.");
    }
  });
})();
