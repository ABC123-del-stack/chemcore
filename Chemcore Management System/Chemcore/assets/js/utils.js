/* ==========================================================================
   utils.js — small shared helper functions
   ========================================================================== */

/** Shorthand query selectors */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/** Generate a short unique id, e.g. CHM-4821 */
function generateId(prefix = 'ID') {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${Date.now().toString().slice(-4)}${rand}`;
}

/** Format an ISO date string ("2026-08-01") into "Aug 01, 2026" */
function formatDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr + 'T00:00:00');
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

/** Format a relative "time ago" string from an ISO datetime */
function timeAgo(isoStr) {
  const then = new Date(isoStr).getTime();
  const now = Date.now();
  const diffSec = Math.max(1, Math.floor((now - then) / 1000));
  const units = [
    ['year', 31536000], ['month', 2592000], ['day', 86400],
    ['hour', 3600], ['minute', 60], ['second', 1]
  ];
  for (const [name, secs] of units) {
    const val = Math.floor(diffSec / secs);
    if (val >= 1) return `${val} ${name}${val > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

/** Days between today and a target ISO date (negative = already past) */
function daysUntil(isoStr) {
  const target = new Date(isoStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

/** Format a number with thousands separators */
function formatNumber(n) {
  return Number(n).toLocaleString('en-US');
}

/** Debounce helper for search inputs */
function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(null, args), delay);
  };
}

/** Escape a string for safe HTML insertion */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/** Get initials from a full name, e.g. "Alex Rivera" -> "AR" */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

/** Clamp a number between min/max */
function clamp(n, min, max) { return Math.min(Math.max(n, min), max); }

/** Trigger a client-side download of a Blob */
function downloadBlob(content, filename, type = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Convert an array of flat objects to a CSV string */
function arrayToCSV(rows, headers) {
  const escapeCell = (val) => {
    const s = String(val ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headerRow = headers.map(h => escapeCell(h.label)).join(',');
  const dataRows = rows.map(row => headers.map(h => escapeCell(row[h.key])).join(','));
  return [headerRow, ...dataRows].join('\n');
}
