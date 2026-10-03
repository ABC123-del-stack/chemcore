/* ==========================================================================
   reports.js — inventory summary, stock movement chart, low stock /
   expiring reports, CSV export, print
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  renderSummary();
  renderStockMovementChart();
  renderLowStockReport();
  renderExpiringReport();
  bindReportActions();
});

/* -------------------------------------------------------------------- */
/* Inventory summary tiles                                               */
/* -------------------------------------------------------------------- */

function renderSummary() {
  const chemicals = getChemicals().map(c => ({ ...c, status: computeStatus(c) }));
  const totalUnits = chemicals.reduce((s, c) => s + Number(c.quantity), 0);
  const categories = new Set(chemicals.map(c => c.category)).size;
  const lowStock = chemicals.filter(c => c.status === 'Low Stock').length;
  const expiringSoon = chemicals.filter(c => c.status === 'Expiring Soon' || c.status === 'Expired').length;

  setText('#repTotalChemicals', formatNumber(chemicals.length));
  setText('#repTotalUnits', formatNumber(totalUnits));
  setText('#repCategories', formatNumber(categories));
  setText('#repAttentionItems', formatNumber(lowStock + expiringSoon));
}

function setText(sel, text) { const el = $(sel); if (el) el.textContent = text; }

/* -------------------------------------------------------------------- */
/* Monthly stock movement chart (deterministic mock trend)               */
/* -------------------------------------------------------------------- */

function seededRandom(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function renderStockMovementChart() {
  const canvas = $('#stockMovementChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const rand = seededRandom(2026);
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toLocaleDateString('en-US', { month: 'short' }));
  }

  const baseline = getChemicals().reduce((s, c) => s + Number(c.quantity), 0) || 2000;
  const inbound = months.map(() => Math.round(baseline * (0.06 + rand() * 0.05)));
  const outbound = months.map(() => Math.round(baseline * (0.04 + rand() * 0.05)));

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,60,0.06)';
  const textColor = isDark ? '#a9b8d1' : '#4c5c76';

  new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Stock In',
          data: inbound,
          borderColor: '#2e73e5',
          backgroundColor: 'rgba(46,115,229,0.12)',
          tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: '#2e73e5',
        },
        {
          label: 'Stock Out',
          data: outbound,
          borderColor: '#14a89b',
          backgroundColor: 'rgba(20,168,155,0.12)',
          tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: '#14a89b',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor, boxWidth: 10, font: { size: 11.5 } } },
        tooltip: { backgroundColor: '#0e1b32', padding: 10, cornerRadius: 8 },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
      },
    },
  });
}

/* -------------------------------------------------------------------- */
/* Low Stock report                                                      */
/* -------------------------------------------------------------------- */

function renderLowStockReport() {
  const container = $('#lowStockReport');
  if (!container) return;
  const items = getChemicals()
    .map(c => ({ ...c, status: computeStatus(c) }))
    .filter(c => c.status === 'Low Stock' || c.status === 'Out of Stock');

  if (items.length === 0) {
    container.innerHTML = simpleEmpty('fa-boxes-stacked', 'Stock levels are healthy', 'No chemicals are currently below their reorder threshold.');
    return;
  }

  container.innerHTML = items.map(c => `
    <div class="report-list-item">
      <div class="r-main">
        <strong>${escapeHTML(c.name)}</strong>
        <span>${escapeHTML(c.category)} · ${escapeHTML(c.location)}</span>
      </div>
      <span class="badge ${getStatusMeta(c.status).badge}">${escapeHTML(c.status)}</span>
      <span class="r-qty">${formatNumber(c.quantity)} ${escapeHTML(c.unit)}</span>
    </div>
  `).join('');
}

/* -------------------------------------------------------------------- */
/* Expiring Chemicals list                                               */
/* -------------------------------------------------------------------- */

function renderExpiringReport() {
  const container = $('#expiringReport');
  if (!container) return;
  const items = getChemicals()
    .map(c => ({ ...c, status: computeStatus(c), daysLeft: daysUntil(c.expiryDate) }))
    .filter(c => c.status === 'Expiring Soon' || c.status === 'Expired')
    .sort((a, b) => a.daysLeft - b.daysLeft);

  if (items.length === 0) {
    container.innerHTML = simpleEmpty('fa-calendar-check', 'Nothing expiring soon', 'All chemicals are within a safe shelf-life window.');
    return;
  }

  container.innerHTML = items.map(c => `
    <div class="report-list-item">
      <div class="r-main">
        <strong>${escapeHTML(c.name)}</strong>
        <span>${escapeHTML(c.category)} · Expires ${formatDate(c.expiryDate)}</span>
      </div>
      <span class="badge ${getStatusMeta(c.status).badge}">${c.daysLeft < 0 ? 'Expired' : c.daysLeft + ' days left'}</span>
    </div>
  `).join('');
}

function simpleEmpty(icon, title, msg) {
  return `
    <div class="empty-state" style="padding:36px 16px;">
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="52" fill="var(--bg-input)"/>
        <circle cx="60" cy="60" r="52" stroke="var(--border-medium)" stroke-width="1.5"/>
        <foreignObject x="30" y="30" width="60" height="60">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--text-muted);">
            <i class="fa-solid ${icon}"></i>
          </div>
        </foreignObject>
      </svg>
      <h4>${escapeHTML(title)}</h4>
      <p>${escapeHTML(msg)}</p>
    </div>`;
}

/* -------------------------------------------------------------------- */
/* Actions: export CSV / print                                           */
/* -------------------------------------------------------------------- */

function bindReportActions() {
  $('#exportCsvBtn')?.addEventListener('click', () => {
    const chemicals = getChemicals().map(c => ({ ...c, status: computeStatus(c) }));
    const headers = [
      { key: 'id', label: 'Chemical ID' }, { key: 'name', label: 'Chemical Name' },
      { key: 'category', label: 'Category' }, { key: 'quantity', label: 'Quantity' },
      { key: 'unit', label: 'Unit' }, { key: 'location', label: 'Storage Location' },
      { key: 'expiryDate', label: 'Expiry Date' }, { key: 'reorderLevel', label: 'Reorder Level' },
      { key: 'status', label: 'Status' },
    ];
    downloadBlob(arrayToCSV(chemicals, headers), `chemical-report-${new Date().toISOString().slice(0,10)}.csv`);
    showToast('Report exported', 'CSV file has been downloaded.', 'success');
  });

  $('#printReportBtn')?.addEventListener('click', () => window.print());
}
