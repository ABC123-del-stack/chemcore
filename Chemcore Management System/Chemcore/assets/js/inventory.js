/* ==========================================================================
   inventory.js — chemical inventory table: CRUD, search, filter, sort,
   pagination, add/edit modals, delete confirmation
   ========================================================================== */

const invState = {
  search: '',
  category: 'all',
  status: 'all',
  sortKey: 'name',
  sortDir: 'asc',
  page: 1,
  pageSize: 8,
  editingId: null,
};

document.addEventListener('DOMContentLoaded', () => {
  populateCategoryFilter();
  bindInventoryControls();
  applyURLParams();
  renderInventoryTable();
});

/* -------------------------------------------------------------------- */
/* Setup                                                                 */
/* -------------------------------------------------------------------- */

function populateCategoryFilter() {
  const selects = ['#categoryFilter', '#chemCategory'];
  selects.forEach(sel => {
    const el = $(sel);
    if (!el) return;
    const isFilter = sel === '#categoryFilter';
    el.innerHTML = (isFilter ? '<option value="all">All Categories</option>' : '<option value="">Select category</option>')
      + CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
  });
}

function applyURLParams() {
  const params = new URLSearchParams(location.search);
  if (params.get('action') === 'add') {
    setTimeout(() => openAddModal(), 200);
  }
  const q = params.get('q');
  if (q) {
    invState.search = q;
    const input = $('#invSearchInput');
    if (input) input.value = q;
  }
}

function bindInventoryControls() {
  $('#invSearchInput')?.addEventListener('input', debounce((e) => {
    invState.search = e.target.value.trim().toLowerCase();
    invState.page = 1;
    renderInventoryTable();
  }, 200));

  $('#categoryFilter')?.addEventListener('change', (e) => {
    invState.category = e.target.value;
    invState.page = 1;
    renderInventoryTable();
  });

  $('#statusFilter')?.addEventListener('change', (e) => {
    invState.status = e.target.value;
    invState.page = 1;
    renderInventoryTable();
  });

  $$('.data-table thead th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sortKey;
      if (invState.sortKey === key) {
        invState.sortDir = invState.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        invState.sortKey = key;
        invState.sortDir = 'asc';
      }
      renderInventoryTable();
    });
  });

  $('#addChemicalBtn')?.addEventListener('click', () => openAddModal());
  $('#emptyAddChemicalBtn')?.addEventListener('click', () => openAddModal());
  $('#chemForm')?.addEventListener('submit', handleFormSubmit);
}

/* -------------------------------------------------------------------- */
/* Data pipeline: filter -> sort -> paginate                             */
/* -------------------------------------------------------------------- */

function getFilteredSortedChemicals() {
  let list = getChemicals().map(c => ({ ...c, status: computeStatus(c) }));

  if (invState.search) {
    const q = invState.search;
    list = list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  }
  if (invState.category !== 'all') list = list.filter(c => c.category === invState.category);
  if (invState.status !== 'all') list = list.filter(c => c.status === invState.status);

  const { sortKey, sortDir } = invState;
  list.sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (sortKey === 'quantity') { av = Number(av); bv = Number(bv); }
    if (sortKey === 'expiryDate') { av = new Date(av).getTime(); bv = new Date(bv).getTime(); }
    if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return list;
}

/* -------------------------------------------------------------------- */
/* Render                                                                */
/* -------------------------------------------------------------------- */

