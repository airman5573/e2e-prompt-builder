import { createAttributeManager } from './attributeManager.js';
import {
  initializeOverlayStyles,
  ensureHighlightOverlay,
  updateHighlightOverlayPosition,
  removeHighlightOverlay,
} from './overlayManager.js';
import {
  ensureModalElements,
  getModalTextarea,
  getCopyButton,
  showModalUI,
  hideModalUI,
} from './modalUI.js';
import { showSnackbar } from './snackbar.js';

let inspectorEnabled = false;
let lastMousePosition = null;
let modalOpenMousePosition = null;
let mouseIntentDetector = null;
const attributeManager = createAttributeManager();

const state = {
  mode: 'highlight',
  currentElement: null,
  currentSelector: null,
  currentAttribute: null,
  promptText: '',
  currentStepNumber: 1,
  isModalOpen: false,
  caretPosition: 0,
};

const mouseIntentDetectorPromise = import(chrome.runtime.getURL('mouseIntentDetector.js'))
  .then((module) => {
    const DetectorClass = module?.default ?? module.MouseIntentDetector ?? module;
    if (typeof DetectorClass !== 'function') {
      throw new TypeError('MouseIntentDetector module did not provide a constructor.');
    }
    mouseIntentDetector = new DetectorClass({ distanceThreshold: 280 });
    return mouseIntentDetector;
  })
  .catch((error) => {
    console.warn('[E2E Prompt Builder] Failed to load MouseIntentDetector', error);
    mouseIntentDetector = null;
    return null;
  });

function ensureMouseIntentDetector() {
  return mouseIntentDetectorPromise;
}

function ensureCurrentElement() {
  if (state.currentElement && document.contains(state.currentElement)) {
    return state.currentElement;
  }
  state.currentElement = null;
  state.currentSelector = null;
  state.currentAttribute = null;
  return null;
}

function handleAttributePriorityUpdate() {
  const activeElement = ensureCurrentElement();
  if (!activeElement) {
    removeHighlightOverlay();
    return;
  }

  const details = attributeManager.getSelectorDetails(activeElement);
  if (details) {
    highlightElement(details.element, details);
    return;
  }

  removeHighlightOverlay();
  state.currentElement = null;
  state.currentSelector = null;
  state.currentAttribute = null;
}

function refreshAttributesFromStorage() {
  attributeManager.refreshFromStorage(() => {
    handleAttributePriorityUpdate();
  });
}

refreshAttributesFromStorage();

if (chrome?.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    attributeManager.handleStorageChange(changes, areaName, () => {
      handleAttributePriorityUpdate();
    });
  });
}

let modalListenersAttached = false;

function ensureModalInitialized() {
  const overlay = ensureModalElements();
  const textarea = getModalTextarea();
  const copyButton = getCopyButton();

  if (!modalListenersAttached && textarea && copyButton) {
    textarea.addEventListener('keydown', handleTextareaKeyDown);
    textarea.addEventListener('input', handleTextareaInput);
    textarea.addEventListener('click', handleTextareaSelectionUpdate);
    textarea.addEventListener('keyup', handleTextareaSelectionUpdate);

    copyButton.addEventListener('click', handleCopyButtonClick);

    modalListenersAttached = true;
  }

  return { overlay, textarea, copyButton };
}

function trackMousePosition(event) {
  if (!event || typeof event.clientX !== 'number' || typeof event.clientY !== 'number') {
    return;
  }

  lastMousePosition = {
    x: event.clientX,
    y: event.clientY,
  };
}

