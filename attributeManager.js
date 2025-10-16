const STORAGE_KEY = 'attributePreferences';
const BUILT_IN_ATTRIBUTE_VALUES = ['id', 'class'];
const DEFAULT_PREFERENCES = {
  builtInAttributes: ['id'],
  customAttributes: [],
};

function sanitizeAttributeName(name) {
  return typeof name === 'string' ? name.trim() : '';
}

function isValidAttributeFormat(name) {
  return /^[a-zA-Z_][a-zA-Z0-9_\-:.]*$/.test(name);
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

function ensureBuiltInSelection(selectedBuiltIns) {
  const selectedSet = new Set(
    Array.isArray(selectedBuiltIns)
      ? selectedBuiltIns.map((value) => value.toLowerCase()).filter(Boolean)
      : []
  );
  const ordered = BUILT_IN_ATTRIBUTE_VALUES.filter((value) => selectedSet.has(value));
  if (ordered.length) {
    return ordered;
  }
  return [...DEFAULT_PREFERENCES.builtInAttributes];
}

function normalizeStoredPreferences(rawPreferences) {
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
      builtInAttributes: ensureBuiltInSelection(builtIn),
      customAttributes: uniqueCustomAttributes(custom),
    };
  }

  if (rawPreferences && typeof rawPreferences === 'object') {
    const rawBuiltIns = Array.isArray(rawPreferences.builtInAttributes)
      ? rawPreferences.builtInAttributes
      : [];
    const rawCustom = Array.isArray(rawPreferences.customAttributes)
      ? rawPreferences.customAttributes
      : [];

    const builtIn = ensureBuiltInSelection(
      rawBuiltIns
        .map((value) => sanitizeAttributeName(value).toLowerCase())
        .filter((value) => BUILT_IN_ATTRIBUTE_VALUES.includes(value))
    );

    const custom = uniqueCustomAttributes(
      rawCustom
        .map((value) => sanitizeAttributeName(value).toLowerCase())
        .filter((value) => value && isValidAttributeFormat(value))
        .filter((value) => !BUILT_IN_ATTRIBUTE_VALUES.includes(value))
    );

    return { builtInAttributes: builtIn, customAttributes: custom };
  }

  return {
    builtInAttributes: [...DEFAULT_PREFERENCES.builtInAttributes],
    customAttributes: [...DEFAULT_PREFERENCES.customAttributes],
  };
}

function buildPriorityList(preferences) {
  const normalized = normalizeStoredPreferences(preferences);
  const builtIn = normalized.builtInAttributes || [];
  const seen = new Set(builtIn.map((value) => value.toLowerCase()));
  const priority = [...builtIn];

  (normalized.customAttributes || []).forEach((attribute) => {
    const sanitized = sanitizeAttributeName(attribute);
    if (!sanitized || !isValidAttributeFormat(sanitized)) {
      return;
    }
    const lower = sanitized.toLowerCase();
    if (seen.has(lower)) {
      return;
    }
    seen.add(lower);
    priority.push(sanitized);
  });

  return priority.length ? priority : [...DEFAULT_PREFERENCES.builtInAttributes];
}

function cssEscape(value) {
  if (typeof value !== 'string') {
    return '';
  }
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

function escapeAttributeValue(value) {
  return typeof value === 'string' ? value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') : '';
}

export function createAttributeManager({
  defaults = DEFAULT_PREFERENCES,
  storage = typeof chrome !== 'undefined' ? chrome.storage?.sync : null,
  storageKey = STORAGE_KEY,
} = {}) {
  let attributePriority = buildPriorityList(defaults);

  function updateActiveAttributes(preferences) {
    attributePriority = buildPriorityList(preferences);
    return attributePriority;
  }

  function getAttributeMatch(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    for (const attribute of attributePriority) {
      let value = null;
      if (attribute === 'id') {
        value = element.id?.trim() || null;
      } else if (attribute === 'class') {
        const className = Array.from(element.classList || []).find(Boolean);
        value = className || null;
      } else {
        const raw = element.getAttribute(attribute);
        value = raw?.trim() || null;
      }

      if (value) {
        return { attribute, value };
      }
    }
    return null;
  }

  function buildSelectorFromMatch(match) {
    if (!match) {
      return null;
    }
    const { attribute, value } = match;
    if (!attribute || !value) {
      return null;
    }

    if (attribute === 'id') {
      return `#${cssEscape(value)}`;
    }

    if (attribute === 'class') {
      return `.${cssEscape(value)}`;
    }

    return `[${attribute}="${escapeAttributeValue(value)}"]`;
  }

  function getSelectorDetails(element) {
    const match = getAttributeMatch(element);
    if (!match) {
      return null;
    }

    return {
      element,
      attribute: match.attribute,
      value: match.value,
      selector: buildSelectorFromMatch(match),
    };
  }

  function findElementBySelector(element) {
    let current = element instanceof Element ? element : null;
    while (current) {
      const details = getSelectorDetails(current);
      if (details && details.selector) {
        return details;
      }
      current = current.parentElement;
    }
    return null;
  }

  function refreshFromStorage(onUpdate) {
    if (!storage) {
      const priority = updateActiveAttributes(defaults);
      onUpdate?.(priority, defaults);
      return;
    }

    storage.get([storageKey], (result) => {
      let preferences = defaults;
      if (!chrome?.runtime?.lastError) {
        preferences = result?.[storageKey] ?? defaults;
      }

      const priority = updateActiveAttributes(preferences);
      onUpdate?.(priority, preferences);
    });
  }

  function handleStorageChange(changes, areaName, onUpdate) {
    if (areaName !== 'sync' || !changes || !changes[storageKey]) {
      return;
    }

    const preferences = changes[storageKey].newValue;
    const priority = updateActiveAttributes(preferences);
    onUpdate?.(priority, preferences);
  }

  function getAttributePriority() {
    return [...attributePriority];
  }

  return {
    updateActiveAttributes,
    getSelectorDetails,
    findElementBySelector,
    refreshFromStorage,
    handleStorageChange,
    getAttributePriority,
  };
}

export { STORAGE_KEY, BUILT_IN_ATTRIBUTE_VALUES, DEFAULT_PREFERENCES };