function renderInventoryTable() {
  const tbody = $('#inventoryTbody');
  const emptyState = $('#inventoryEmptyState');
  const tableWrap = $('#inventoryTableWrap');
  if (!tbody) return;

  const filtered = getFilteredSortedChemicals();
  const totalPages = Math.max(1, Math.ceil(filtered.length / invState.pageSize));
  invState.page = clamp(invState.page, 1, totalPages);

  const start = (invState.page - 1) * invState.pageSize;
  const pageItems = filtered.slice(start, start + invState.pageSize);

  // Update sort indicators
  $$('.data-table thead th.sortable').forEach(th => {
    th.classList.toggle('sort-active', th.dataset.sortKey === invState.sortKey);
    const icon = th.querySelector('.sort-ico');
    if (icon) icon.className = `fa-solid sort-ico ${invState.sortDir === 'asc' ? 'fa-arrow-up-short-wide' : 'fa-arrow-down-wide-short'}`;
  });

  if (filtered.length === 0) {
    tableWrap.classList.add('hidden');
    emptyState.classList.remove('hidden');
    $('#paginationBar')?.classList.add('hidden');
    setText('#invResultCount', '0 chemicals');
    return;
  }

  tableWrap.classList.remove('hidden');
  emptyState.classList.add('hidden');
  $('#paginationBar')?.classList.remove('hidden');
  setText('#invResultCount', `${filtered.length} chemical${filtered.length === 1 ? '' : 's'}`);

  tbody.innerHTML = pageItems.map(c => {
    const meta = getStatusMeta(c.status);
    const daysLeft = daysUntil(c.expiryDate);
    return `
    <tr>
      <td class="cell-primary">${escapeHTML(c.name)}</td>
      <td class="cell-mono">${escapeHTML(c.id)}</td>
      <td><span class="category-chip">${escapeHTML(c.category)}</span></td>
      <td>${formatNumber(c.quantity)}</td>
      <td class="cell-muted">${escapeHTML(c.unit)}</td>
      <td>${escapeHTML(c.location)}</td>
      <td class="${daysLeft < 0 ? 'text-danger' : daysLeft <= 30 ? 'text-warning' : ''}">${formatDate(c.expiryDate)}</td>
      <td><span class="badge ${meta.badge}">${escapeHTML(c.status)}</span></td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" data-tooltip="Edit" onclick="openEditModal('${c.id}')"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn" data-tooltip="Delete" onclick="handleDeleteChemical('${c.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');

  renderPagination(filtered.length, totalPages);
}

function setText(sel, text) { const el = $(sel); if (el) el.textContent = text; }

function renderPagination(totalItems, totalPages) {
  const controls = $('#paginationControls');
  const info = $('#paginationInfo');
  if (!controls) return;

  const start = (invState.page - 1) * invState.pageSize + 1;
  const end = Math.min(invState.page * invState.pageSize, totalItems);
  info.textContent = `Showing ${start}–${end} of ${totalItems}`;

  let html = `<button class="page-btn" ${invState.page === 1 ? 'disabled' : ''} onclick="gotoPage(${invState.page - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && i !== 1 && i !== totalPages && Math.abs(i - invState.page) > 1) {
      if (i === 2 || i === totalPages - 1) html += `<span style="padding:0 4px;color:var(--text-muted);">…</span>`;
      continue;
    }
    html += `<button class="page-btn ${i === invState.page ? 'active' : ''}" onclick="gotoPage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" ${invState.page === totalPages ? 'disabled' : ''} onclick="gotoPage(${invState.page + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;
  controls.innerHTML = html;
}

function gotoPage(p) {
  invState.page = p;
  renderInventoryTable();
}

/* -------------------------------------------------------------------- */
/* Add / Edit modal                                                      */
/* -------------------------------------------------------------------- */

function openAddModal() {
  invState.editingId = null;
  $('#chemForm').reset();
  clearAllFieldErrors();
  setText('#chemModalTitle', 'Add Chemical');
  setText('#chemSubmitBtnText', 'Add Chemical');
  $('#chemId').value = '';
  openModal('chemModal');
}

function openEditModal(id) {
  const chem = getChemicals().find(c => c.id === id);
  if (!chem) return;
  invState.editingId = id;
  clearAllFieldErrors();
  setText('#chemModalTitle', 'Edit Chemical');
  setText('#chemSubmitBtnText', 'Save Changes');

  $('#chemId').value = chem.id;
  $('#chemName').value = chem.name;
  $('#chemCategory').value = chem.category;
  $('#chemQuantity').value = chem.quantity;
  $('#chemUnit').value = chem.unit;
  $('#chemLocation').value = chem.location;
  $('#chemExpiry').value = chem.expiryDate;
  $('#chemReorderLevel').value = chem.reorderLevel;

  openModal('chemModal');
}

function clearAllFieldErrors() {
  $$('#chemForm .form-control').forEach(el => el.classList.remove('invalid'));
  $$('#chemForm .form-error').forEach(el => el.classList.remove('show'));
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

function handleFormSubmit(e) {
  e.preventDefault();

  const name = $('#chemName');
  const category = $('#chemCategory');
  const quantity = $('#chemQuantity');
  const unit = $('#chemUnit');
  const location = $('#chemLocation');
  const expiry = $('#chemExpiry');
  const reorder = $('#chemReorderLevel');

  let valid = true;
  valid = validateField(name, name.value.trim().length >= 2, 'Enter a valid chemical name.') && valid;
  valid = validateField(category, !!category.value, 'Select a category.') && valid;
  valid = validateField(quantity, quantity.value !== '' && Number(quantity.value) >= 0, 'Enter a valid quantity (0 or more).') && valid;
  valid = validateField(unit, !!unit.value, 'Select a unit.') && valid;
  valid = validateField(location, location.value.trim().length >= 2, 'Enter a storage location.') && valid;
  valid = validateField(expiry, !!expiry.value, 'Select an expiry date.') && valid;
  valid = validateField(reorder, reorder.value !== '' && Number(reorder.value) >= 0, 'Enter a valid reorder level.') && valid;

  if (!valid) return;

  const payload = {
    name: name.value.trim(),
    category: category.value,
    quantity: Number(quantity.value),
    unit: unit.value,
    location: location.value.trim(),
    expiryDate: expiry.value,
    reorderLevel: Number(reorder.value),
  };

  if (invState.editingId) {
    updateChemical(invState.editingId, payload);
    showToast('Chemical updated', `${payload.name} record has been saved.`, 'success');
  } else {
    addChemical(payload);
    showToast('Chemical added', `${payload.name} is now in inventory.`, 'success');
  }

  closeModal('chemModal');
  renderInventoryTable();
}

/* -------------------------------------------------------------------- */
/* Delete                                                                */
/* -------------------------------------------------------------------- */

async function handleDeleteChemical(id) {
  const chem = getChemicals().find(c => c.id === id);
  if (!chem) return;
  const ok = await confirmDialog({
    title: 'Delete this chemical?',
    message: `"${chem.name}" (${chem.id}) will be permanently removed from inventory. This cannot be undone.`,
    confirmText: 'Delete',
    danger: true,
  });
  if (!ok) return;
  deleteChemical(id);
  showToast('Chemical deleted', `${chem.name} was removed from inventory.`, 'success');
  renderInventoryTable();
}

/* Unit options — kept simple and shared across the Add/Edit form */
document.addEventListener('DOMContentLoaded', () => {
  const unitSelect = $('#chemUnit');
  if (unitSelect) {
    unitSelect.innerHTML = '<option value="">Select unit</option>' +
      ['L', 'mL', 'kg', 'g', 'ton', 'gal'].map(u => `<option value="${u}">${u}</option>`).join('');
  }
  const statusFilter = $('#statusFilter');
  if (statusFilter) {
    statusFilter.innerHTML = '<option value="all">All Statuses</option>' +
      ['Available', 'Low Stock', 'Out of Stock', 'Expiring Soon', 'Expired'].map(s => `<option value="${s}">${s}</option>`).join('');
  }
});
