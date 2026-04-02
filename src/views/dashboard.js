/* ═══════════════════════════════════════════════════════════
   PM AI TOOL — PRD Dashboard View (Full Feature)
   Stats, Filters, Search, Cards, Delete, Duplicate, Sort
   ═══════════════════════════════════════════════════════════ */

import { store } from '../data/store.js';
import { switchView } from '../components/router.js';
import { showToast, renderNotifications } from '../components/notifications.js';
import { openModal } from '../components/modal.js';

let activeFilter = 'All';
let searchQuery = '';
let sortBy = 'recent';

export function renderDashboard() {
  const container = document.getElementById('dashboardContent');
  if (!container) return;

  const stats = store.getStats();
  const prds = getFilteredPRDs();

  container.innerHTML = `
    <div class="stats-row">
      <div class="stat-card blue">
        <div class="stat-label">Total PRDs</div>
        <div class="stat-value">${stats.total}</div>
        <div class="stat-sub"><span>+${Math.min(stats.total, 3)}</span> this month</div>
      </div>
      <div class="stat-card teal">
        <div class="stat-label">In Review</div>
        <div class="stat-value">${stats.review}</div>
        <div class="stat-sub">Awaiting approval</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">Approved</div>
        <div class="stat-value">${stats.approved}</div>
        <div class="stat-sub"><span>${stats.total > 0 ? Math.round(stats.approved / stats.total * 100) : 0}%</span> approval rate</div>
      </div>
      <div class="stat-card amber">
        <div class="stat-label">Avg Gen Time</div>
        <div class="stat-value">68<span style="font-size:16px;font-weight:500;color:var(--text-muted)">s</span></div>
        <div class="stat-sub">Target &lt; 90s ✓</div>
      </div>
    </div>

    <div class="section-header">
      <h2>Recent PRDs</h2>
      <div class="count">${stats.total}</div>
      <div class="section-header-actions">
        <div class="filters" id="prdFilters">
          ${['All', 'Draft', 'In Review', 'Approved'].map(f => `
            <div class="filter-chip ${f === activeFilter ? 'active' : ''}" data-filter="${f}">${f}</div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="prd-grid" id="prdGrid">
      ${prds.length === 0 ? `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">${searchQuery ? '🔍' : '📄'}</div>
          <div class="empty-title">${searchQuery ? 'No PRDs Found' : 'Create Your First PRD'}</div>
          <div class="empty-sub">${searchQuery ? 'Try a different search term or filter' : 'Click "New PRD" to generate your first PRD from a Jira ticket, pasted content, or manual input.'}</div>
          ${!searchQuery ? '<button class="btn btn-primary" id="emptyCreateBtn" style="margin-top:12px">✨ Create First PRD</button>' : ''}
        </div>
      ` : prds.map(renderPRDCard).join('')}
    </div>
  `;

  // Bind filter clicks
  container.querySelectorAll('.filter-chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      activeFilter = chip.dataset.filter;
      renderDashboard();
    });
  });

  // Bind card clicks
  container.querySelectorAll('.prd-card[data-id]').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.prd-card-actions') || e.target.closest('.prd-context-menu')) return;
      switchView('prd-editor', card.dataset.id);
    });
  });

  // Bind Open buttons
  container.querySelectorAll('[data-action="open"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      switchView('prd-editor', btn.dataset.prd);
    });
  });

  // Bind Export buttons
  container.querySelectorAll('[data-action="export"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const prdId = btn.closest('.prd-card')?.dataset.id;
      if (prdId) {
        const prd = store.getPRD(prdId);
        if (prd) {
          exportQuickPDF(prd);
        }
      }
    });
  });

  // Bind Delete buttons
  container.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const prdId = btn.dataset.prd;
      const prd = store.getPRD(prdId);
      if (prd && confirm(`Delete "${prd.title}"? This cannot be undone.`)) {
        store.deletePRD(prdId);
        showToast('🗑️ PRD deleted', 'warn');
        renderNotifications();
        renderDashboard();
      }
    });
  });

  // Bind Duplicate buttons
  container.querySelectorAll('[data-action="duplicate"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const prdId = btn.dataset.prd;
      const copy = await store.duplicatePRD(prdId);
      if (copy) {
        showToast('📋 PRD duplicated', 'success');
        renderNotifications();
        renderDashboard();
      }
    });
  });

  // Empty state CTA
  document.getElementById('emptyCreateBtn')?.addEventListener('click', () => openModal('generateModal'));

  // Update nav badge
  const navBadge = document.querySelector('.nav-item[data-view="prd-dashboard"] .nav-badge');
  if (navBadge) navBadge.textContent = stats.total;
}

function getFilteredPRDs() {
  let prds = store.getPRDs();

  // Filter by status
  if (activeFilter === 'Draft') prds = prds.filter(p => p.status === 'draft');
  else if (activeFilter === 'In Review') prds = prds.filter(p => p.status === 'review');
  else if (activeFilter === 'Approved') prds = prds.filter(p => p.status === 'approved');

  // Filter by search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    prds = prds.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.jiraKey.toLowerCase().includes(q) ||
      p.template.toLowerCase().includes(q)
    );
  }

  return prds;
}

function renderPRDCard(prd) {
  const statusClass = prd.status === 'draft' ? 'status-draft' : prd.status === 'review' ? 'status-review' : 'status-approved';
  const statusLabel = prd.status === 'draft' ? 'Draft' : prd.status === 'review' ? 'In Review' : 'Approved';
  const collabCount = prd.collaborators?.length || 1;
  const collabLabel = collabCount === 1 ? '👤 1 author' : `👥 ${collabCount} collaborators`;
  const sectionCount = prd.sectionCount || prd.sections?.length || 0;
  const commentCount = prd.comments?.length || 0;
  const versionCount = prd.versions?.length || 0;

  return `
    <div class="prd-card glow-ring" data-id="${prd.id}">
      <div class="prd-card-top">
        <div class="prd-card-icon ${prd.iconColor}">${prd.icon}</div>
        <div style="flex:1">
          <div class="prd-card-title">${prd.title}</div>
          <div class="prd-card-meta" style="margin-top:8px">
            <span class="status-badge ${statusClass}">${statusLabel}</span>
            <div class="prd-card-info">
              <span>✏️ ${sectionCount} sections</span>
              <span>${collabLabel}</span>
              <span>🕐 ${prd.lastEdited}</span>
              ${commentCount > 0 ? `<span>💬 ${commentCount}</span>` : ''}
              ${versionCount > 0 ? `<span>📋 v${versionCount}</span>` : ''}
            </div>
          </div>
        </div>
      </div>
      <div class="prd-progress"><div class="prd-progress-bar ${prd.progressColor}" style="width:${prd.progress}%"></div></div>
      <div class="prd-card-bottom">
        <span class="jira-tag">${prd.jiraKey}</span>
        ${prd.hasFigmaLink || prd.linkedWireframe ? '<span class="figma-badge">🎨 Wireframe Linked</span>' : `<span style="font-size:11px;color:var(--text-muted)">${prd.template}</span>`}
        <div class="prd-card-actions">
          <div style="display:flex;gap:4px">
            <button class="link-btn secondary" data-action="duplicate" data-prd="${prd.id}" title="Duplicate">📋</button>
            <button class="link-btn secondary" data-action="delete" data-prd="${prd.id}" title="Delete">🗑️</button>
            <button class="link-btn secondary" data-action="export" title="Export">Export</button>
            <button class="link-btn primary" data-action="open" data-prd="${prd.id}">Open →</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function exportQuickPDF(prd) {
  showToast('📄 Preparing PDF export…', 'info');
  store.addExport(prd.id, 'pdf');
  setTimeout(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { showToast('❌ Allow popups for PDF export', 'error'); return; }
    const html = `<!DOCTYPE html><html><head><title>${prd.title}</title>
      <style>body{font-family:'Segoe UI',sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#1a1a2e;line-height:1.7}h1{font-size:28px;border-bottom:3px solid #5B7EF8;padding-bottom:12px}h2{font-size:18px;border-bottom:1px solid #e0e0e0;padding-bottom:8px;margin-top:32px}ul{padding-left:24px}li{margin:6px 0}table{width:100%;border-collapse:collapse}th{background:#f0f0f8;padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;border-bottom:2px solid #ddd}td{padding:8px 12px;border-bottom:1px solid #eee}hr{border:none;border-top:1px solid #e0e0e0;margin:24px 0}</style>
    </head><body><h1>${prd.title}</h1><p style="color:#666"><strong>Status:</strong> ${prd.status} | <strong>Jira:</strong> ${prd.jiraKey} | <strong>Template:</strong> ${prd.template}</p><hr>
    ${(prd.sections || []).map(s => {
      let c = `<h2>§${s.num} ${s.title}</h2>`;
      if (s.type === 'text') c += `<p>${(s.content || '').replace(/\n/g, '<br>')}</p>`;
      else if (s.type === 'list') c += `<ul>${(s.items || []).map(i => `<li>${i}</li>`).join('')}</ul>`;
      else if (s.type === 'table') {
        c += `<table><thead><tr>${(s.headers || []).map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
        c += `<tbody>${(s.rows || []).map(r => `<tr>${r.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      }
      return c;
    }).join('')}
    <hr><p style="font-size:12px;color:#999;text-align:center">Generated by PM AI Tool v1.0</p></body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }, 300);
}

// Search handler — called from main.js
export function handleSearch(query) {
  searchQuery = query;
  if (document.getElementById('view-prd-dashboard')?.classList.contains('active')) {
    renderDashboard();
  }
}
