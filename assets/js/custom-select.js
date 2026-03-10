/**
 * Custom select component - replaces native <select> with fully styled dropdown.
 * Keeps original select in sync for form submission and change events.
 */
(function () {
  const ESC = 27;

  function initCustomSelect(selectEl) {
    if (!selectEl || selectEl.tagName !== "SELECT" || selectEl.dataset.customSelect === "true") return;

    selectEl.dataset.customSelect = "true";
    const wrapper = document.createElement("div");
    wrapper.className = "custom-select" + (selectEl.classList.contains("admin-inline-select") ? " admin-inline-select" : "");
    selectEl.parentNode.insertBefore(wrapper, selectEl);
    wrapper.appendChild(selectEl);

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "custom-select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    wrapper.insertBefore(trigger, selectEl);

    const dropdown = document.createElement("div");
    dropdown.className = "custom-select-dropdown";
    dropdown.setAttribute("role", "listbox");
    dropdown.setAttribute("tabindex", "-1");
    wrapper.insertBefore(dropdown, selectEl);

    selectEl.style.position = "absolute";
    selectEl.style.opacity = "0";
    selectEl.style.pointerEvents = "none";
    selectEl.style.width = "0";
    selectEl.style.height = "0";
    selectEl.style.minHeight = "0";
    selectEl.setAttribute("aria-hidden", "true");
    selectEl.tabIndex = -1;

    function getSelectedText() {
      const opt = selectEl.options[selectEl.selectedIndex];
      return opt ? opt.textContent.trim() : "";
    }

    function buildOptions() {
      dropdown.innerHTML = "";
      for (let i = 0; i < selectEl.options.length; i++) {
        const opt = selectEl.options[i];
        const item = document.createElement("div");
        item.className = "custom-select-option";
        item.setAttribute("role", "option");
        item.setAttribute("tabindex", opt.disabled ? "-1" : "0");
        item.dataset.index = String(i);
        item.textContent = opt.textContent.trim();
        if (opt.value === selectEl.value) item.classList.add("selected");
        if (opt.disabled) item.classList.add("disabled");
        dropdown.appendChild(item);
      }
    }

    function syncTrigger() {
      const text = getSelectedText() || (selectEl.getAttribute("placeholder") || selectEl.dataset.placeholder || "Choose...");
      trigger.textContent = text;
      trigger.setAttribute("title", text);
      buildOptions();
    }

    function open() {
      if (selectEl.disabled) return;
      document.querySelectorAll(".custom-select.is-open").forEach((s) => s.classList.remove("is-open"));
      wrapper.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
      buildOptions();
      const selected = dropdown.querySelector(".custom-select-option.selected");
      const first = dropdown.querySelector(".custom-select-option:not(.disabled)");
      const toFocus = selected || first;
      if (toFocus) {
        toFocus.focus();
        toFocus.scrollIntoView({ block: "nearest" });
      }
    }

    function close() {
      wrapper.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    }

    function selectIndex(index) {
      if (index < 0 || index >= selectEl.options.length) return;
      const opt = selectEl.options[index];
      if (opt.disabled) return;
      selectEl.selectedIndex = index;
      syncTrigger();
      close();
      selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    }

    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (wrapper.classList.contains("is-open")) close();
      else open();
    });

    dropdown.addEventListener("click", (e) => {
      const item = e.target.closest(".custom-select-option:not(.disabled)");
      if (item) selectIndex(Number(item.dataset.index));
    });

    document.addEventListener("click", (e) => {
      if (!wrapper.contains(e.target)) close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.keyCode === ESC) close();
    });

    trigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (wrapper.classList.contains("is-open")) close();
        else open();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        open();
      }
    });

    dropdown.addEventListener("keydown", (e) => {
      const opts = dropdown.querySelectorAll(".custom-select-option:not(.disabled)");
      const idx = Array.from(opts).findIndex((o) => o === document.activeElement);
      if (e.key === "ArrowDown" && idx < opts.length - 1) opts[idx + 1].focus();
      else if (e.key === "ArrowUp" && idx > 0) opts[idx - 1].focus();
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (idx >= 0) selectIndex(Number(opts[idx].dataset.index));
      }
      else if (e.key === "Escape") close();
    });

    function syncDisabled() {
      trigger.disabled = selectEl.disabled;
      wrapper.classList.toggle("is-disabled", selectEl.disabled);
    }

    const observer = new MutationObserver(() => {
      syncTrigger();
      syncDisabled();
    });
    observer.observe(selectEl, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });

    syncDisabled();
    syncTrigger();
  }

  function initAll(scope) {
    const root = scope || document;
    root.querySelectorAll("select:not([data-custom-select=true])").forEach(initCustomSelect);
  }

  window.initCustomSelects = function (scope) {
    if (scope) initAll(scope);
    else initScoped();
  };

  function initScoped() {
    [".admin-shell", ".poetry-container", ".admin-event-modal"].forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) initAll(el);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initScoped);
  } else {
    initScoped();
  }
})();
