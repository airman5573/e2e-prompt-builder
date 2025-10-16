export function showSnackbar(message, duration = 3000, backgroundColor = '#323232') {
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
