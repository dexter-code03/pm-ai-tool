/* ═══════════════════════════════════════════════════════════
   PM AI TOOL — Main Entry Point
   ═══════════════════════════════════════════════════════════ */

// ─── Styles ───
import './styles/variables.css';
import './styles/animations.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/editor.css';
import './styles/wireframe.css';
import './styles/templates.css';

// ─── Modules ───
import { switchView, initRouter } from './components/router.js';
import { showToast, toggleNotifPanel, closeNotifPanel, renderNotifications, initNotifCloseHandler } from './components/notifications.js';
import { initModals, openModal, closeModal } from './components/modal.js';
import { handleSearch } from './views/dashboard.js';
import { initAuth, refreshSidebarUser, logout } from './data/authBootstrap.js';

// ─── Init ───
document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  await refreshSidebarUser();

  window.addEventListener('pm-ai-auth-changed', async () => {
    initRouter();
    renderNotifications();
    await refreshSidebarUser();
  });

  // Initialize router (renders initial view)
  initRouter();

  // Initialize modals
  initModals();

  // Initialize notification system
  renderNotifications();
  initNotifCloseHandler();

  // ─── Sidebar Navigation ───
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      switchView(item.dataset.view);
    });
  });

  // ─── Notification Button ───
  document.getElementById('notifBtn')?.addEventListener('click', toggleNotifPanel);
  document.getElementById('notifClose')?.addEventListener('click', closeNotifPanel);

  // ─── Search Input ───
  let searchDebounce = null;
  document.getElementById('searchInput')?.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      handleSearch(e.target.value.trim());
    }, 200);
  });

  document.getElementById('sidebarLogout')?.addEventListener('click', () => logout());

  // ─── Sidebar quick actions ───
  document.getElementById('navWfStyles')?.addEventListener('click', () => showToast('🎨 Opening Wireframe Styles…', 'info'));
  document.getElementById('navJira')?.addEventListener('click', () => showToast('🔗 Jira connected', 'success'));
  document.getElementById('navFigma')?.addEventListener('click', () => showToast('🎨 Figma connected', 'success'));

  // ─── Modal Close Buttons ───
  document.getElementById('genModalClose')?.addEventListener('click', () => closeModal('generateModal'));
  document.getElementById('genModalCancel')?.addEventListener('click', () => closeModal('generateModal'));
  document.getElementById('wfModalClose')?.addEventListener('click', () => closeModal('wireframeModal'));
  document.getElementById('wfModalCancel')?.addEventListener('click', () => closeModal('wireframeModal'));

  // ─── Wireframe Modal Tabs ───
  document.querySelectorAll('#wireframeModal .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      tab.closest('.tab-bar').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // ─── Main CTA ───
  document.getElementById('mainCTA')?.addEventListener('click', () => {
    const currentView = document.querySelector('.view.active')?.id;
    if (currentView === 'view-wireframes') {
      openModal('wireframeModal');
    } else {
      openModal('generateModal');
    }
  });

  console.log('🚀 PM AI Tool initialized');
});
