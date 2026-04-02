/* ═══════════════════════════════════════════════════════════
   PM AI TOOL — Router (hash-based view switching)
   ═══════════════════════════════════════════════════════════ */

import { renderDashboard } from '../views/dashboard.js';
import { renderEditor } from '../views/editor.js';
import { renderWireframes, clearWireframeDetailForNav } from '../views/wireframes.js';
import { renderSettings } from '../views/settings.js';
import { renderTemplates } from '../views/templates.js';
import { showToast } from './notifications.js';

let currentView = 'prd-dashboard';
let currentPrdId = null;

export function getCurrentView() { return currentView; }
export function getCurrentPrdId() { return currentPrdId; }

export function switchView(id, prdId = null) {
  currentView = id;
  currentPrdId = prdId;

  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  // Show target view
  const view = document.getElementById('view-' + id);
  if (view) {
    view.classList.add('active');
    view.classList.add('fade-in');
    setTimeout(() => view.classList.remove('fade-in'), 400);
  }

  // Update sidebar nav
  document.querySelectorAll('.nav-item[data-view]').forEach(n => n.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-view="${id}"]`);
  if (activeNav) activeNav.classList.add('active');

  // Update breadcrumb + CTA
  updateTopbar(id);

  if (id !== 'wireframes') clearWireframeDetailForNav();

  // Render view content
  switch (id) {
    case 'prd-dashboard': renderDashboard(); break;
    case 'prd-editor': void renderEditor(prdId).catch(() => {}); break;
    case 'wireframes': renderWireframes(); break;
    case 'templates': renderTemplates(); break;
    case 'settings': renderSettings(); break;
  }

  // Update hash
  if (id === 'prd-editor' && prdId) {
    history.replaceState(null, '', `#/editor/${prdId}`);
  } else {
    history.replaceState(null, '', `#/${id}`);
  }
}

function updateTopbar(id) {
  const crumb = document.getElementById('breadcrumb');
  const cta = document.getElementById('mainCTA');

  if (id === 'prd-dashboard') {
    crumb.innerHTML = '<span class="current">PRD Documents</span>';
    cta.innerHTML = `<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg> New PRD`;
    cta.onclick = () => openModal('generateModal');
    cta.style.display = '';
  } else if (id === 'wireframes') {
    crumb.innerHTML = '<span>Workspace</span><span class="sep">›</span><span class="current">Wireframes</span>';
    cta.innerHTML = `<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg> New Wireframe`;
    cta.onclick = () => openModal('wireframeModal');
    cta.style.display = '';
  } else if (id === 'prd-editor') {
    crumb.innerHTML = `<span onclick="window.__switchView('prd-dashboard')" style="cursor:pointer;color:var(--text-muted)">PRD Documents</span><span class="sep">›</span><span class="current">Editing</span>`;
    cta.style.display = 'none';
  } else if (id === 'templates') {
    crumb.innerHTML = '<span>Workspace</span><span class="sep">›</span><span class="current">Template Library</span>';
    cta.style.display = 'none';
  } else if (id === 'settings') {
    crumb.innerHTML = '<span>Workspace</span><span class="sep">›</span><span class="current">Settings</span>';
    cta.style.display = 'none';
  }
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

// Expose to global for inline onclick in breadcrumb
window.__switchView = switchView;

export function initRouter() {
  // Parse initial hash
  const hash = location.hash || '#/prd-dashboard';
  const parts = hash.replace('#/', '').split('/');

  if (parts[0] === 'editor' && parts[1]) {
    switchView('prd-editor', parts[1]);
  } else if (parts[0] === 'wireframes') {
    switchView('wireframes');
  } else if (parts[0] === 'templates') {
    switchView('templates');
  } else if (parts[0] === 'settings') {
    switchView('settings');
  } else {
    switchView('prd-dashboard');
  }
}
