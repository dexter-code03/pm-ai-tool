/* ═══════════════════════════════════════════════════════════
   PM AI TOOL — Wireframes View
   List + flow detail (horizontal strip with arrows; Stitch-ready)
   ═══════════════════════════════════════════════════════════ */

import { store } from '../data/store.js';
import { api, getToken } from '../data/api.js';
import { normalizeWireframeFromApi } from '../data/normalize.js';
import { showToast, renderNotifications } from '../components/notifications.js';
import { openModal } from '../components/modal.js';

let wfFilter = 'all';
/** When set, list view shows a single wireframe flow canvas */
let detailWfId = null;

export function clearWireframeDetailForNav() {
  detailWfId = null;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Ordered screens for flow view: seed `flowScreens` or generated placeholder frames */
function getFlowScreens(wf) {
  if (Array.isArray(wf.flowScreens) && wf.flowScreens.length) return wf.flowScreens;
  if (Array.isArray(wf._apiScreens) && wf._apiScreens.length) {
    return wf._apiScreens.map(s => ({
      id: s.id,
      title: s.title,
      prompt: s.prompt,
      screenshotUrl: s.screenshotUrl,
      htmlUrl: s.htmlUrl
    }));
  }
  const n = Math.min(Math.max(Number(wf.screens) || 4, 3), 8);
  const labels = [
    ['Landing', 'Browse', 'Detail', 'Cart', 'Checkout', 'Confirm'],
    ['Welcome', 'Permissions', 'Profile', 'Home', 'Discover', 'Settings'],
    ['Overview', 'Metrics', 'Report', 'Export', 'Share', 'Admin'],
    ['Keys', 'Endpoints', 'Logs', 'Billing', 'Team', 'Docs'],
    ['Variant A', 'Variant B', 'Results', 'Rollout', 'Analytics', 'Archive']
  ];
  const pick = labels[parseInt(wf.id.replace(/\D/g, '') || '0', 10) % labels.length];
  return Array.from({ length: n }, (_, i) => ({
    title: pick[i] || `Screen ${i + 1}`,
    prompt: `Step ${i + 1} in ${wf.title}.`,
    screenshotUrl: `https://picsum.photos/seed/${encodeURIComponent(wf.id)}-step-${i}/480/300`,
    htmlUrl: null
  }));
}

export function renderWireframes() {
  const container = document.getElementById('wireframesContent');
  if (!container) return;

  if (detailWfId) {
    showWireframeDetail(detailWfId);
    return;
  }

  const allWireframes = store.getWireframes();
  const wireframes = filterWireframesList(allWireframes);
  const totalScreens = allWireframes.reduce((sum, w) => sum + (Number(w.screens) || 0), 0);
  const figmaSynced = allWireframes.filter(w => w.figma).length;

  container.innerHTML = `
    <div class="stats-row">
      <div class="stat-card teal">
        <div class="stat-label">Total Wireframes</div>
        <div class="stat-value">${allWireframes.length}</div>
        <div class="stat-sub"><span>+${Math.min(allWireframes.length, 2)}</span> this sprint</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-label">Total Screens</div>
        <div class="stat-value">${totalScreens}</div>
        <div class="stat-sub">Across all projects</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">Figma Synced</div>
        <div class="stat-value">${figmaSynced}</div>
        <div class="stat-sub">Bidirectional active</div>
      </div>
      <div class="stat-card amber">
        <div class="stat-label">Avg Gen Time</div>
        <div class="stat-value">2.1<span style="font-size:16px;font-weight:500;color:var(--text-muted)">m</span></div>
        <div class="stat-sub">Target &lt; 3 min ✓</div>
      </div>
    </div>

    <div class="section-header">
      <h2>Wireframe Projects</h2>
      <div class="count">${allWireframes.length}</div>
      <div class="section-header-actions">
        <div class="tab-bar" id="wfTabs">
          <button class="tab ${wfFilter === 'all' ? 'active' : ''}" data-wf-filter="all">All</button>
          <button class="tab ${wfFilter === 'linked' ? 'active' : ''}" data-wf-filter="linked">Linked to PRD</button>
          <button class="tab ${wfFilter === 'standalone' ? 'active' : ''}" data-wf-filter="standalone">Standalone</button>
        </div>
      </div>
    </div>

    <div class="wf-grid" id="wfGrid">
      ${wireframes.length === 0 ? `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🎨</div>
          <div class="empty-title">${wfFilter === 'all' ? 'No Wireframes Yet' : 'No matching wireframes'}</div>
          <div class="empty-sub">Create a wireframe from a brief, screenshots, or component library</div>
          <button class="btn btn-primary" id="emptyWfBtn" style="margin-top:12px">🎨 Create Wireframe</button>
        </div>
      ` : wireframes.map(renderWfCard).join('')}
      ${wireframes.length > 0 ? `
      <div class="wf-new-card" id="newWfCard">
        <div class="plus">＋</div>
        <p>Create New Wireframe</p>
        <div style="font-size:11.5px;color:inherit;opacity:0.7">From brief, PRD, or screenshots</div>
      </div>` : ''}
    </div>
  `;

  container.querySelectorAll('[data-wf-filter]').forEach(tab => {
    tab.addEventListener('click', () => {
      wfFilter = tab.dataset.wfFilter;
      renderWireframes();
    });
  });

  document.getElementById('newWfCard')?.addEventListener('click', () => openModal('wireframeModal'));
  document.getElementById('emptyWfBtn')?.addEventListener('click', () => openModal('wireframeModal'));

  container.querySelectorAll('[data-wf-action="view"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      detailWfId = btn.dataset.wfId;
      renderWireframes();
    });
  });

  container.querySelectorAll('[data-wf-action="figma"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showToast('🎨 Opening in Figma…', 'info');
    });
  });
  container.querySelectorAll('[data-wf-action="edit"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showToast('✏️ Opening AI editor…', 'info');
    });
  });
  container.querySelectorAll('[data-wf-action="link"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showToast('🔗 Link to PRD…', 'info');
    });
  });
  container.querySelectorAll('[data-wf-action="delete"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wfId = btn.dataset.wfId;
      const wf = store.getWireframe(wfId);
      if (wf && confirm(`Delete wireframe "${wf.title}"?`)) {
        store.deleteWireframe(wfId);
        showToast('🗑️ Wireframe deleted', 'warn');
        renderNotifications();
        renderWireframes();
      }
    });
  });

  const navBadge = document.querySelector('.nav-item[data-view="wireframes"] .nav-badge');
  if (navBadge) navBadge.textContent = allWireframes.length;
}

