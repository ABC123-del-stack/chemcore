/* ==========================================================================
   theme.js — dark / light theme toggle with persistence
   ========================================================================== */

function getStoredTheme() {
  return localStorage.getItem(STORAGE_KEYS.theme) || 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEYS.theme, theme);

  // Sync every theme toggle control present on the page
  $$('.theme-toggle-switch').forEach(el => { el.checked = theme === 'dark'; });
  $$('.theme-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.theme === theme);
  });
  $$('.navbar-theme-btn i').forEach(icon => {
    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  });
}

function toggleTheme() {
  const next = getStoredTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

function initTheme() {
  applyTheme(getStoredTheme());

  $$('.theme-toggle-switch').forEach(el => {
    el.addEventListener('change', () => applyTheme(el.checked ? 'dark' : 'light'));
  });
  $$('.navbar-theme-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleTheme());
  });
  $$('.theme-option').forEach(el => {
    el.addEventListener('click', () => applyTheme(el.dataset.theme));
  });
}

// Apply theme immediately (before DOMContentLoaded) to avoid a flash of the wrong theme
applyTheme(getStoredTheme());

// Bind toggle controls once the DOM (navbar / settings panel) exists
document.addEventListener('DOMContentLoaded', initTheme);