function handleModalMouseMove(event) {
  if (!state.isModalOpen) {
    return;
  }

  if (!mouseIntentDetector) {
    ensureMouseIntentDetector();
    if (!modalOpenMousePosition && typeof event.clientX === 'number' && typeof event.clientY === 'number') {
      modalOpenMousePosition = { x: event.clientX, y: event.clientY };
    }
    return;
  }

  if (!modalOpenMousePosition && typeof event.clientX === 'number' && typeof event.clientY === 'number') {
    modalOpenMousePosition = { x: event.clientX, y: event.clientY };
    const modalElement = document.querySelector('#e2e-prompt-modal');
    if (modalElement) {
      try {
        mouseIntentDetector.stopTracking();
        mouseIntentDetector.startTracking(modalElement, modalOpenMousePosition);
      } catch (error) {
        console.warn('[E2E Prompt Builder] Failed to start detector on first move', error);
      }
    }
    return;
  }

  const result = mouseIntentDetector.evaluate(event);
  if (!result || !result.shouldClose) {
    return;
  }

  document.removeEventListener('mousemove', handleModalMouseMove, true);
  modalOpenMousePosition = null;
  try {
    mouseIntentDetector.stopTracking();
  } catch (error) {
    console.warn('[E2E Prompt Builder] Failed to stop detector', error);
  }
  handleEscape();
}

function highlightElement(element, selectorDetails) {
  if (!element || state.mode !== 'highlight') {
    return;
  }

  const details = selectorDetails || attributeManager.getSelectorDetails(element);
  if (!details || !details.selector) {
    return;
  }

  state.currentElement = element;
  state.currentSelector = details.selector;
  state.currentAttribute = details.attribute;

  ensureHighlightOverlay();
  updateHighlightOverlayPosition(element);

  if (typeof element.scrollIntoView === 'function') {
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

    window.setTimeout(() => {
      if (state.currentElement === element) {
        updateHighlightOverlayPosition(element);
      }
    }, 300);
  }
}

function navigateToParent() {
  const activeElement = ensureCurrentElement();
  if (!activeElement) {
    return;
  }

  let parent = activeElement.parentElement;
  while (parent) {
    const details = attributeManager.getSelectorDetails(parent);
    if (details) {
      highlightElement(parent, details);
      return;
    }
    parent = parent.parentElement;
  }

  showSnackbar('⚠️ 사용할 수 있는 상위 요소가 없습니다', 1200, '#ff9800');
}

function navigateToChild() {
  const activeElement = ensureCurrentElement();
  if (!activeElement) {
    return;
  }

  const findChildWithMatch = (element) => {
    for (const child of element.children) {
      const details = attributeManager.getSelectorDetails(child);
      if (details) {
        return details;
      }
      const found = findChildWithMatch(child);
      if (found) {
        return found;
      }
    }
    return null;
  };

  const childDetails = findChildWithMatch(activeElement);
  if (childDetails) {
    highlightElement(childDetails.element, childDetails);
  } else {
    showSnackbar('⚠️ 사용할 수 있는 하위 요소가 없습니다', 1200, '#ff9800');
  }
}

function insertAt(text, index, value) {
  const safeIndex = Math.min(Math.max(index, 0), text.length);
  return text.slice(0, safeIndex) + value + text.slice(safeIndex);
}

