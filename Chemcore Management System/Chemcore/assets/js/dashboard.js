/* ==========================================================================
   dashboard.js — KPI cards, charts, activity timeline, quick actions
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  renderKPIs();
  renderActivityTimeline();
  renderInventoryChart();
  renderCategoryChart();
  initQuickActions();
});

/* -------------------------------------------------------------------- */
/* KPI cards                                                             */
/* -------------------------------------------------------------------- */

function renderKPIs() {
  const chemicals = getChemicals().map(c => ({ ...c, status: computeStatus(c) }));

  const totalChemicals = chemicals.length;
  const availableStock = chemicals.reduce((sum, c) => sum + Number(c.quantity), 0);
  const lowStock = chemicals.filter(c => c.status === 'Low Stock').length;
  const safetyAlerts = chemicals.filter(c => ['Expired', 'Out of Stock', 'Expiring Soon'].includes(c.status)).length;

  setText('#kpiTotalChemicals', formatNumber(totalChemicals));
  setText('#kpiAvailableStock', formatNumber(availableStock) + ' units');
  setText('#kpiLowStock', formatNumber(lowStock));
  setText('#kpiSafetyAlerts', formatNumber(safetyAlerts));

  setText('#kpiTotalChemicalsSub', `Across ${new Set(chemicals.map(c => c.category)).size} categories`);
  setText('#kpiLowStockSub', lowStock > 0 ? 'Needs reordering' : 'All stocked well');
  setText('#kpiSafetyAlertsSub', safetyAlerts > 0 ? 'Requires attention' : 'No active risks');
}

function setText(sel, text) {
  const el = $(sel);
  if (el) el.textContent = text;
}

/* -------------------------------------------------------------------- */
/* Recent activity timeline                                              */
/* -------------------------------------------------------------------- */

function renderActivityTimeline() {
  const container = $('#activityTimeline');
  if (!container) return;
  const activities = getActivities().slice(0, 6);

  if (activities.length === 0) {
    container.innerHTML = emptyStateHTML('fa-clock-rotate-left', 'No recent activity', 'Actions like adding chemicals or reporting incidents will show up here.');
    return;
  }

  container.innerHTML = activities.map(a => `
    <div class="timeline-item">
      <div class="timeline-dot ${a.color || 'blue'}"></div>
      <div class="timeline-content">
        <p><i class="fa-solid ${a.icon || 'fa-circle-info'}" style="margin-right:7px;color:var(--text-muted);width:14px;"></i>${escapeHTML(a.text)}</p>
        <span>${timeAgo(a.time)}</span>
      </div>
    </div>
  `).join('');
}

function emptyStateHTML(icon, title, message, actionHTML = '') {
  return `
    <div class="empty-state">
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="52" fill="var(--bg-input)"/>
        <circle cx="60" cy="60" r="52" stroke="var(--border-medium)" stroke-width="1.5"/>
        <foreignObject x="30" y="30" width="60" height="60">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:26px;color:var(--text-muted);">
            <i class="fa-solid ${icon}"></i>
          </div>
        </foreignObject>
      </svg>
      <h4>${escapeHTML(title)}</h4>
      <p>${escapeHTML(message)}</p>
      ${actionHTML}
    </div>`;
}

/* -------------------------------------------------------------------- */
/* Chart.js — Inventory Status (stock vs reorder level by category)      */
/* -------------------------------------------------------------------- */

function renderInventoryChart() {
  const canvas = $('#inventoryStatusChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const chemicals = getChemicals();
  const byCategory = {};
  CATEGORIES.forEach(cat => byCategory[cat] = { stock: 0, reorder: 0 });
  chemicals.forEach(c => {
    if (!byCategory[c.category]) byCategory[c.category] = { stock: 0, reorder: 0 };
    byCategory[c.category].stock += Number(c.quantity);
    byCategory[c.category].reorder += Number(c.reorderLevel);
  });

  const labels = Object.keys(byCategory).filter(cat => byCategory[cat].stock > 0 || byCategory[cat].reorder > 0);
  const stockData = labels.map(l => byCategory[l].stock);
  const reorderData = labels.map(l => byCategory[l].reorder);

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,60,0.06)';
  const textColor = isDark ? '#a9b8d1' : '#4c5c76';

  new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Current Stock',
          data: stockData,
          backgroundColor: '#2e73e5',
          borderRadius: 6,
          maxBarThickness: 26,
        },
        {
          label: 'Reorder Threshold',
          data: reorderData,
          backgroundColor: '#2dd4bf',
          borderRadius: 6,
          maxBarThickness: 26,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#0e1b32', padding: 10, cornerRadius: 8 },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } }, beginAtZero: true },
      },
    },
  });
}

/* -------------------------------------------------------------------- */
/* Chart.js — Chemical Categories (pie)                                  */
/* -------------------------------------------------------------------- */

function renderCategoryChart() {
  const canvas = $('#categoryPieChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const chemicals = getChemicals();
  const counts = {};
  chemicals.forEach(c => { counts[c.category] = (counts[c.category] || 0) + 1; });

  const palette = ['#2e73e5', '#14a89b', '#5b93ec', '#2dd4bf', '#0b6b64', '#8592a8', '#123b82'];
  const labels = Object.keys(counts);
  const data = Object.values(counts);
  const colors = labels.map((_, i) => palette[i % palette.length]);

  new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: { legend: { display: false } },
    },
  });

  const legend = $('#categoryLegend');
  if (legend) {
    legend.innerHTML = labels.map((label, i) => `
      <li>
        <span class="dot" style="background:${colors[i]};"></span>
        ${escapeHTML(label)}
        <strong>${data[i]}</strong>
      </li>
    `).join('');
  }
}

/* -------------------------------------------------------------------- */
/* Quick actions                                                         */
/* -------------------------------------------------------------------- */

function initQuickActions() {
  $('#qaAddChemical')?.addEventListener('click', () => {
    window.location.href = 'inventory.html?action=add';
  });
  $('#qaReportIncident')?.addEventListener('click', () => {
    window.location.href = 'safety.html#incidentForm';
  });
  $('#qaGenerateReport')?.addEventListener('click', () => {
    window.location.href = 'reports.html';
  });
  $('#qaExportData')?.addEventListener('click', () => {
    const chemicals = getChemicals().map(c => ({ ...c, status: computeStatus(c) }));
    const headers = [
      { key: 'id', label: 'Chemical ID' }, { key: 'name', label: 'Chemical Name' },
      { key: 'category', label: 'Category' }, { key: 'quantity', label: 'Quantity' },
      { key: 'unit', label: 'Unit' }, { key: 'location', label: 'Storage Location' },
      { key: 'expiryDate', label: 'Expiry Date' }, { key: 'status', label: 'Status' },
    ];
    downloadBlob(arrayToCSV(chemicals, headers), `chemical-inventory-${new Date().toISOString().slice(0,10)}.csv`);
    showToast('Export ready', 'Inventory data exported as CSV.', 'success');
  });
}
