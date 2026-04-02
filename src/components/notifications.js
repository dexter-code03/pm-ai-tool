/* ═══════════════════════════════════════════════════════════
   PM AI TOOL — Toast & Notification System (Enhanced)
   Toast stacking, notification CRUD, mark-read, clear
   ═══════════════════════════════════════════════════════════ */

import { store } from '../data/store.js';

const toastColors = { success: 'var(--green)', info: 'var(--indigo)', warn: 'var(--amber)', error: 'var(--red)' };
const toastIcons = { success: '✓', info: 'ℹ', warn: '⚠', error: '✕' };

export function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  // Limit max toasts
  while (container.children.length >= 5) {
    container.removeChild(container.firstChild);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  const color = toastColors[type] || 'var(--indigo)';
  const icon = toastIcons[type] || 'ℹ';
  toast.innerHTML = `
    <div class="toast-icon" style="color:${color};font-size:12px;font-weight:700;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${color}20">${icon}</div>
    <span style="flex:1">${msg}</span>
    <div class="toast-close" style="cursor:pointer;color:var(--text-muted);font-size:14px;padding-left:8px">✕</div>
  `;

  // Close on click
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('hide'); setTimeout(() => toast.remove(), 300); }, 4000);
}

let notifOpen = false;

export function toggleNotifPanel() {
  notifOpen = !notifOpen;
  document.getElementById('notifPanel').classList.toggle('open', notifOpen);
  if (notifOpen) renderNotifications();
}

export function closeNotifPanel() {
  notifOpen = false;
  document.getElementById('notifPanel').classList.remove('open');
}

export function renderNotifications() {
  const list = document.getElementById('notifList');
  if (!list) return;

  const notifs = store.getNotifications();
  const count = store.getUnreadCount();
  const countEl = document.querySelector('.notif-count');
  if (countEl) countEl.textContent = count;

  // Update bell badge
  const bellBtn = document.querySelector('.icon-btn.notif-dot');
  if (bellBtn) {
    if (count === 0) bellBtn.classList.remove('notif-dot');
    else bellBtn.classList.add('notif-dot');
  }

  // Mark all read button
  const markAllBtn = count > 0
    ? `<div class="notif-mark-all" id="markAllReadBtn" style="padding:10px 20px;text-align:right;border-bottom:1px solid var(--border)">
        <button class="link-btn primary" style="font-size:11px">Mark all as read (${count})</button>
       </div>`
    : '';

  list.innerHTML = markAllBtn + (notifs.length === 0
    ? `<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13px">
        <div style="font-size:28px;margin-bottom:8px">🔔</div>
        No notifications yet
       </div>`
    : notifs.map(n => `
      <div class="notif-item ${n.read ? 'read' : ''}" style="${n.read ? 'opacity:0.5' : ''}" data-id="${n.id}">
        <div class="notif-item-row">
          <div class="notif-dot-indicator" style="background:${n.read ? 'var(--bg-active)' : n.color}"></div>
          <div style="flex:1">
            <div class="notif-item-title">${n.title}</div>
            <div class="notif-item-sub">${n.sub}</div>
            <div class="notif-item-time">${n.time}</div>
          </div>
        </div>
      </div>
    `).join(''));

  // Click to mark read
  list.querySelectorAll('.notif-item:not(.read)').forEach(item => {
    item.addEventListener('click', () => {
      store.markRead(item.dataset.id);
      renderNotifications();
    });
  });

  // Mark all read
  document.getElementById('markAllReadBtn')?.addEventListener('click', () => {
    store.markAllRead();
    renderNotifications();
    showToast('✅ All notifications marked as read', 'success');
  });
}

// close notif on outside click
export function initNotifCloseHandler() {
  document.addEventListener('click', e => {
    if (notifOpen && !e.target.closest('#notifPanel') && !e.target.closest('.icon-btn.notif-dot')) {
      closeNotifPanel();
    }
  });
}