function openModal(openEvent) {
  const elementForPrompt = ensureCurrentElement();
  if (!elementForPrompt) {
    showSnackbar('⚠️ 선택된 요소가 없습니다');
    return;
  }

  const details = attributeManager.getSelectorDetails(elementForPrompt);
  if (!details || !details.selector) {
    showSnackbar('⚠️ 사용할 수 있는 속성을 찾을 수 없습니다');
    return;
  }

  const { textarea, copyButton } = ensureModalInitialized();
  if (!textarea) {
    return;
  }

  state.currentSelector = details.selector;
  state.currentAttribute = details.attribute;

  const elementToken = `${details.selector} `;
  const isFirstStep = state.promptText === '' && state.currentStepNumber === 1;

  if (isFirstStep) {
    state.promptText = `1. ${elementToken}`;
    state.caretPosition = state.promptText.length;
  } else {
    const insertionIndex =
      typeof state.caretPosition === 'number' ? state.caretPosition : state.promptText.length;
    state.promptText = insertAt(state.promptText, insertionIndex, elementToken);
    state.caretPosition = insertionIndex + elementToken.length;
  }

  textarea.value = state.promptText;
  state.mode = 'modal-open';
  state.isModalOpen = true;

  if (copyButton) {
    copyButton.textContent = '복사하기';
  }

  const eventIsMouseEvent = typeof MouseEvent !== 'undefined' && openEvent instanceof MouseEvent;
  const fromEvent = eventIsMouseEvent
    ? { x: openEvent.clientX, y: openEvent.clientY }
    : null;
  if (fromEvent) {
    modalOpenMousePosition = fromEvent;
  } else if (lastMousePosition) {
    modalOpenMousePosition = { x: lastMousePosition.x, y: lastMousePosition.y };
  } else {
    modalOpenMousePosition = null;
  }

  document.removeEventListener('mousemove', handleModalMouseMove, true);
  document.addEventListener('mousemove', handleModalMouseMove, true);
  ensureMouseIntentDetector().then((detector) => {
    if (!detector) {
      return;
    }

    const modalElement = document.querySelector('#e2e-prompt-modal');
    if (!modalElement) {
      return;
    }

    const fallbackPoint = lastMousePosition
      ? { x: lastMousePosition.x, y: lastMousePosition.y }
      : null;
    const startingPoint = modalOpenMousePosition || fallbackPoint;

    try {
      detector.stopTracking();
    } catch (error) {
      console.warn('[E2E Prompt Builder] Failed to reset detector', error);
    }

    if (startingPoint) {
      try {
        detector.startTracking(modalElement, startingPoint);
      } catch (error) {
        console.warn('[E2E Prompt Builder] Failed to start detector', error);
      }
    }
  });

  showModalUI();

  window.requestAnimationFrame(() => {
    textarea.focus();
    textarea.selectionStart = state.caretPosition;
    textarea.selectionEnd = state.caretPosition;
  });
}

function closeModal() {
  const textarea = getModalTextarea();
  if (textarea) {
    textarea.value = state.promptText;
  }

  state.mode = 'highlight';
  state.isModalOpen = false;
  document.removeEventListener('mousemove', handleModalMouseMove, true);
  modalOpenMousePosition = null;
  if (mouseIntentDetector) {
    try {
      mouseIntentDetector.stopTracking();
    } catch (error) {
      console.warn('[E2E Prompt Builder] Failed to stop detector on close', error);
    }
  }
  hideModalUI();
}

function handleCommandEnter() {
  const textarea = getModalTextarea();
  if (!textarea) {
    return;
  }

  state.promptText = textarea.value;
  state.caretPosition = textarea.selectionStart;

  state.currentStepNumber += 1;
  state.promptText = `${state.promptText}\n${state.currentStepNumber}. `;
  state.caretPosition = state.promptText.length;

  textarea.value = state.promptText;
  textarea.focus();
  textarea.selectionStart = state.caretPosition;
  textarea.selectionEnd = state.caretPosition;
}

function handleEnter() {
  const textarea = getModalTextarea();
  if (!textarea) {
    return;
  }

  state.promptText = textarea.value;
  state.caretPosition = textarea.selectionStart;

  state.currentStepNumber += 1;
  state.promptText = `${state.promptText}\n${state.currentStepNumber}. `;
  state.caretPosition = state.promptText.length;

  closeModal();
}

function handleEscape() {
  const textarea = getModalTextarea();
  if (!textarea) {
    return;
  }

  state.promptText = textarea.value;
  state.caretPosition = textarea.selectionStart;

  if (!state.promptText.endsWith(' ')) {
    state.promptText += ' ';
    state.caretPosition = state.promptText.length;
  }

  closeModal();
}

function handleTextareaKeyDown(event) {
  if (!state.isModalOpen) {
    return;
  }

  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    handleCommandEnter();
    return;
  }

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleEnter();
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    handleEscape();
  }
}

function handleTextareaInput() {
  const textarea = getModalTextarea();
  if (!textarea) {
    return;
  }
  state.promptText = textarea.value;
  state.caretPosition = textarea.selectionStart;
}

function handleTextareaSelectionUpdate() {
  const textarea = getModalTextarea();
  if (!textarea) {
    return;
  }
  state.caretPosition = textarea.selectionStart;
}

