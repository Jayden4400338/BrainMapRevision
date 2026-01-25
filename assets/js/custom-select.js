// Custom Select Dropdown Component
// Replaces all native select elements with custom styled dropdowns

(function () {
  'use strict';

  /**
   * Initialize custom select for a native select element
   * @param {HTMLSelectElement} selectElement - The native select element
   */
  function initCustomSelect(selectElement) {
    // Skip if already converted
    if (selectElement.dataset.customSelect === 'true') {
      return;
    }

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    wrapper.dataset.selectId = selectElement.id || `select-${Date.now()}`;

    // Create custom select
    const customSelect = document.createElement('div');
    customSelect.className = 'custom-select';
    if (selectElement.disabled) {
      customSelect.classList.add('disabled');
    }

    // Create trigger button
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const triggerText = document.createElement('span');
    triggerText.className = 'custom-select-text';
    triggerText.textContent = selectedOption ? selectedOption.textContent : 'Select...';
    trigger.appendChild(triggerText);

    const triggerIcon = document.createElement('span');
    triggerIcon.className = 'custom-select-icon';
    triggerIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>';
    trigger.appendChild(triggerIcon);

    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'custom-select-dropdown';
    dropdown.setAttribute('role', 'listbox');

    // Create options
    Array.from(selectElement.options).forEach((option, index) => {
      const optionElement = document.createElement('div');
      optionElement.className = 'custom-select-option';
      optionElement.setAttribute('role', 'option');
      optionElement.dataset.value = option.value;
      optionElement.textContent = option.textContent;

      if (option.selected) {
        optionElement.classList.add('selected');
      }

      if (option.disabled) {
        optionElement.classList.add('disabled');
      }

      optionElement.addEventListener('click', () => {
        if (option.disabled) return;

        // Update native select
        selectElement.selectedIndex = index;
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));

        // Update custom select
        dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
          opt.classList.remove('selected');
        });
        optionElement.classList.add('selected');
        triggerText.textContent = option.textContent;
        trigger.setAttribute('aria-expanded', 'false');
        customSelect.classList.remove('open');

        // Close dropdown
        closeAllDropdowns();
      });

      dropdown.appendChild(optionElement);
    });

    customSelect.appendChild(trigger);
    customSelect.appendChild(dropdown);

    // Handle trigger click
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (selectElement.disabled) return;

      const isOpen = customSelect.classList.contains('open');
      closeAllDropdowns();

      if (!isOpen) {
        customSelect.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!customSelect.contains(e.target)) {
        customSelect.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    // Handle keyboard navigation
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        trigger.click();
      } else if (e.key === 'Escape') {
        customSelect.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    // Update when native select changes programmatically
    const updateCustomSelect = () => {
      const selected = selectElement.options[selectElement.selectedIndex];
      if (selected) {
        triggerText.textContent = selected.textContent;
        dropdown.querySelectorAll('.custom-select-option').forEach((opt, idx) => {
          opt.classList.toggle('selected', idx === selectElement.selectedIndex);
        });
      }
    };

    // Listen for change events on native select
    selectElement.addEventListener('change', updateCustomSelect);

    // Watch for option changes
    const observer = new MutationObserver(() => {
      // Rebuild options if they changed
      dropdown.innerHTML = '';
      Array.from(selectElement.options).forEach((option, index) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'custom-select-option';
        optionElement.setAttribute('role', 'option');
        optionElement.dataset.value = option.value;
        optionElement.textContent = option.textContent;

        if (index === selectElement.selectedIndex) {
          optionElement.classList.add('selected');
        }

        if (option.disabled) {
          optionElement.classList.add('disabled');
        }

        optionElement.addEventListener('click', () => {
          if (option.disabled) return;
          selectElement.selectedIndex = index;
          selectElement.dispatchEvent(new Event('change', { bubbles: true }));
          updateCustomSelect();
          closeAllDropdowns();
        });

        dropdown.appendChild(optionElement);
      });
      updateCustomSelect();
    });

    observer.observe(selectElement, {
      childList: true,
      subtree: true,
    });

    // Hide native select but keep it for form submission
    selectElement.style.position = 'absolute';
    selectElement.style.opacity = '0';
    selectElement.style.pointerEvents = 'none';
    selectElement.style.width = '1px';
    selectElement.style.height = '1px';
    selectElement.dataset.customSelect = 'true';

    // Insert custom select
    wrapper.appendChild(selectElement);
    wrapper.appendChild(customSelect);
    selectElement.parentNode.insertBefore(wrapper, selectElement);
    selectElement.parentNode.removeChild(selectElement);
    wrapper.appendChild(selectElement);
  }

  /**
   * Close all open dropdowns
   */
  function closeAllDropdowns() {
    document.querySelectorAll('.custom-select.open').forEach(select => {
      select.classList.remove('open');
      const trigger = select.querySelector('.custom-select-trigger');
      if (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /**
   * Initialize all select elements on page load
   */
  function initAllSelects() {
    document.querySelectorAll('select:not([data-custom-select="true"])').forEach(select => {
      initCustomSelect(select);
    });
  }

  /**
   * Reinitialize selects after dynamic content is added
   */
  function reinitSelects(container = document) {
    container.querySelectorAll('select:not([data-custom-select="true"])').forEach(select => {
      initCustomSelect(select);
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllSelects);
  } else {
    initAllSelects();
  }

  // Expose API for manual initialization
  window.CustomSelect = {
    init: initCustomSelect,
    initAll: initAllSelects,
    reinit: reinitSelects,
  };

  // Watch for dynamically added selects
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          // Check if the added node is a select
          if (node.tagName === 'SELECT') {
            initCustomSelect(node);
          }
          // Check for selects within the added node
          node.querySelectorAll?.('select:not([data-custom-select="true"])').forEach(select => {
            initCustomSelect(select);
          });
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
