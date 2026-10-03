/* ==========================================================================
   ui.js — shared shell behavior: sidebar, dropdowns, toasts, modals, loader
   Included on every authenticated page (dashboard, inventory, safety,
   reports, settings).
   ========================================================================== */

/* -------------------------------------------------------------------- */
/* Page loader                                                           */
/* -------------------------------------------------------------------- */

function hidePageLoader() {
  const loader = $('#pageLoader');
  if (!loader) return;
  setTimeout(() => loader.classList.add('hide'), 380);
}

/* -------------------------------------------------------------------- */
/* Sidebar (collapsible on desktop, off-canvas on mobile)                */
/* -------------------------------------------------------------------- */

function initSidebar() {
  const sidebar = $('#sidebar');
  const overlay = $('#sidebarOverlay');
  if (!sidebar) return;

  // Desktop collapse state persists across pages
  const collapsed = localStorage.getItem(STORAGE_KEYS.sidebar) === 'true';
  if (collapsed) sidebar.classList.add('collapsed');

  $('#sidebarToggleBtn')?.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    localStorage.setItem(STORAGE_KEYS.sidebar, sidebar.classList.contains('collapsed'));
  });

  $('#navbarMenuBtn')?.addEventListener('click', () => {
    sidebar.classList.add('mobile-open');
    overlay?.classList.add('show');
  });

  const closeMobileSidebar = () => {
    sidebar.classList.remove('mobile-open');
    overlay?.classList.remove('show');
  };
  overlay?.addEventListener('click', closeMobileSidebar);
  $$('.nav-link').forEach(link => link.addEventListener('click', closeMobileSidebar));

  // Highlight active nav item based on current file name
  const current = location.pathname.split('/').pop() || 'dashboard.html';
  $$('.nav-item').forEach(item => {
    const link = item.querySelector('.nav-link');
    if (link && link.getAttribute('href') === current) item.classList.add('active');
  });
}

/* -------------------------------------------------------------------- */
/* Dropdowns (notifications, profile menu)                               */
/* -------------------------------------------------------------------- */

function initDropdowns() {
  const wraps = $$('.dropdown-wrap');
  wraps.forEach(wrap => {
    const trigger = wrap.querySelector('.dropdown-trigger');
    trigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = wrap.classList.contains('open');
      wraps.forEach(w => w.classList.remove('open'));
      if (!isOpen) wrap.classList.add('open');
    });
  });
  document.addEventListener('click', () => wraps.forEach(w => w.classList.remove('open')));
}

/* -------------------------------------------------------------------- */
/* Toast notifications                                                   */
/* -------------------------------------------------------------------- */

const TOAST_ICONS = {
  success: 'fa-circle-check',
  error: 'fa-circle-exclamation',
  warning: 'fa-triangle-exclamation',
  info: 'fa-circle-info',
};

