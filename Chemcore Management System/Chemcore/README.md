# ChemCore — Smart Chemical Company Dashboard

A fully static, front-end-only enterprise dashboard for a chemical manufacturing
company. No build tools, no backend, no frameworks — just semantic HTML, modern
CSS, and vanilla JavaScript, persisted entirely in the browser's `localStorage`.

## Quick start

There's nothing to install or build. Open `index.html` in any modern browser
(or serve the folder with any static file server) and sign in with:

```
Email:    admin@chemcore.com
Password: admin123
```

(Any well-formed email + a 6+ character password will also work — the "Autofill
demo login" button on the sign-in screen fills the demo credentials for you.)

> Tip: for the smoothest experience (and so relative links behave exactly like
> a deployed site), serve the folder instead of double-clicking the file, e.g.
> `npx serve .` or VS Code's "Live Server" extension.

## Project structure

```
smart-chemical-dashboard/
├── index.html          Login page
├── dashboard.html       KPI cards, charts, activity feed, quick actions
├── inventory.html       Chemical inventory table (CRUD)
├── safety.html          Emergency contacts, PPE checklist, incident form
├── reports.html          Summaries, charts, CSV export, print
├── settings.html         Company info, theme, notifications, data reset
├── README.md
└── assets/
    ├── css/
    │   ├── variables.css   Design tokens (color, radius, shadow, spacing) incl. dark theme
    │   ├── base.css        Reset, typography, utilities, keyframes
    │   ├── layout.css      Sidebar, navbar, app shell grid
    │   ├── components.css  Buttons, cards, forms, tables, modals, toasts, etc.
    │   ├── pages.css        Page-specific styles (login hero, dashboard grid, …)
    │   └── responsive.css   Tablet / mobile breakpoints
    └── js/
        ├── utils.js     Small shared helpers ($ , formatDate, debounce, CSV, …)
        ├── storage.js    Sample data + all localStorage CRUD (single source of truth)
        ├── theme.js      Dark / light mode toggle + persistence
        ├── ui.js         Sidebar, dropdowns, toasts, modals, page loader, auth guard
        ├── auth.js       Login page logic
        ├── dashboard.js  KPIs, Chart.js charts, activity timeline, quick actions
        ├── inventory.js  Table render, search/filter/sort, pagination, add/edit/delete
        ├── safety.js     PPE checklist, incident form + log
        ├── reports.js     Summary tiles, stock movement chart, CSV export, print
        └── settings.js    Company info, notifications toggle, data reset
```

## Data & persistence

All data lives in `localStorage` under keys prefixed `scd_` (see
`STORAGE_KEYS` in `storage.js`):

| Key                        | Contents                                   |
|-----------------------------|---------------------------------------------|
| `scd_chemicals`             | 20 seeded chemicals + anything you add/edit |
| `scd_incidents`              | Submitted incident reports                  |
| `scd_activities`             | Recent activity feed (dashboard)            |
| `scd_company`                 | Company info (Settings page)                |
| `scd_notifications_enabled`  | Notification bell on/off                     |
| `scd_ppe_checklist`          | PPE checklist state                          |
| `scd_theme`                   | `light` / `dark`                              |
| `scd_logged_in`               | Session flag (client-side only, no real auth) |

A chemical's **status** (`Available`, `Low Stock`, `Out of Stock`, `Expiring
Soon`, `Expired`) is always computed live from its quantity, reorder level,
and expiry date (`computeStatus()` in `storage.js`) — so it's never stale
after an edit.

Use **Settings → Data Management → Reset Sample Data** at any time to wipe
your changes and restore the original 20 sample chemicals.

## Notes for developers

- Every page shares the same sidebar/navbar markup and loads the same CSS/JS
  bundle — there's no templating engine, so shell markup is duplicated across
  the five authenticated pages by design (keeps the project dependency-free).
- Charts use [Chart.js 4](https://www.chartjs.org/) via CDN.
- Icons use [Font Awesome 6](https://fontawesome.com/) via CDN.
- Fonts: Poppins (display/headings) + Inter (body/UI) via Google Fonts.
- All three CDN dependencies require an internet connection in the browser;
  everything else runs fully offline once loaded.
