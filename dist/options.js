const DEFAULT_ATTRIBUTES = ['id'];

const checkboxSelector = 'input[name="attribute"]';

function getCheckboxes() {
  return Array.from(document.querySelectorAll(checkboxSelector));
}

function setCheckboxStates(activeAttributes) {
  const activeSet = new Set(activeAttributes);
  getCheckboxes().forEach((checkbox) => {
    checkbox.checked = activeSet.has(checkbox.value);
  });
}

function collectSelectedAttributes() {
  const selected = getCheckboxes()
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);
  return selected.length ? selected : [...DEFAULT_ATTRIBUTES];
}

function ensureAtLeastOneSelected() {
  const checkboxes = getCheckboxes();
  const anyChecked = checkboxes.some((checkbox) => checkbox.checked);
  if (!anyChecked) {
    const defaultCheckbox =
      checkboxes.find((checkbox) => checkbox.value === DEFAULT_ATTRIBUTES[0]) || checkboxes[0];
    if (defaultCheckbox) {
      defaultCheckbox.checked = true;
      showStatusMessage('Keeping at least one attribute selected');
    }
  }
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

function loadSettings() {
  chrome.storage.sync.get(['attributePreferences'], (result) => {
    const attributes = Array.isArray(result.attributePreferences) && result.attributePreferences.length
      ? result.attributePreferences
      : [...DEFAULT_ATTRIBUTES];
    setCheckboxStates(attributes);
  });
}

function saveSettings(selectedAttributes) {
  chrome.storage.sync.set({ attributePreferences: selectedAttributes }, () => {
    if (chrome.runtime.lastError) {
      showStatusMessage('Failed to save, try again');
      return;
    }
    showStatusMessage('Saved!');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  const form = document.getElementById('options-form');
  if (form) {
    form.addEventListener('change', (event) => {
      if (!(event.target instanceof HTMLInputElement) || event.target.type !== 'checkbox') {
        return;
      }
      ensureAtLeastOneSelected();
    });
  }

  const saveButton = document.getElementById('save-button');
  if (saveButton) {
    saveButton.addEventListener('click', () => {
      const selectedAttributes = collectSelectedAttributes();
      setCheckboxStates(selectedAttributes);
      saveSettings(selectedAttributes);
    });
  }
});
