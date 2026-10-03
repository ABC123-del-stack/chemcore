/* ==========================================================================
   settings.js — company info, theme, notifications, reset sample data
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  bindSettingsTabs();
  loadCompanyForm();
  bindCompanyForm();
  bindNotificationToggle();
  bindResetData();
});

/* -------------------------------------------------------------------- */
/* Tab navigation                                                        */
/* -------------------------------------------------------------------- */

function bindSettingsTabs() {
  $$('.settings-nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.settings-nav button').forEach(b => b.classList.remove('active'));
      $$('.settings-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      $(`#${btn.dataset.panel}`)?.classList.add('active');
    });
  });
}

/* -------------------------------------------------------------------- */
/* Company information                                                   */
/* -------------------------------------------------------------------- */

function loadCompanyForm() {
  const info = getCompanyInfo();
  const map = { name: '#companyName', email: '#companyEmail', phone: '#companyPhone', address: '#companyAddress', license: '#companyLicense' };
  Object.entries(map).forEach(([key, sel]) => {
    const el = $(sel);
    if (el) el.value = info[key] || '';
  });
}

function bindCompanyForm() {
  $('#companyForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const info = {
      name: $('#companyName').value.trim(),
      email: $('#companyEmail').value.trim(),
      phone: $('#companyPhone').value.trim(),
      address: $('#companyAddress').value.trim(),
      license: $('#companyLicense').value.trim(),
    };
    saveCompanyInfo(info);
    showToast('Settings saved', 'Company information has been updated.', 'success');
  });
}

/* -------------------------------------------------------------------- */
/* Notifications toggle                                                  */
/* -------------------------------------------------------------------- */

function bindNotificationToggle() {
  const toggle = $('#notifToggle');
  if (!toggle) return;
  toggle.checked = getNotificationsEnabled();
  toggle.addEventListener('change', () => {
    setNotificationsEnabled(toggle.checked);
    showToast(
      toggle.checked ? 'Notifications enabled' : 'Notifications muted',
      toggle.checked ? 'You will see alerts for stock and safety events.' : 'You will no longer see alert badges.',
      'info'
    );
  });
}

/* -------------------------------------------------------------------- */
/* Reset sample data                                                     */
/* -------------------------------------------------------------------- */

function bindResetData() {
  $('#resetDataBtn')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Reset all sample data?',
      message: 'This restores the original 20 sample chemicals and clears any chemicals, incidents, and PPE progress you\'ve added. This cannot be undone.',
      confirmText: 'Reset Data',
      danger: true,
    });
    if (!ok) return;
    resetSampleData();
    showToast('Data reset', 'Sample data has been restored to defaults.', 'success');
    loadCompanyForm();
  });
}
