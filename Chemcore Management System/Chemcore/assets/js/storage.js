/* ==========================================================================
   storage.js — sample data + all localStorage persistence logic
   All keys are namespaced with "scd_" (Smart Chemical Dashboard)
   ========================================================================== */

const STORAGE_KEYS = {
  chemicals: 'scd_chemicals',
  incidents: 'scd_incidents',
  activities: 'scd_activities',
  company: 'scd_company',
  notifications: 'scd_notifications_enabled',
  ppe: 'scd_ppe_checklist',
  theme: 'scd_theme',
  session: 'scd_logged_in',
  user: 'scd_user',
  sidebar: 'scd_sidebar_collapsed'
};

const CATEGORIES = ['Acids', 'Bases', 'Solvents', 'Oxidizers', 'Salts', 'Gases', 'Organic Compounds'];

/* -------------------------------------------------------------------- */
/* Sample seed data — 20 realistic chemical records                     */
/* -------------------------------------------------------------------- */

function buildSampleChemicals() {
  const raw = [
    ['Sulfuric Acid', 'Acids', 450, 'L', 'Tank Room A - Shelf 1', '2027-05-12', 100],
    ['Hydrochloric Acid', 'Acids', 65, 'L', 'Tank Room A - Shelf 2', '2027-01-20', 100],
    ['Nitric Acid', 'Acids', 210, 'L', 'Tank Room A - Shelf 3', '2026-08-18', 80],
    ['Sodium Hydroxide', 'Bases', 320, 'kg', 'Warehouse B - Rack 4', '2027-11-02', 100],
    ['Potassium Hydroxide', 'Bases', 40, 'kg', 'Warehouse B - Rack 4', '2026-12-05', 60],
    ['Ammonium Hydroxide', 'Bases', 150, 'L', 'Warehouse B - Rack 5', '2026-07-22', 50],
    ['Acetone', 'Solvents', 500, 'L', 'Solvent Store C1', '2027-04-30', 120],
    ['Ethanol', 'Solvents', 610, 'L', 'Solvent Store C1', '2027-06-14', 150],
    ['Methanol', 'Solvents', 95, 'L', 'Solvent Store C2', '2026-08-10', 100],
    ['Isopropyl Alcohol', 'Solvents', 275, 'L', 'Solvent Store C2', '2027-02-18', 100],
    ['Hydrogen Peroxide', 'Oxidizers', 130, 'L', 'Oxidizer Cabinet D', '2026-08-28', 60],
    ['Potassium Nitrate', 'Oxidizers', 0, 'kg', 'Oxidizer Cabinet D', '2027-01-01', 50],
    ['Sodium Hypochlorite', 'Oxidizers', 340, 'L', 'Oxidizer Cabinet E', '2027-03-09', 100],
    ['Calcium Carbonate', 'Salts', 800, 'kg', 'Warehouse B - Rack 1', '2028-01-15', 200],
    ['Sodium Chloride', 'Salts', 950, 'kg', 'Warehouse B - Rack 1', '2028-05-20', 200],
    ['Potassium Chloride', 'Salts', 55, 'kg', 'Warehouse B - Rack 2', '2027-07-11', 80],
    ['Ammonia', 'Gases', 220, 'kg', 'Gas Cylinder Bay F', '2027-02-27', 100],
    ['Chlorine Gas', 'Gases', 60, 'kg', 'Gas Cylinder Bay F', '2026-08-25', 50],
    ['Toluene', 'Organic Compounds', 190, 'L', 'Solvent Store C3', '2027-09-30', 80],
    ['Formaldehyde', 'Organic Compounds', 45, 'L', 'Chemical Store G', '2026-07-28', 50],
  ];

  return raw.map(([name, category, quantity, unit, location, expiryDate, reorderLevel], i) => ({
    id: `CHM-${String(1001 + i)}`,
    name, category, quantity, unit, location, expiryDate, reorderLevel,
    dateAdded: '2026-01-15'
  }));
}

/* -------------------------------------------------------------------- */
/* Status computation                                                    */
/* -------------------------------------------------------------------- */

/** Priority: Out of Stock > Expired > Low Stock > Expiring Soon > Available */
function computeStatus(chem) {
  if (Number(chem.quantity) <= 0) return 'Out of Stock';
  const days = daysUntil(chem.expiryDate);
  if (days < 0) return 'Expired';
  if (Number(chem.quantity) <= Number(chem.reorderLevel)) return 'Low Stock';
  if (days <= 30) return 'Expiring Soon';
  return 'Available';
}

function getStatusMeta(status) {
  const map = {
    'Available': { badge: 'badge-success', dot: 'var(--color-success)' },
    'Low Stock': { badge: 'badge-warning', dot: 'var(--color-warning)' },
    'Out of Stock': { badge: 'badge-danger', dot: 'var(--color-danger)' },
    'Expired': { badge: 'badge-danger', dot: 'var(--color-danger)' },
    'Expiring Soon': { badge: 'badge-info', dot: 'var(--color-info)' },
  };
  return map[status] || { badge: 'badge-neutral', dot: 'var(--text-muted)' };
}

/* -------------------------------------------------------------------- */
/* Seed / reset                                                          */
/* -------------------------------------------------------------------- */

