(function () {
  const supabase = window.supabaseClient;
  const levelEl = document.getElementById("shopUserLevel");
  const coinsEl = document.getElementById("shopUserCoins");
  const ownedCountEl = document.getElementById("shopOwnedCount");
  const shopGrid = document.getElementById("shopGrid");
  const categoriesWrap = document.getElementById("shopCategories");
  const refreshBtn = document.getElementById("shopRefreshBtn");
  const customThemePanel = document.getElementById("customThemePanel");
  const customThemeStatus = document.getElementById("customThemeStatus");
  const customThemeApplyBtn = document.getElementById("customThemeApplyBtn");
  const customThemeResetBtn = document.getElementById("customThemeResetBtn");
  const customThemeFields = document.getElementById("customThemeFields");
  const customThemeLightTab = document.getElementById("customThemeLightTab");
  const customThemeDarkTab = document.getElementById("customThemeDarkTab");
  const customThemePreviewCard = document.getElementById("customThemePreviewCard");

  const CUSTOM_KEYS = [
    { key: "accentPrimary", label: "Accent Primary" },
    { key: "accentSecondary", label: "Accent Secondary" },
    { key: "textPrimary", label: "Text Primary" },
    { key: "textSecondary", label: "Text Secondary" },
    { key: "bgPrimaryStart", label: "Background Start" },
    { key: "bgPrimaryEnd", label: "Background End" },
    { key: "bgSecondary", label: "Surface Background" },
    { key: "borderColor", label: "Border Color" },
    { key: "cardBg", label: "Card Background" },
    { key: "navBg", label: "Navbar Background" },
  ];

  const SWATCHES = [
    "#0F172A", "#1E293B", "#334155", "#475569", "#64748B", "#94A3B8", "#E2E8F0", "#F8FAFC",
    "#1D4ED8", "#3B82F6", "#60A5FA", "#93C5FD", "#0EA5E9", "#06B6D4", "#10B981", "#22C55E",
    "#F59E0B", "#F97316", "#EF4444", "#EC4899", "#A855F7", "#8B5CF6", "#6366F1", "#FFFFFF",
  ];

  function defaultCustomPalette() {
    return {
      light: {
        accentPrimary: "#3B82F6",
        accentSecondary: "#60A5FA",
        textPrimary: "#0F172A",
        textSecondary: "#64748B",
        bgPrimaryStart: "#F0F9FF",
        bgPrimaryEnd: "#E0F2FE",
        bgSecondary: "#FFFFFF",
        borderColor: "#E2E8F0",
        cardBg: "#FFFFFF",
        navBg: "#FFFFFF",
      },
      dark: {
        accentPrimary: "#60A5FA",
        accentSecondary: "#93C5FD",
        textPrimary: "#F8FAFC",
        textSecondary: "#94A3B8",
        bgPrimaryStart: "#0F172A",
        bgPrimaryEnd: "#1E293B",
        bgSecondary: "#1E293B",
        borderColor: "#334155",
        cardBg: "#1E293B",
        navBg: "#1E293B",
      },
    };
  }

  function normalizeHex(value, fallback) {
    if (!value) return fallback;
    const color = String(value).trim().toUpperCase();
    return /^#[0-9A-F]{6}$/.test(color) ? color : fallback;
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function normalizeThemeName(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/\s+theme$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normalizeStoredPalette(raw) {
    const defaults = defaultCustomPalette();
    if (!raw || typeof raw !== "object") return defaults;

    if (!raw.light || !raw.dark) {
      const migrated = deepClone(defaults);
      for (const entry of CUSTOM_KEYS) {
        migrated.light[entry.key] = normalizeHex(raw[entry.key], migrated.light[entry.key]);
      }
      return migrated;
    }

    const normalized = deepClone(defaults);
    for (const mode of ["light", "dark"]) {
      for (const entry of CUSTOM_KEYS) {
        normalized[mode][entry.key] = normalizeHex(raw[mode]?.[entry.key], normalized[mode][entry.key]);
      }
    }
    return normalized;
  }

  let currentUser = null;
  let profile = null;
  let items = [];
  let inventory = [];
  let activeFilter = "all";
  let customMode = "light";
  let customPalette = defaultCustomPalette();

  function formatCategory(category) {
    const map = {
      theme: "Theme",
      hint_pack: "Hint Pack",
      power_up: "Power-Up",
      cosmetic: "Cosmetic",
    };
    return map[category] || category;
  }

  function getCosmeticType(item) {
    return String(item?.properties?.type || "").toLowerCase();
  }

  function getInventoryRecord(itemId) {
    return inventory.find((record) => Number(record.item_id) === Number(itemId)) || null;
  }

  function isCustomCreatorItem(item) {
    return (
      item &&
      item.category === "theme" &&
      (normalizeThemeName(item.name) === "custom-theme-creator" ||
        String(item.properties?.type || "").toLowerCase() === "creator")
    );
  }

  function getCustomCreatorItem() {
    return items.find((item) => isCustomCreatorItem(item)) || null;
  }

  function isCustomCreatorOwned() {
    const creatorItem = getCustomCreatorItem();
    return !!(creatorItem && getInventoryRecord(creatorItem.id));
  }

  function isCustomCreatorEquipped() {
    const creatorItem = getCustomCreatorItem();
    const record = creatorItem ? getInventoryRecord(creatorItem.id) : null;
    return !!record?.is_equipped;
  }

  function renderStats() {
    if (levelEl) levelEl.textContent = String(profile?.level ?? "-");
    if (coinsEl) coinsEl.textContent = String(profile?.brain_coins ?? "-");
    if (ownedCountEl) ownedCountEl.textContent = String(inventory.length);
  }

  function themePreviewStyle(item) {
    if (isCustomCreatorItem(item)) {
      const p = customPalette?.[customMode];
      return `background: linear-gradient(135deg, ${p.accentPrimary}, ${p.accentSecondary});`;
    }
    const colors = item.properties?.colors;
    if (!colors?.primary || !colors?.secondary) return "background: var(--card-bg);";
    return `background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});`;
  }

  function renderCard(item) {
    const owned = !!getInventoryRecord(item.id);
    const inventoryRecord = getInventoryRecord(item.id);
    const isEquipped = !!inventoryRecord?.is_equipped;
    const canAfford = Number(profile?.brain_coins || 0) >= Number(item.price || 0);
    const levelOkay = Number(profile?.level || 0) >= Number(item.min_level || 0);
    const locked = !levelOkay;
    const disabledBuy = owned || locked || !canAfford;

    let status = "";
    let action = "";

    if (owned) {
      if (item.category === "theme") {
        if (isCustomCreatorItem(item)) {
          if (isEquipped) {
            status = '<div class="shop-item-status success">Custom Theme Creator equipped</div>';
            action = '<button data-action="customize">Customize Colors</button>';
          } else {
            status = '<div class="shop-item-status">Owned</div>';
            action = '<button class="btn-primary" data-action="equip">Equip Theme</button>';
          }
        } else if (isEquipped) {
          status = '<div class="shop-item-status success">Equipped</div>';
          action = "<button disabled>Equipped</button>";
        } else {
          status = '<div class="shop-item-status">Owned</div>';
          action = '<button class="btn-primary" data-action="equip">Equip Theme</button>';
        }
      } else if (item.category === "cosmetic") {
        const cosmeticType = getCosmeticType(item);
        if (isEquipped) {
          status = `<div class="shop-item-status success">Equipped ${cosmeticType ? `(${cosmeticType})` : ""}</div>`;
          action = "<button disabled>Equipped</button>";
        } else {
          status = '<div class="shop-item-status">Owned</div>';
          action = '<button class="btn-primary" data-action="equip-cosmetic">Equip Cosmetic</button>';
        }
      } else {
        status = '<div class="shop-item-status success">Owned</div>';
        action = "<button disabled>Owned</button>";
      }
    } else if (locked) {
      status = `<div class="shop-item-status warning">Unlocks at level ${item.min_level}</div>`;
      action = `<button disabled>Level ${item.min_level} Required</button>`;
    } else {
      status = canAfford
        ? '<div class="shop-item-status">Ready to purchase</div>'
        : '<div class="shop-item-status warning">Not enough coins</div>';
      action = `<button data-action="buy" ${disabledBuy ? "disabled" : ""}>Buy for ${item.price}</button>`;
    }

    const preview =
      item.category === "theme"
        ? `<div class="shop-item-theme-preview" style="${themePreviewStyle(item)}"></div>`
        : "";
    const imagePreview =
      item.category === "cosmetic" && item.image_url
        ? `<img class="shop-item-image-preview" src="${item.image_url}" alt="${item.name}" loading="lazy" />`
        : "";

    return `
      <article class="shop-item" data-item-id="${item.id}">
        <div class="shop-item-header">
          <div class="shop-item-title">${item.name}</div>
          <div class="shop-category-badge">${formatCategory(item.category)}</div>
        </div>
        <div class="shop-item-desc">${item.description || ""}</div>
        ${preview}
        ${imagePreview}
        <div class="shop-item-meta">
          <span>Price: ${item.price} coins</span>
          <span>Min lvl: ${item.min_level}</span>
        </div>
        ${status}
        <div class="shop-item-actions">${action}</div>
      </article>
    `;
  }

  function renderShop() {
    const filtered =
      activeFilter === "all" ? items : items.filter((item) => item.category === activeFilter);

    if (!filtered.length) {
      shopGrid.innerHTML = '<div class="shop-empty">No items found in this category.</div>';
      return;
    }

    shopGrid.innerHTML = filtered.map(renderCard).join("");
  }

  async function loadCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      window.location.href = "../auth/login.html";
      return false;
    }
    currentUser = user;
    return true;
  }

  async function loadProfile() {
    const { data, error } = await supabase
      .from("users")
      .select("id, level, brain_coins")
      .eq("id", currentUser.id)
      .single();
    if (error) throw error;
    profile = data;
  }

  async function loadItems() {
    const { data, error } = await supabase
      .from("shop_items")
      .select("id, name, description, category, price, min_level, image_url, properties, is_active")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("price", { ascending: true });
    if (error) throw error;
    items = Array.isArray(data) ? data : [];
  }

  async function loadInventory() {
    const { data, error } = await supabase
      .from("user_inventory")
      .select("item_id, is_equipped, purchased_at")
      .eq("user_id", currentUser.id);
    if (error) throw error;
    inventory = Array.isArray(data) ? data : [];
  }

  function renderCustomFields() {
    if (!customThemeFields) return;
    const modePalette = customPalette[customMode];
    customThemeFields.innerHTML = CUSTOM_KEYS.map((entry) => {
      const value = modePalette[entry.key];
      const swatches = SWATCHES.map((color) => {
        return `<button class="shop-custom-swatch" data-action="set-swatch" data-key="${entry.key}" data-color="${color}" style="background:${color};" type="button"></button>`;
      }).join("");

      return `
        <div class="shop-custom-field" data-key="${entry.key}">
          <div class="shop-custom-field-title">${entry.label}</div>
          <div class="shop-custom-color-row">
            <button class="shop-custom-color-preview" data-action="focus-input" data-key="${entry.key}" type="button" style="background:${value};"></button>
            <input class="shop-custom-color-input" data-key="${entry.key}" value="${value}" maxlength="7" />
            <button class="shop-custom-swatches-btn" type="button">Swatches</button>
          </div>
          <div class="shop-custom-swatches is-hidden">${swatches}</div>
        </div>
      `;
    }).join("");
  }

  function updateCustomPreview() {
    if (!customThemePreviewCard) return;
    const p = customPalette[customMode];
    customThemePreviewCard.style.background = p.cardBg;
    customThemePreviewCard.style.borderColor = p.borderColor;
    customThemePreviewCard.style.color = p.textPrimary;
    customThemePreviewCard.style.setProperty("--accent-gradient", `linear-gradient(135deg, ${p.accentPrimary} 0%, ${p.accentSecondary} 100%)`);

    const pText = customThemePreviewCard.querySelector("p");
    if (pText) pText.style.color = p.textSecondary;

    const btn = customThemePreviewCard.querySelector("button");
    if (btn) btn.style.background = `linear-gradient(135deg, ${p.accentPrimary} 0%, ${p.accentSecondary} 100%)`;
  }

  function setCustomMode(mode) {
    customMode = mode === "dark" ? "dark" : "light";
    customThemeLightTab?.classList.toggle("is-active", customMode === "light");
    customThemeDarkTab?.classList.toggle("is-active", customMode === "dark");
    renderCustomFields();
    updateCustomPreview();
  }

  async function updateCustomThemePanel() {
    if (!customThemePanel) return;
    const creatorItem = getCustomCreatorItem();
    if (!creatorItem) {
      customThemePanel.style.display = "none";
      return;
    }

    customThemePanel.style.display = "block";
    const stored = normalizeStoredPalette(window.getStoredCustomThemePalette?.());
    customPalette = stored;
    setCustomMode(customMode);

    const owned = isCustomCreatorOwned();
    const equipped = isCustomCreatorEquipped();
    if (!owned) {
      customThemeStatus.textContent = "Buy Custom Theme Creator in Themes to unlock full color editing.";
      customThemeApplyBtn.disabled = true;
      customThemeResetBtn.disabled = true;
      return;
    }

    customThemeApplyBtn.disabled = false;
    customThemeResetBtn.disabled = false;
    customThemeStatus.textContent = equipped
      ? "Custom Theme Creator equipped. Edit Light and Dark palettes."
      : "Custom Theme Creator owned. Equip it in Themes first, then apply your palettes.";
  }

  async function refreshAll() {
    await loadProfile();
    await loadItems();
    await loadInventory();
    renderStats();
    renderShop();
    await updateCustomThemePanel();
  }

  function applyThemeForItem(item) {
    if (!item || item.category !== "theme") return;
    const byNameApplied = window.applyNamedTheme?.(item.name, true);
    if (!byNameApplied && item.properties?.colors?.primary && item.properties?.colors?.secondary) {
      window.applyThemeColors?.(
        item.properties.colors.primary,
        item.properties.colors.secondary,
        item.name,
        true
      );
    }
  }

  async function handlePurchase(item) {
    const { data, error } = await supabase.rpc("shop_purchase_item", {
      target_item_id: item.id,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : null;
    if (row && !row.success) throw new Error(row.message || "Purchase failed.");
    await refreshAll();
  }

  async function handleEquip(item) {
    const { error } = await supabase.rpc("shop_equip_theme", {
      target_item_id: item.id,
    });
    if (error) throw error;
    applyThemeForItem(item);
    await refreshAll();
  }

  async function handleEquipCosmetic(item) {
    const { error } = await supabase.rpc("shop_equip_cosmetic", {
      target_item_id: item.id,
    });
    if (error) throw error;
    await refreshAll();
    if (window.loadNavbarProfile) {
      await window.loadNavbarProfile();
    }
  }

  categoriesWrap?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const filter = target.getAttribute("data-filter");
    if (!filter) return;
    activeFilter = filter;
    categoriesWrap.querySelectorAll("button").forEach((btn) => btn.classList.remove("is-active"));
    target.classList.add("is-active");
    renderShop();
  });

  refreshBtn?.addEventListener("click", () => {
    refreshAll().catch((err) => {
      console.error(err);
      alert(err.message || "Failed to refresh shop.");
    });
  });

  customThemeLightTab?.addEventListener("click", () => setCustomMode("light"));
  customThemeDarkTab?.addEventListener("click", () => setCustomMode("dark"));

  customThemeFields?.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.classList.contains("shop-custom-color-input")) return;
    const key = target.dataset.key;
    if (!key) return;
    const fallback = customPalette[customMode][key];
    const normalized = normalizeHex(target.value, fallback);
    target.classList.toggle("is-invalid", normalized !== target.value.toUpperCase());
    customPalette[customMode][key] = normalized;
    const previewBtn = customThemeFields.querySelector(`.shop-custom-color-preview[data-key="${key}"]`);
    if (previewBtn) previewBtn.style.background = normalized;
    updateCustomPreview();
  });

  customThemeFields?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.getAttribute("data-action");
    const key = target.getAttribute("data-key");

    if (target.classList.contains("shop-custom-swatches-btn")) {
      const field = target.closest(".shop-custom-field");
      const swatchWrap = field?.querySelector(".shop-custom-swatches");
      if (swatchWrap) swatchWrap.classList.toggle("is-hidden");
      return;
    }

    if (!key) return;

    if (action === "focus-input") {
      const input = customThemeFields.querySelector(`.shop-custom-color-input[data-key="${key}"]`);
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }

    if (action === "set-swatch") {
      const color = target.getAttribute("data-color");
      if (!color) return;
      customPalette[customMode][key] = color;
      const input = customThemeFields.querySelector(`.shop-custom-color-input[data-key="${key}"]`);
      const previewBtn = customThemeFields.querySelector(`.shop-custom-color-preview[data-key="${key}"]`);
      if (input instanceof HTMLInputElement) {
        input.value = color;
        input.classList.remove("is-invalid");
      }
      if (previewBtn) previewBtn.style.background = color;
      updateCustomPreview();
    }
  });

  document.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.getAttribute("data-action");
    if (!action) return;

    const card = target.closest("[data-item-id]");
    const itemId = Number(card?.getAttribute("data-item-id"));
    if (!itemId) return;
    const item = items.find((entry) => Number(entry.id) === itemId);
    if (!item) return;

    try {
      target.setAttribute("disabled", "disabled");
      if (action === "buy") await handlePurchase(item);
      if (action === "equip") await handleEquip(item);
      if (action === "equip-cosmetic") await handleEquipCosmetic(item);
      if (action === "customize") {
        customThemePanel?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Shop action failed.");
    } finally {
      target.removeAttribute("disabled");
    }
  });

  customThemeApplyBtn?.addEventListener("click", async () => {
    try {
      const creatorItem = getCustomCreatorItem();
      if (!creatorItem || !isCustomCreatorOwned()) {
        alert("Buy Custom Theme Creator first.");
        return;
      }

      if (!isCustomCreatorEquipped()) {
        await handleEquip(creatorItem);
      }

      window.applyCustomThemePalette?.(customPalette, true);
      customThemeStatus.textContent = "Custom Light/Dark palettes applied.";
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to apply custom theme.");
    }
  });

  customThemeResetBtn?.addEventListener("click", () => {
    customPalette = defaultCustomPalette();
    setCustomMode(customMode);
    window.applyCustomThemePalette?.(customPalette, true);
    customThemeStatus.textContent = "Custom theme reset to defaults.";
  });

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      if (!(await loadCurrentUser())) return;
      await refreshAll();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to load shop.");
    }
  });
})();