function filterWireframesList(wireframes) {
  if (wfFilter === 'linked') return wireframes.filter(w => w.linkedPrd);
  if (wfFilter === 'standalone') return wireframes.filter(w => !w.linkedPrd);
  return wireframes;
}

function renderWfCard(wf) {
  const screens = (wf.preview || []).map((screen) => {
    if (screen.screenshotUrl) {
      return `<div class="wf-screen" style="padding:0;overflow:hidden;background:#111">
        <img src="${escapeHtml(screen.screenshotUrl)}" alt="" style="width:100%;height:100%;object-fit:cover" loading="lazy">
      </div>`;
    }
    const style = screen.opacity ? `opacity:${screen.opacity}` : '';
    const bars = (screen.bars || []).map(b =>
      `<div class="wf-screen-bar ${b.cls || ''}" ${b.style ? `style="${b.style}"` : ''}></div>`
    ).join('');
    const box = screen.box ? '<div class="wf-screen-box"></div>' : '';
    const smallBox = screen.smallBox ? '<div class="wf-screen-box" style="flex:0.5"></div>' : '';
    const accent = screen.accent ? `<div class="wf-screen-bar ${screen.accent.cls || ''}" ${screen.accent.style ? `style="${screen.accent.style}"` : ''}></div>` : '';
    return `<div class="wf-screen" ${style ? `style="${style}"` : ''}>${bars}${smallBox}${box}${accent}</div>`;
  }).join('');

  const linkedPrd = wf.linkedPrd ? store.getPRD(wf.linkedPrd) : null;

  return `
    <div class="wf-card" data-wf-id="${wf.id}">
      <div class="wf-preview">
        <div class="wf-screens">${screens}</div>
      </div>
      <div class="wf-card-info">
        <div class="wf-card-title">${wf.title}</div>
        <div class="wf-card-meta">
          <span class="screens-count">${wf.screens} screens</span>
          <span>·</span>
          ${wf.figma ? '<span class="figma-badge">🎨 Figma</span>' : '<span style="font-size:11px;color:var(--text-muted)">Standalone</span>'}
          <span>·</span>
          <span>Updated ${wf.updated}</span>
        </div>
        ${linkedPrd ? `<div style="margin-top:6px;font-size:11px;color:var(--text-muted)">🔗 Linked: ${linkedPrd.title}</div>` : ''}
        <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
          <button class="link-btn primary" type="button" data-wf-action="view" data-wf-id="${wf.id}">View flow</button>
          <button class="link-btn secondary" data-wf-action="figma">View in Figma</button>
          <button class="link-btn secondary" data-wf-action="${wf.linkedPrd ? 'edit' : 'link'}">${wf.linkedPrd ? 'Edit' : 'Link PRD'}</button>
          <button class="link-btn secondary" data-wf-action="delete" data-wf-id="${wf.id}" style="color:var(--red)">Delete</button>
        </div>
      </div>
    </div>
  `;
}