function seedDataIfNeeded() {
  if (!localStorage.getItem(STORAGE_KEYS.chemicals)) {
    localStorage.setItem(STORAGE_KEYS.chemicals, JSON.stringify(buildSampleChemicals()));
  }
  if (!localStorage.getItem(STORAGE_KEYS.incidents)) {
    localStorage.setItem(STORAGE_KEYS.incidents, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.activities)) {
    const now = Date.now();
    const seedActivities = [
      { icon: 'fa-box-open', color: 'blue', text: 'Stock count reconciled for Warehouse B', time: new Date(now - 1000 * 60 * 40).toISOString() },
      { icon: 'fa-triangle-exclamation', color: 'amber', text: 'Low stock flagged for Potassium Hydroxide', time: new Date(now - 1000 * 60 * 60 * 3).toISOString() },
      { icon: 'fa-truck-ramp-box', color: 'teal', text: 'New shipment of Ethanol received (200 L)', time: new Date(now - 1000 * 60 * 60 * 20).toISOString() },
      { icon: 'fa-shield-heart', color: 'red', text: 'Safety inspection completed — Tank Room A', time: new Date(now - 1000 * 60 * 60 * 30).toISOString() },
      { icon: 'fa-file-circle-check', color: 'blue', text: 'Monthly compliance report generated', time: new Date(now - 1000 * 60 * 60 * 50).toISOString() },
    ];
    localStorage.setItem(STORAGE_KEYS.activities, JSON.stringify(seedActivities));
  }
  if (!localStorage.getItem(STORAGE_KEYS.company)) {
    localStorage.setItem(STORAGE_KEYS.company, JSON.stringify({
      name: 'Sudarshan Chemical Industries Ltd.',
      email: 'operations@sudarshan.com',
      phone: '+91 20 6645 8000',
      address: 'Mahad MIDC, Raigad,Maharashtra,India',
      license: 'SCI-MH-2026-001'
    }));
  }
  if (localStorage.getItem(STORAGE_KEYS.notifications) === null) {
    localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(true));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ppe)) {
    localStorage.setItem(STORAGE_KEYS.ppe, JSON.stringify({}));
  }
}

function resetSampleData() {
  localStorage.removeItem(STORAGE_KEYS.chemicals);
  localStorage.removeItem(STORAGE_KEYS.incidents);
  localStorage.removeItem(STORAGE_KEYS.activities);
  localStorage.removeItem(STORAGE_KEYS.company);
  localStorage.removeItem(STORAGE_KEYS.ppe);
  seedDataIfNeeded();
}

/* -------------------------------------------------------------------- */
/* Chemicals CRUD                                                        */
/* -------------------------------------------------------------------- */

function getChemicals() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.chemicals) || '[]');
}

function saveChemicals(list) {
  localStorage.setItem(STORAGE_KEYS.chemicals, JSON.stringify(list));
}

function addChemical(chem) {
  const list = getChemicals();
  const record = { id: generateId('CHM'), dateAdded: new Date().toISOString().slice(0, 10), ...chem };
  list.unshift(record);
  saveChemicals(list);
  addActivity({ icon: 'fa-flask', color: 'teal', text: `${record.name} added to inventory`, time: new Date().toISOString() });
  return record;
}

function updateChemical(id, updates) {
  const list = getChemicals();
  const idx = list.findIndex(c => c.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  saveChemicals(list);
  addActivity({ icon: 'fa-pen', color: 'blue', text: `${list[idx].name} record updated`, time: new Date().toISOString() });
  return list[idx];
}

function deleteChemical(id) {
  const list = getChemicals();
  const target = list.find(c => c.id === id);
  const next = list.filter(c => c.id !== id);
  saveChemicals(next);
  if (target) {
    addActivity({ icon: 'fa-trash', color: 'red', text: `${target.name} removed from inventory`, time: new Date().toISOString() });
  }
  return target;
}

/* -------------------------------------------------------------------- */
/* Incidents                                                             */
/* -------------------------------------------------------------------- */

function getIncidents() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.incidents) || '[]');
}

function addIncident(incident) {
  const list = getIncidents();
  const record = { id: generateId('INC'), submittedAt: new Date().toISOString(), ...incident };
  list.unshift(record);
  localStorage.setItem(STORAGE_KEYS.incidents, JSON.stringify(list));
  addActivity({ icon: 'fa-triangle-exclamation', color: 'red', text: `Incident reported: ${incident.type} — ${incident.department}`, time: new Date().toISOString() });
  return record;
}

/* -------------------------------------------------------------------- */
/* Activities (recent activity timeline)                                 */
/* -------------------------------------------------------------------- */

function getActivities() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.activities) || '[]');
}

function addActivity(activity) {
  const list = getActivities();
  list.unshift(activity);
  localStorage.setItem(STORAGE_KEYS.activities, JSON.stringify(list.slice(0, 25)));
}

/* -------------------------------------------------------------------- */
/* Company info / settings                                               */
/* -------------------------------------------------------------------- */

function getCompanyInfo() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.company) || '{}');
}

function saveCompanyInfo(info) {
  localStorage.setItem(STORAGE_KEYS.company, JSON.stringify(info));
}

function getNotificationsEnabled() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.notifications) ?? 'true');
}

function setNotificationsEnabled(val) {
  localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(val));
}

function getPPEState() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.ppe) || '{}');
}

function setPPEState(state) {
  localStorage.setItem(STORAGE_KEYS.ppe, JSON.stringify(state));
}

// Ensure sample data exists as soon as this script loads, on every page
seedDataIfNeeded();
