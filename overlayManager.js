let highlightOverlay = null;
let rafId = null;
let queuedElementForUpdate = null;
let lastOverlayRect = null;

export function initializeOverlayStyles() {
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

export function ensureHighlightOverlay() {
  if (!highlightOverlay) {
    highlightOverlay = document.createElement('div');
    highlightOverlay.className = '__element-inspector-overlay__';
    document.body.appendChild(highlightOverlay);
  }
  return highlightOverlay;
}

export function updateHighlightOverlayPosition(element) {
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

export function removeHighlightOverlay() {
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

export function isOverlayActive() {
  return Boolean(highlightOverlay);
}