function showWireframeDetail(wfId) {
  const container = document.getElementById('wireframesContent');
  if (!container) return;

  const wf = store.getWireframe(wfId);
  if (!wf) {
    detailWfId = null;
    renderWireframes();
    return;
  }

  const screens = getFlowScreens(wf);
  const linkedPrd = wf.linkedPrd ? store.getPRD(wf.linkedPrd) : null;

  container.innerHTML = `
    <div style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-ghost" type="button" id="wfBackBtn" style="font-size:12px">← Back to Wireframes</button>
      ${linkedPrd ? `<span style="font-size:12px;color:var(--text-muted)">🔗 ${escapeHtml(linkedPrd.title)}</span>` : ''}
    </div>
    <div class="section-header">
      <h2>${escapeHtml(wf.title)}</h2>
      <div class="count">${screens.length} screens</div>
    </div>
    <p style="font-size:11px;color:var(--text-muted);margin:8px 0 16px">Flow: left → right (same order as the journey). Demo uses placeholder frames; with a Stitch backend, screenshots replace these.</p>
    <div class="wf-flow-strip" role="list" aria-label="Wireframe screen flow">
      ${screens.map((s, i) => {
        const label = s.title || `Screen ${i + 1}`;
        const shot = s.screenshotUrl
          ? `<img src="${escapeHtml(s.screenshotUrl)}" alt="${escapeHtml(label)}" loading="lazy">`
          : `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:12px">No preview</div>`;
        const htmlLink = s.htmlUrl
          ? `<a href="${escapeHtml(s.htmlUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;margin-top:6px;display:inline-block;color:var(--teal)">Open HTML →</a>`
          : '';
        const screenId = s.id || '';
        const nlEdit = screenId && getToken()
          ? `<div style="margin-top:10px;width:100%">
              <label style="font-size:10px;color:var(--text-muted)">Edit with instruction</label>
              <input type="text" class="input-field wf-nl-edit" data-screen-id="${escapeHtml(screenId)}" placeholder="e.g. Make the header larger" style="width:100%;margin-top:4px;font-size:12px;padding:6px 8px">
              <button type="button" class="btn btn-secondary wf-nl-apply" data-wf-id="${escapeHtml(wf.id)}" data-screen-id="${escapeHtml(screenId)}" style="font-size:11px;margin-top:6px">Apply edit</button>
            </div>`
          : screenId && !getToken()
            ? `<p style="font-size:10px;color:var(--text-muted);margin-top:8px">Sign in to edit screens with AI.</p>`
            : `<p style="font-size:10px;color:var(--text-muted);margin-top:8px">Server-synced screens get edit IDs after generation.</p>`;
        const node = `
          <div class="wf-flow-node" role="listitem">
            <div class="wf-flow-card">
              <div class="wf-flow-shot">${shot}</div>
              <div class="wf-flow-meta">
                <div class="wf-flow-title">${escapeHtml(label)}</div>
                ${s.prompt ? `<div class="wf-flow-prompt">${escapeHtml(s.prompt)}</div>` : ''}
                ${htmlLink}
                ${nlEdit}
              </div>
            </div>
          </div>`;
        const arrow = i < screens.length - 1
          ? `<div class="wf-flow-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></div>`
          : '';
        return node + arrow;
      }).join('')}
    </div>
  `;

  document.getElementById('wfBackBtn')?.addEventListener('click', () => {
    detailWfId = null;
    renderWireframes();
  });

  container.querySelectorAll('.wf-nl-apply').forEach(btn => {
    btn.addEventListener('click', async () => {
      const wfId = btn.dataset.wfId;
      const screenId = btn.dataset.screenId;
      const input = btn.parentElement?.querySelector('.wf-nl-edit');
      const instruction = input?.value?.trim();
      if (!instruction) {
        showToast('Enter an instruction first', 'warn');
        return;
      }
      btn.disabled = true;
      try {
        showToast('Editing screen…', 'info');
        await api.editWireframeScreen(wfId, { screenId, instruction });
        const data = await api.getWireframe(wfId);
        const raw = data.wireframe || data;
        store.mergeWireframeFromApi(normalizeWireframeFromApi(raw));
        showToast('Screen updated', 'success');
        renderWireframes();
      } catch (e) {
        showToast(e.message || 'Edit failed', 'error');
      } finally {
        btn.disabled = false;
      }
    });
  });
}
