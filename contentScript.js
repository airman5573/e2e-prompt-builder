(() => {
  let inspectorEnabled = false;
  let highlightOverlay = null;
  let rafId = null;
  let queuedElementForUpdate = null;
  let lastOverlayRect = null;

  const state = {
    mode: 'highlight',
    currentElement: null,
    promptText: '',
    currentStepNumber: 1,
    isModalOpen: false,
    caretPosition: 0,
  };

  function initializeStyles() {
    if (!document.querySelector('#element-inspector-highlight-style')) {
      const style = document.createElement('style');
      style.id = 'element-inspector-highlight-style';
      style.textContent = `
        .__element-inspector-overlay__ {
          position: fixed !important;
          pointer-events: none !important;
          z-index: 999998 !important;
          border: 3px solid red !important;
          background-color: rgba(255, 0, 0, 0.1) !important;
          box-sizing: border-box !important;
          will-change: transform !important;
          transition: none !important;
        }
        .element-inspector-snackbar {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: #323232;
          color: white;
          padding: 14px 24px;
          border-radius: 4px;
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          z-index: 2147483647;
          box-shadow: 0 3px 5px -1px rgba(0,0,0,.2), 0 6px 10px 0 rgba(0,0,0,.14), 0 1px 18px 0 rgba(0,0,0,.12);
          animation: snackbar-fade-in 0.3s ease-out;
        }
        @keyframes snackbar-fade-in {
          from {
            opacity: 0;
            transform: translate(-50%, -40%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
        @keyframes snackbar-fade-out {
          from {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
          to {
            opacity: 0;
            transform: translate(-50%, -40%);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  function ensureModalUI() {
    let overlay = document.querySelector('#e2e-prompt-overlay');
    if (overlay) {
      return overlay;
    }

    overlay = document.createElement('div');
    overlay.id = 'e2e-prompt-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(17, 24, 39, 0.45);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      padding: 24px;
      box-sizing: border-box;
    `;
    overlay.addEventListener('click', (event) => {
      event.stopPropagation();
      event.preventDefault();
    });

    const modal = document.createElement('div');
    modal.id = 'e2e-prompt-modal';
    modal.style.cssText = `
      width: 420px;
      max-width: 80vw;
      background: #ffffff;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 20px 48px rgba(15, 23, 42, 0.25);
      display: flex;
      flex-direction: column;
      gap: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    modal.addEventListener('click', (event) => event.stopPropagation());

    const title = document.createElement('h2');
    title.textContent = 'E2E 테스트 시나리오';
    title.style.cssText = `
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #111827;
    `;

    const textarea = document.createElement('textarea');
    textarea.id = 'prompt-textarea';
    textarea.setAttribute('spellcheck', 'false');
    textarea.style.cssText = `
      width: 100%;
      min-height: 200px;
      max-height: 60vh;
      resize: vertical;
      padding: 16px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.5;
      color: #111827;
      background: #f9fafb;
      box-sizing: border-box;
      outline: none;
    `;

    textarea.addEventListener('keydown', (event) => {
      if (!state.isModalOpen) {
        return;
      }

      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleEnter();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        handleEscape();
      }
    });

    textarea.addEventListener('input', () => {
      state.promptText = textarea.value;
      state.caretPosition = textarea.selectionStart;
    });

    textarea.addEventListener('click', () => {
      state.caretPosition = textarea.selectionStart;
    });

    textarea.addEventListener('keyup', () => {
      state.caretPosition = textarea.selectionStart;
    });

    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      margin-top: 4px;
    `;

    const copyButton = document.createElement('button');
    copyButton.id = 'copy-prompt-btn';
    copyButton.type = 'button';
    copyButton.textContent = '복사하기';
    copyButton.style.cssText = `
      padding: 10px 16px;
      background: #2563eb;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
    `;

    copyButton.addEventListener('click', () => {
      const promptTextarea = getTextarea();
      if (!promptTextarea) {
        return;
      }

      state.promptText = promptTextarea.value;
      state.caretPosition = promptTextarea.selectionStart;

      navigator.clipboard.writeText(state.promptText).then(() => {
        copyButton.textContent = '복사됨!';
        window.setTimeout(() => {
          if (state.isModalOpen) {
            closeModal();
          }
        }, 500);

        window.setTimeout(() => {
          copyButton.textContent = '복사하기';
        }, 2000);
      }).catch(() => {
        showSnackbar('❌ 복사 실패');
      });
    });

    footer.appendChild(copyButton);

    modal.appendChild(title);
    modal.appendChild(textarea);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    return overlay;
  }

  function getTextarea() {
    return document.querySelector('#prompt-textarea');
  }

  function showModalUI() {
    const overlay = ensureModalUI();
    overlay.style.display = 'flex';
    const copyButton = document.querySelector('#copy-prompt-btn');
    if (copyButton) {
      copyButton.textContent = '복사하기';
    }
  }

  function hideModalUI() {
    const overlay = document.querySelector('#e2e-prompt-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  function updateOverlayPosition(element) {
    if (!highlightOverlay || !element) return;

    queuedElementForUpdate = element;

    if (rafId) return;

    rafId = window.requestAnimationFrame(() => {
      if (!highlightOverlay || !queuedElementForUpdate) {
        rafId = null;
        return;
      }

      const rect = queuedElementForUpdate.getBoundingClientRect();
      const { top, left, width, height } = rect;

      const rectChanged =
        !lastOverlayRect ||
        lastOverlayRect.top !== top ||
        lastOverlayRect.left !== left ||
        lastOverlayRect.width !== width ||
        lastOverlayRect.height !== height;

      if (rectChanged) {
        highlightOverlay.style.top = `${top}px`;
        highlightOverlay.style.left = `${left}px`;
        highlightOverlay.style.width = `${width}px`;
        highlightOverlay.style.height = `${height}px`;
        lastOverlayRect = { top, left, width, height };
      }

      queuedElementForUpdate = null;
      rafId = null;
    });
  }

  function createOverlay() {
    if (!highlightOverlay) {
      highlightOverlay = document.createElement('div');
      highlightOverlay.className = '__element-inspector-overlay__';
      document.body.appendChild(highlightOverlay);
    }
    return highlightOverlay;
  }

  function removeOverlay() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    queuedElementForUpdate = null;
    lastOverlayRect = null;

    if (highlightOverlay) {
      highlightOverlay.remove();
      highlightOverlay = null;
    }
  }

  function findElementWithId(element) {
    let current = element;
    while (current && current !== document.body) {
      if (current.id) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  function ensureCurrentElement() {
    if (state.currentElement && document.contains(state.currentElement)) {
      return state.currentElement;
    }
    state.currentElement = null;
    return null;
  }

  function highlightElement(element) {
    if (!element || state.mode !== 'highlight') {
      return;
    }

    state.currentElement = element;
    createOverlay();
    updateOverlayPosition(element);

    if (typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

      window.setTimeout(() => {
        if (state.currentElement === element) {
          updateOverlayPosition(element);
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
      if (parent.id) {
        highlightElement(parent);
        return;
      }
      parent = parent.parentElement;
    }

    showSnackbar('⚠️ ID가 있는 부모를 찾을 수 없습니다', 1200, '#ff9800');
  }

  function navigateToChild() {
    const activeElement = ensureCurrentElement();
    if (!activeElement) {
      return;
    }

    const findChildWithId = (element) => {
      for (const child of element.children) {
        if (child.id) {
          return child;
        }
        const found = findChildWithId(child);
        if (found) {
          return found;
        }
      }
      return null;
    };

    const child = findChildWithId(activeElement);
    if (child) {
      highlightElement(child);
    } else {
      showSnackbar('⚠️ ID가 있는 자식을 찾을 수 없습니다', 1200, '#ff9800');
    }
  }

  function insertAt(text, index, value) {
    const safeIndex = Math.min(Math.max(index, 0), text.length);
    return text.slice(0, safeIndex) + value + text.slice(safeIndex);
  }

  function openModal() {
    const elementForPrompt = ensureCurrentElement();
    if (!elementForPrompt || !elementForPrompt.id) {
      showSnackbar('⚠️ ID를 찾을 수 없습니다');
      return;
    }

    const overlay = ensureModalUI();
    const textarea = getTextarea();
    if (!textarea || !overlay) {
      return;
    }

    const elementToken = `#${elementForPrompt.id} `;
    const isFirstStep = state.promptText === '' && state.currentStepNumber === 1;

    if (isFirstStep) {
      state.promptText = `1. ${elementToken}`;
      state.caretPosition = state.promptText.length;
    } else {
      const insertionIndex = typeof state.caretPosition === 'number' ? state.caretPosition : state.promptText.length;
      state.promptText = insertAt(state.promptText, insertionIndex, elementToken);
      state.caretPosition = insertionIndex + elementToken.length;
    }

    textarea.value = state.promptText;
    state.mode = 'modal-open';
    state.isModalOpen = true;

    showModalUI();

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = state.caretPosition;
      textarea.selectionEnd = state.caretPosition;
    });
  }

  function closeModal() {
    const textarea = getTextarea();
    if (textarea) {
      textarea.value = state.promptText;
    }

    state.mode = 'highlight';
    state.isModalOpen = false;
    hideModalUI();
  }

  function handleEnter() {
    const textarea = getTextarea();
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
    const textarea = getTextarea();
    if (!textarea) {
      return;
    }

    state.promptText = textarea.value;
    state.caretPosition = textarea.selectionStart;

    closeModal();
  }

  function showSnackbar(message, duration = 3000, backgroundColor = '#323232') {
    const existingSnackbar = document.querySelector('.element-inspector-snackbar');
    if (existingSnackbar) {
      existingSnackbar.remove();
    }

    const snackbar = document.createElement('div');
    snackbar.className = 'element-inspector-snackbar';
    snackbar.textContent = message;
    snackbar.style.backgroundColor = backgroundColor;

    document.body.appendChild(snackbar);

    window.setTimeout(() => {
      snackbar.style.animation = 'snackbar-fade-out 0.3s ease-out';
      window.setTimeout(() => {
        snackbar.remove();
      }, 300);
    }, duration);
  }

  function handleMouseOver(event) {
    if (!inspectorEnabled || state.mode !== 'highlight') {
      return;
    }

    const elementWithId = event.target?.id ? event.target : findElementWithId(event.target);
    if (!elementWithId || !elementWithId.id) {
      return;
    }

    if (state.currentElement === elementWithId) {
      updateOverlayPosition(elementWithId);
      return;
    }

    highlightElement(elementWithId);
  }

  function handleMouseOut(event) {
    if (state.mode !== 'highlight') {
      return;
    }

    if (state.currentElement === event.target) {
      removeOverlay();
      state.currentElement = null;
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
      openModal();
    }
  }

  function handleScrollOrResize() {
    const activeElement = ensureCurrentElement();
    if (activeElement) {
      updateOverlayPosition(activeElement);
    }
  }

  function attachEventListeners() {
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize, true);
  }

  function detachEventListeners() {
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);
    document.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('scroll', handleScrollOrResize, true);
    window.removeEventListener('resize', handleScrollOrResize, true);
  }

  function enableInspector() {
    if (inspectorEnabled) {
      return;
    }

    initializeStyles();
    ensureModalUI();
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
    removeOverlay();
    hideModalUI();
    state.mode = 'highlight';
    state.isModalOpen = false;
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
})();