function handleCopyButtonClick() {
  const textarea = getModalTextarea();
  const copyButton = getCopyButton();
  if (!textarea || !copyButton) {
    return;
  }

  state.promptText = textarea.value;
  state.caretPosition = textarea.selectionStart;

  if (!navigator?.clipboard?.writeText) {
    showSnackbar('❌ 복사 실패');
    return;
  }

  navigator.clipboard
    .writeText(state.promptText)
    .then(() => {
      copyButton.textContent = '복사됨!';
      window.setTimeout(() => {
        if (state.isModalOpen) {
          closeModal();
        }
      }, 500);

      window.setTimeout(() => {
        copyButton.textContent = '복사하기';
      }, 2000);
    })
    .catch(() => {
      showSnackbar('❌ 복사 실패');
    });
}

function handleMouseOver(event) {
  trackMousePosition(event);
  if (!inspectorEnabled || state.mode !== 'highlight') {
    return;
  }

  const details = attributeManager.findElementBySelector(event.target);
  if (!details) {
    return;
  }

  if (state.currentElement === details.element) {
    state.currentSelector = details.selector;
    state.currentAttribute = details.attribute;
    updateHighlightOverlayPosition(details.element);
    return;
  }

  highlightElement(details.element, details);
}

function handleMouseOut(event) {
  trackMousePosition(event);
  if (state.mode !== 'highlight') {
    return;
  }

  if (state.currentElement === event.target) {
    removeHighlightOverlay();
    state.currentElement = null;
    state.currentSelector = null;
    state.currentAttribute = null;
  }
}

function handleKeyDown(event) {
  if (!inspectorEnabled) {
    return;
  }

  if (state.mode !== 'highlight') {
    return;
  }

  const activeElement = ensureCurrentElement();
  if (!activeElement) {
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    navigateToParent();
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    navigateToChild();
  } else if (event.code === 'Space' || event.key === ' ') {
    event.preventDefault();
    openModal(event);
  }
}

function handleScrollOrResize() {
  const activeElement = ensureCurrentElement();
  if (activeElement) {
    updateHighlightOverlayPosition(activeElement);
  }
}

function attachEventListeners() {
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('mousemove', trackMousePosition, true);
  window.addEventListener('scroll', handleScrollOrResize, true);
  window.addEventListener('resize', handleScrollOrResize, true);
}

function detachEventListeners() {
  document.removeEventListener('mouseover', handleMouseOver, true);
  document.removeEventListener('mouseout', handleMouseOut, true);
  document.removeEventListener('keydown', handleKeyDown, true);
  document.removeEventListener('mousemove', trackMousePosition, true);
  window.removeEventListener('scroll', handleScrollOrResize, true);
  window.removeEventListener('resize', handleScrollOrResize, true);
}

function enableInspector() {
  if (inspectorEnabled) {
    return;
  }

  initializeOverlayStyles();
  ensureModalInitialized();
  hideModalUI();
  attachEventListeners();
  inspectorEnabled = true;
  console.log('[Element Inspector] 활성화됨');
}

function disableInspector() {
  if (!inspectorEnabled) {
    return;
  }

  detachEventListeners();
  removeHighlightOverlay();
  hideModalUI();
  document.removeEventListener('mousemove', handleModalMouseMove, true);
  state.mode = 'highlight';
  state.isModalOpen = false;
  state.currentElement = null;
  state.currentSelector = null;
  state.currentAttribute = null;
  modalOpenMousePosition = null;
  lastMousePosition = null;
  inspectorEnabled = false;

  const snackbar = document.querySelector('.element-inspector-snackbar');
  if (snackbar) {
    snackbar.remove();
  }

  console.log('[Element Inspector] 비활성화됨');
}

function setInspectorState(enabled) {
  if (enabled) {
    enableInspector();
  } else {
    disableInspector();
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return;
  }

  if (message.type === 'ELEMENT_INSPECTOR_SET_STATE') {
    setInspectorState(Boolean(message.enabled));
    sendResponse({ enabled: inspectorEnabled });
  }
});

try {
  chrome.runtime.sendMessage({ type: 'ELEMENT_INSPECTOR_REQUEST_STATE' }, (response) => {
    if (chrome.runtime.lastError) {
      return;
    }

    const enabled = Boolean(response?.enabled);
    setInspectorState(enabled);
  });
} catch (error) {
  console.warn('[Element Inspector] 상태 요청 실패', error);
}
