/* ==========================================================================
   safety.js — PPE checklist, incident report form, incident log
   ========================================================================== */

const PPE_ITEMS = [
  { id: 'goggles', label: 'Safety Goggles', icon: 'fa-glasses' },
  { id: 'gloves', label: 'Chemical-Resistant Gloves', icon: 'fa-mitten' },
  { id: 'coat', label: 'Lab Coat / Apron', icon: 'fa-vest' },
  { id: 'respirator', label: 'Respirator / Face Mask', icon: 'fa-head-side-mask' },
  { id: 'boots', label: 'Steel-Toe Boots', icon: 'fa-boot' },
  { id: 'faceshield', label: 'Face Shield', icon: 'fa-shield-halved' },
  { id: 'earpro', label: 'Hearing Protection', icon: 'fa-ear-listen' },
  { id: 'helmet', label: 'Hard Hat', icon: 'fa-hard-hat' },
];

document.addEventListener('DOMContentLoaded', () => {
  renderPPEChecklist();
  bindIncidentForm();
  renderIncidentLog();
  populateIncidentDate();

  if (location.hash === '#incidentForm') {
    setTimeout(() => $('#incidentForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
  }
});

/* -------------------------------------------------------------------- */
/* PPE checklist                                                         */
/* -------------------------------------------------------------------- */

function renderPPEChecklist() {
  const grid = $('#ppeChecklist');
  if (!grid) return;
  const state = getPPEState();

  grid.innerHTML = PPE_ITEMS.map(item => `
    <div class="checklist-item ${state[item.id] ? 'checked' : ''}" data-id="${item.id}">
      <i class="fa-solid ${item.icon} item-icon"></i>
      <label for="ppe-${item.id}">${item.label}</label>
      <input type="checkbox" id="ppe-${item.id}" ${state[item.id] ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--color-teal-600);" />
    </div>
  `).join('');

  grid.querySelectorAll('.checklist-item').forEach(el => {
    const checkbox = el.querySelector('input');
    const toggle = () => {
      const s = getPPEState();
      s[el.dataset.id] = checkbox.checked;
      setPPEState(s);
      el.classList.toggle('checked', checkbox.checked);
    };
    checkbox.addEventListener('change', toggle);
    el.addEventListener('click', (e) => {
      if (e.target !== checkbox) { checkbox.checked = !checkbox.checked; toggle(); }
    });
  });
}

/* -------------------------------------------------------------------- */
/* Incident report form                                                  */
/* -------------------------------------------------------------------- */

function populateIncidentDate() {
  const dateInput = $('#incidentDate');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
    dateInput.max = new Date().toISOString().slice(0, 10);
  }
}

function bindIncidentForm() {
  const form = $('#incidentForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = $('#incidentName');
    const dept = $('#incidentDept');
    const type = $('#incidentType');
    const desc = $('#incidentDesc');
    const date = $('#incidentDate');

    let valid = true;
    valid = validateField(name, name.value.trim().length >= 2, 'Enter the employee\'s full name.') && valid;
    valid = validateField(dept, !!dept.value, 'Select a department.') && valid;
    valid = validateField(type, !!type.value, 'Select an incident type.') && valid;
    valid = validateField(desc, desc.value.trim().length >= 10, 'Please describe the incident (10+ characters).') && valid;
    valid = validateField(date, !!date.value, 'Select the incident date.') && valid;

    if (!valid) return;

    addIncident({
      employeeName: name.value.trim(),
      department: dept.value,
      type: type.value,
      description: desc.value.trim(),
      date: date.value,
    });

    showToast('Incident reported', 'Your report has been logged and the safety team notified.', 'success');
    form.reset();
    populateIncidentDate();
    renderIncidentLog();
    renderNotifications?.();
  });
}

function validateField(input, condition, message) {
  const err = input.closest('.form-group')?.querySelector('.form-error');
  if (!condition) {
    input.classList.add('invalid');
    if (err) { err.textContent = message; err.classList.add('show'); }
    return false;
  }
  input.classList.remove('invalid');
  if (err) err.classList.remove('show');
  return true;
}

/* -------------------------------------------------------------------- */
/* Incident log                                                          */
/* -------------------------------------------------------------------- */

function renderIncidentLog() {
  const container = $('#incidentLog');
  if (!container) return;
  const incidents = getIncidents();

  if (incidents.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:36px 20px;">
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="60" cy="60" r="52" fill="var(--bg-input)"/>
          <circle cx="60" cy="60" r="52" stroke="var(--border-medium)" stroke-width="1.5"/>
          <foreignObject x="30" y="30" width="60" height="60">
            <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px;color:var(--text-muted);">
              <i class="fa-solid fa-clipboard-check"></i>
            </div>
          </foreignObject>
        </svg>
        <h4>No incidents reported</h4>
        <p>Submitted reports will appear here for the safety team to review.</p>
      </div>`;
    return;
  }

  container.innerHTML = incidents.slice(0, 8).map(inc => `
    <div class="incident-row">
      <div class="inc-type-ico"><i class="fa-solid fa-triangle-exclamation"></i></div>
      <div class="inc-main">
        <strong>${escapeHTML(inc.type)} — ${escapeHTML(inc.department)}</strong>
        <span>${escapeHTML(inc.employeeName)} · ${formatDate(inc.date)}</span>
      </div>
      <span class="badge badge-neutral">${escapeHTML(inc.id)}</span>
    </div>
  `).join('');
}