function ensureToastContainer() {
  let container = $('#toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

function showToast(title, message = '', type = 'info', duration = 4200) {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i class="fa-solid ${TOAST_ICONS[type] || TOAST_ICONS.info}"></i></div>
    <div class="toast-text">
      <strong>${escapeHTML(title)}</strong>
      ${message ? `<p>${escapeHTML(message)}</p>` : ''}
    </div>
    <button class="toast-close" aria-label="Dismiss notification"><i class="fa-solid fa-xmark"></i></button>
  `;
  container.appendChild(toast);

  const remove = () => {
    toast.classList.add('closing');
    setTimeout(() => toast.remove(), 250);
  };
  toast.querySelector('.toast-close').addEventListener('click', remove);
  if (duration) setTimeout(remove, duration);
}

/* -------------------------------------------------------------------- */
/* Modal helpers                                                         */
/* -------------------------------------------------------------------- */

function openModal(id) {
  const backdrop = document.getElementById(id);
  if (!backdrop) return;
  backdrop.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const backdrop = document.getElementById(id);
  if (!backdrop) return;
  backdrop.classList.remove('show');
  document.body.style.overflow = '';
}

function initModalDismissers() {
  $$('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal(backdrop.id);
    });
    backdrop.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(backdrop.id));
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $$('.modal-backdrop.show').forEach(b => closeModal(b.id));
    }
  });
}

/**
 * Generic confirmation dialog.
 * Usage: confirmDialog({ title, message, confirmText, danger: true }).then(ok => { ... })
 */
function confirmDialog({ title = 'Are you sure?', message = '', confirmText = 'Confirm', cancelText = 'Cancel', danger = false } = {}) {
  return new Promise((resolve) => {
    let backdrop = $('#globalConfirmModal');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'globalConfirmModal';
      backdrop.className = 'modal-backdrop';
      document.body.appendChild(backdrop);
    }
    backdrop.innerHTML = `
      <div class="modal modal-sm" role="dialog" aria-modal="true">
        <div class="modal-body" style="padding-top:26px;">
          <div class="confirm-icon-wrap" style="${danger ? '' : 'background:var(--color-info-bg);color:var(--color-info);'}">
            <i class="fa-solid ${danger ? 'fa-trash' : 'fa-circle-question'}"></i>
          </div>
          <h3 style="margin-bottom:8px;">${escapeHTML(title)}</h3>
          <p style="font-size:13.5px;">${escapeHTML(message)}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="confirmCancelBtn">${escapeHTML(cancelText)}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirmOkBtn">${escapeHTML(confirmText)}</button>
        </div>
      </div>
    `;
    openModal('globalConfirmModal');

    const cleanup = (result) => {
      closeModal('globalConfirmModal');
      resolve(result);
    };
    $('#confirmCancelBtn').addEventListener('click', () => cleanup(false));
    $('#confirmOkBtn').addEventListener('click', () => cleanup(true));
    backdrop.onclick = (e) => { if (e.target === backdrop) cleanup(false); };
  });
}

/* -------------------------------------------------------------------- */
/* Navbar notifications panel (data-driven from inventory + incidents)   */
/* -------------------------------------------------------------------- */

function renderNotifications() {
  const list = $('#notifList');
  const badge = $('#notifBadge');
  if (!list) return;

  const chemicals = getChemicals();
  const alerts = chemicals
    .map(c => ({ ...c, status: computeStatus(c) }))
    .filter(c => ['Low Stock', 'Out of Stock', 'Expired', 'Expiring Soon'].includes(c.status))
    .slice(0, 6);

  if (!getNotificationsEnabled()) {
    list.innerHTML = `<div class="sug-empty" style="padding:24px;">Notifications are turned off in Settings.</div>`;
    if (badge) badge.classList.add('hidden');
    return;
  }

  if (badge) badge.classList.toggle('hidden', alerts.length === 0);

  if (alerts.length === 0) {
    list.innerHTML = `<div class="sug-empty" style="padding:24px;">You're all caught up. No active alerts.</div>`;
    return;
  }

  const iconMap = {
    'Low Stock': { icon: 'fa-battery-quarter', bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
    'Out of Stock': { icon: 'fa-ban', bg: 'var(--color-danger-bg)', color: 'var(--color-danger)' },
    'Expired': { icon: 'fa-hourglass-end', bg: 'var(--color-danger-bg)', color: 'var(--color-danger)' },
    'Expiring Soon': { icon: 'fa-clock', bg: 'var(--color-info-bg)', color: 'var(--color-info)' },
  };

  list.innerHTML = alerts.map(a => {
    const m = iconMap[a.status];
    return `
      <div class="notif-item">
        <div class="notif-icon" style="background:${m.bg};color:${m.color};"><i class="fa-solid ${m.icon}"></i></div>
        <div class="notif-body">
          <p><strong>${escapeHTML(a.name)}</strong> — ${escapeHTML(a.status)}</p>
          <span>${escapeHTML(a.location)}</span>
        </div>
      </div>`;
  }).join('');
}

/* -------------------------------------------------------------------- */
/* Navbar profile                                                        */
/* -------------------------------------------------------------------- */

function renderProfile() {
  const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || '{}');
  const name = user.name || 'Samrudhi Mhaske';
  const role = user.role || 'Plant Supervisor';
  $$('.profile-name').forEach(el => el.textContent = name);
  $$('.profile-role').forEach(el => el.textContent = role);
  $$('.profile-avatar').forEach(el => el.textContent = getInitials(name));
}

function initLogout() {
  $$('.logout-trigger').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem(STORAGE_KEYS.session);
      window.location.href = 'index.html';
    });
  });
}

/* -------------------------------------------------------------------- */
/* Global search (navbar) — searches chemical inventory                  */
/* -------------------------------------------------------------------- */

function initGlobalSearch() {
  const input = $('#globalSearchInput');
  const suggestBox = $('#searchSuggestions');
  if (!input || !suggestBox) return;

  const runSearch = debounce(() => {
    const q = input.value.trim().toLowerCase();
    if (!q) { suggestBox.classList.add('hidden'); return; }
    const results = getChemicals()
      .filter(c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.category.toLowerCase().includes(q))
      .slice(0, 6);

    suggestBox.innerHTML = results.length
      ? results.map(r => `
          <a href="inventory.html?q=${encodeURIComponent(r.name)}">
            <span>${escapeHTML(r.name)}</span>
            <span class="sug-meta">${escapeHTML(r.category)} · ${escapeHTML(r.id)}</span>
          </a>`).join('')
      : `<div class="sug-empty">No chemicals found for "${escapeHTML(input.value)}"</div>`;
    suggestBox.classList.remove('hidden');
  }, 200);

  input.addEventListener('input', runSearch);
  input.addEventListener('focus', () => { if (input.value.trim()) runSearch(); });
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !suggestBox.contains(e.target)) suggestBox.classList.add('hidden');
  });
}

/* -------------------------------------------------------------------- */
/* Auth guard — redirect to login if not authenticated                   */
/* -------------------------------------------------------------------- */

function requireAuth() {
  if (localStorage.getItem(STORAGE_KEYS.session) !== 'true') {
    window.location.href = 'index.html';
  }
}

/* -------------------------------------------------------------------- */
/* Shell bootstrap — call on every authenticated page                    */
/* -------------------------------------------------------------------- */

function initAppShell() {
  requireAuth();
  initSidebar();
  initDropdowns();
  initModalDismissers();
  renderNotifications();
  renderProfile();
  initLogout();
  initGlobalSearch();
  hidePageLoader();
}

// Only bootstrap the full app shell on pages that actually render it
// (dashboard, inventory, safety, reports, settings). The login page loads
// ui.js too — for toasts/modals — but has no #sidebar, so it's skipped here
// to avoid an auth-redirect loop.
document.addEventListener('DOMContentLoaded', () => {
  if ($('#sidebar')) {
    initAppShell();
  } else {
    initModalDismissers();
    hidePageLoader();
  }
});
