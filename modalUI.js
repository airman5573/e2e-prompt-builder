let modalOverlay = null;

export function ensureModalElements() {
  if (modalOverlay) {
    return modalOverlay;
  }

  modalOverlay = document.querySelector('#e2e-prompt-overlay');
  if (modalOverlay) {
    return modalOverlay;
  }

  const overlay = document.createElement('div');
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

  const footer = document.createElement('div');
  footer.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 4px;
    gap: 12px;
  `;

  const hintText = document.createElement('span');
  hintText.textContent = 'Enter: 다음단계 | Cmd+Enter: 단계추가 | ESC: 현재단계유지';
  hintText.style.cssText = `
    font-size: 12px;
    color: #6b7280;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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

  footer.appendChild(hintText);
  footer.appendChild(copyButton);

  modal.appendChild(title);
  modal.appendChild(textarea);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  modalOverlay = overlay;
  return modalOverlay;
}

export function getModalOverlay() {
  return ensureModalElements();
}

export function getModalTextarea() {
  const overlay = ensureModalElements();
  return overlay.querySelector('#prompt-textarea');
}

export function getCopyButton() {
  const overlay = ensureModalElements();
  return overlay.querySelector('#copy-prompt-btn');
}

export function showModalUI() {
  const overlay = ensureModalElements();
  overlay.style.display = 'flex';
}

export function hideModalUI() {
  const overlay = modalOverlay || document.querySelector('#e2e-prompt-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}
