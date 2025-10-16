const STORAGE_KEY = 'attributePreferences';
const BUILT_IN_ATTRIBUTE_VALUES = ['id', 'class'];
const DEFAULT_PREFERENCES = {
  builtInAttributes: ['id'],
  customAttributes: [],
};
const checkboxSelector = 'input[name="attribute"]';

let currentPreferences = normalizePreferences(DEFAULT_PREFERENCES);

function sanitizeAttributeName(name) {
  return typeof name === 'string' ? name.trim() : '';
}

function isValidAttributeFormat(name) {
  return /^[a-zA-Z_][a-zA-Z0-9_\-:.]*$/.test(name);
}

function normalizePreferences(rawPreferences) {
  if (Array.isArray(rawPreferences)) {
    const builtIn = [];
    const custom = [];
    rawPreferences.forEach((entry) => {
      const sanitized = sanitizeAttributeName(entry);
      if (!sanitized) {
        return;
      }
      const lower = sanitized.toLowerCase();
      if (BUILT_IN_ATTRIBUTE_VALUES.includes(lower)) {
        builtIn.push(lower);
        return;
      }
      if (isValidAttributeFormat(lower)) {
        custom.push(lower);
      }
    });

    return {
      builtInAttributes: ensureAtLeastOneBuiltIn(builtIn),
      customAttributes: uniqueCustomAttributes(custom),
    };
  }

  if (!rawPreferences || typeof rawPreferences !== 'object') {
    return {
      builtInAttributes: [...DEFAULT_PREFERENCES.builtInAttributes],
      customAttributes: [...DEFAULT_PREFERENCES.customAttributes],
    };
  }

  const rawBuiltIns = Array.isArray(rawPreferences.builtInAttributes)
    ? rawPreferences.builtInAttributes
    : [];
  const rawCustom = Array.isArray(rawPreferences.customAttributes)
    ? rawPreferences.customAttributes
    : [];

  const builtInAttributes = ensureAtLeastOneBuiltIn(
    rawBuiltIns
      .map((value) => sanitizeAttributeName(value).toLowerCase())
      .filter((value) => BUILT_IN_ATTRIBUTE_VALUES.includes(value))
  );

  const customAttributes = uniqueCustomAttributes(
    rawCustom
      .map((value) => sanitizeAttributeName(value).toLowerCase())
      .filter((value) => value && isValidAttributeFormat(value))
      .filter((value) => !BUILT_IN_ATTRIBUTE_VALUES.includes(value))
  );

  return { builtInAttributes, customAttributes };
}

function uniqueCustomAttributes(attributes) {
  const seen = new Set();
  const result = [];
  attributes.forEach((attribute) => {
    const lower = attribute.toLowerCase();
    if (seen.has(lower)) {
      return;
    }
    seen.add(lower);
    result.push(attribute);
  });
  return result;
}

function ensureAtLeastOneBuiltIn(selectedBuiltIns) {
  const selectedSet = new Set(
    (selectedBuiltIns || []).map((value) => value.toLowerCase()).filter((value) => value)
  );
  const ordered = BUILT_IN_ATTRIBUTE_VALUES.filter((value) => selectedSet.has(value));
  if (ordered.length) {
    return ordered;
  }
  return [...DEFAULT_PREFERENCES.builtInAttributes];
}

function getBuiltInCheckboxes() {
  return Array.from(document.querySelectorAll(checkboxSelector));
}

function renderBuiltInCheckboxes(selectedBuiltIns) {
  const selectedSet = new Set(selectedBuiltIns);
  getBuiltInCheckboxes().forEach((checkbox) => {
    checkbox.checked = selectedSet.has(checkbox.value);
  });
}

function renderCustomAttributes(customAttributes) {
  const list = document.getElementById('custom-attributes-list');
  const emptyState = document.getElementById('custom-attributes-empty-state');
  if (!list || !emptyState) {
    return;
  }

  list.innerHTML = '';

  if (!customAttributes.length) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  customAttributes.forEach((attribute) => {
    const item = document.createElement('li');
    item.className = 'custom-attribute-item';

    const name = document.createElement('span');
    name.className = 'custom-attribute-name';
    name.textContent = attribute;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'custom-attribute-remove';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => removeCustomAttribute(attribute));

    item.appendChild(name);
    item.appendChild(removeButton);
    list.appendChild(item);
  });
}

function showStatusMessage(message) {
  const statusEl = document.getElementById('status');
  if (!statusEl) {
    return;
  }
  statusEl.textContent = message;
  statusEl.classList.add('visible');
  setTimeout(() => {
    statusEl.classList.remove('visible');
  }, 1800);
}

function collectBuiltInSelections() {
  const selected = getBuiltInCheckboxes()
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value)
    .filter((value) => BUILT_IN_ATTRIBUTE_VALUES.includes(value));
  return ensureAtLeastOneBuiltIn(selected);
}

