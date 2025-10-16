(() => {
  let inspectorEnabled = false;
  let currentHighlightedElement = null;
  let highlightOverlay = null;
  let rafId = null;
  let queuedElementForUpdate = null;
  let lastOverlayRect = null;

  function initializeStyles() {
    if (!document.querySelector('#element-inspector-highlight-style')) {
      const style = document.createElement('style');
      style.id = 'element-inspector-highlight-style';
      style.textContent = `
        .__element-inspector-overlay__ {
          position: fixed !important;
          pointer-events: none !important;
          z-index: 2147483647 !important;
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

  function handleMouseOver(event) {
    currentHighlightedElement = event.target;
    createOverlay();
    updateOverlayPosition(event.target);
  }

  function handleMouseOut(event) {
    if (currentHighlightedElement === event.target) {
      removeOverlay();
      currentHighlightedElement = null;
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

  function highlightElement(element) {
    if (!element) return;

    currentHighlightedElement = element;
    createOverlay();
    updateOverlayPosition(element);

    if (typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

      window.setTimeout(() => {
        updateOverlayPosition(element);
      }, 500);
    }
  }

  function handleKeyDown(event) {
    if (!currentHighlightedElement) return;

    const key = event.key;

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      event.preventDefault();

      let targetElement = null;

      switch (key) {
        case 'ArrowUp':
          targetElement = currentHighlightedElement.parentElement;
          break;
        case 'ArrowDown':
          targetElement = currentHighlightedElement.firstElementChild;
          break;
        case 'ArrowLeft':
          targetElement = currentHighlightedElement.previousElementSibling;
          break;
        case 'ArrowRight':
          targetElement = currentHighlightedElement.nextElementSibling;
          break;
        default:
          break;
      }

      if (targetElement) {
        highlightElement(targetElement);
      } else {
        showSnackbar('⚠️ 이동할 수 없습니다', 1000, '#ff9800');
      }
    } else if (event.code === 'Space') {
      event.preventDefault();

      const elementWithId = findElementWithId(currentHighlightedElement);

      if (elementWithId && elementWithId.id) {
        navigator.clipboard.writeText(elementWithId.id).then(() => {
          showSnackbar(`📋 Copied: ${elementWithId.id}`);
          console.log(`✅ ID 복사됨: ${elementWithId.id}`);
        }).catch((err) => {
          console.error('클립보드 복사 실패:', err);
          showSnackbar('❌ 복사 실패');
        });
      } else {
        showSnackbar('⚠️ ID를 찾을 수 없습니다');
        console.warn('ID가 있는 element를 찾을 수 없습니다');
      }
    }
  }

  function handleScrollOrResize() {
    if (currentHighlightedElement) {
      updateOverlayPosition(currentHighlightedElement);
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
    if (inspectorEnabled) return;

    initializeStyles();
    attachEventListeners();
    inspectorEnabled = true;
    console.log('[Element Inspector] 활성화됨');
  }

  function disableInspector() {
    if (!inspectorEnabled) return;

    detachEventListeners();
    removeOverlay();
    currentHighlightedElement = null;
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