function ensureAtLeastOneBuiltInSelected() {
  const checkboxes = getBuiltInCheckboxes();
  const anyChecked = checkboxes.some((checkbox) => checkbox.checked);
  if (anyChecked) {
    return;
  }
  const fallbackValue = DEFAULT_PREFERENCES.builtInAttributes[0];
  const fallbackCheckbox =
    checkboxes.find((checkbox) => checkbox.value === fallbackValue) || checkboxes[0];
  if (fallbackCheckbox) {
    fallbackCheckbox.checked = true;
  }
  showStatusMessage('Keep at least one built-in attribute selected.');
}

function validateAttributeName(name) {
  const sanitized = sanitizeAttributeName(name);
  if (!sanitized) {
    return { valid: false, reason: 'Enter an attribute name.' };
  }
  const normalized = sanitized.toLowerCase();
  if (!isValidAttributeFormat(normalized)) {
    return {
      valid: false,
      reason: 'Attribute names must start with a letter or underscore and use letters, numbers, "-", "_", ":", or ".".',
    };
  }

  if (BUILT_IN_ATTRIBUTE_VALUES.some((value) => value === normalized)) {
    return { valid: false, reason: 'ID and Class are already available as built-in attributes.' };
  }

  if (currentPreferences.customAttributes.some((attribute) => attribute === normalized)) {
    return { valid: false, reason: 'That attribute is already in your list.' };
  }

  return { valid: true, value: normalized };
}

function persistPreferences(preferences, successMessage = 'Saved!') {
  if (!chrome?.storage?.sync) {
    showStatusMessage('Storage unavailable.');
    return;
  }

  const normalized = normalizePreferences(preferences);
  currentPreferences = normalized;

  chrome.storage.sync.set({ [STORAGE_KEY]: normalized }, () => {
    if (chrome.runtime?.lastError) {
      showStatusMessage('Failed to save, try again.');
      return;
    }
    showStatusMessage(successMessage);
  });
}

function addCustomAttribute(event) {
  event?.preventDefault();
  const input = document.getElementById('custom-attribute-input');
  if (!input) {
    return;
  }

  const validation = validateAttributeName(input.value);
  if (!validation.valid) {
    showStatusMessage(validation.reason);
    input.focus();
    return;
  }

  const updatedPreferences = {
    ...currentPreferences,
    customAttributes: [...currentPreferences.customAttributes, validation.value],
  };

  currentPreferences = normalizePreferences(updatedPreferences);
  renderCustomAttributes(currentPreferences.customAttributes);
  persistPreferences(currentPreferences, 'Added custom attribute.');

  input.value = '';
  input.focus();
}

function removeCustomAttribute(attribute) {
  const lower = attribute.toLowerCase();
  const filtered = currentPreferences.customAttributes.filter(
    (existing) => existing.toLowerCase() !== lower
  );

  if (filtered.length === currentPreferences.customAttributes.length) {
    return;
  }

  currentPreferences = normalizePreferences({
    ...currentPreferences,
    customAttributes: filtered,
  });

  renderCustomAttributes(currentPreferences.customAttributes);
  persistPreferences(currentPreferences, 'Removed custom attribute.');
}

function loadPreferences() {
  if (!chrome?.storage?.sync) {
    currentPreferences = normalizePreferences(DEFAULT_PREFERENCES);
    renderBuiltInCheckboxes(currentPreferences.builtInAttributes);
    renderCustomAttributes(currentPreferences.customAttributes);
    return;
  }

  chrome.storage.sync.get([STORAGE_KEY], (result) => {
    if (chrome.runtime?.lastError) {
      currentPreferences = normalizePreferences(DEFAULT_PREFERENCES);
      showStatusMessage('Using default settings due to a loading error.');
    } else {
      currentPreferences = normalizePreferences(result?.[STORAGE_KEY]);
    }

    renderBuiltInCheckboxes(currentPreferences.builtInAttributes);
    renderCustomAttributes(currentPreferences.customAttributes);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadPreferences();

  const form = document.getElementById('options-form');
  if (form) {
    form.addEventListener('change', (event) => {
      if (!(event.target instanceof HTMLInputElement) || event.target.type !== 'checkbox') {
        return;
      }
      ensureAtLeastOneBuiltInSelected();
    });
  }

  const saveButton = document.getElementById('save-button');
  if (saveButton) {
    saveButton.addEventListener('click', () => {
      const selectedBuiltIns = collectBuiltInSelections();
      currentPreferences = normalizePreferences({
        builtInAttributes: selectedBuiltIns,
        customAttributes: currentPreferences.customAttributes,
      });
      renderBuiltInCheckboxes(currentPreferences.builtInAttributes);
      persistPreferences(currentPreferences, 'Saved!');
    });
  }

  const customAttributeForm = document.getElementById('custom-attribute-form');
  if (customAttributeForm) {
    customAttributeForm.addEventListener('submit', addCustomAttribute);
  }
});
