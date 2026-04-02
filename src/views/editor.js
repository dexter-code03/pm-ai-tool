/* ═══════════════════════════════════════════════════════════
   PM AI TOOL — PRD Editor View (Full Feature)
   Version History, Section Controls, Comments, Feedback,
   Export, Keyboard Shortcuts, Auto-Save
   ═══════════════════════════════════════════════════════════ */

import { store, regenerateSection } from '../data/store.js';
import { api, getToken } from '../data/api.js';
import { normalizePrdFromApi } from '../data/normalize.js';
import { switchView } from '../components/router.js';
import { showToast, renderNotifications } from '../components/notifications.js';

let currentPrd = null;
let saveTimeout = null;
let autoSaveInterval = null;
let saveIndicator = null;
let versionPanelOpen = false;
let commentPanelSection = null;
let exportModalOpen = false;

export async function renderEditor(prdId) {
  let prd = store.getPRD(prdId);
  if (!prd && getToken()) {
    try {
      const data = await api.getPrd(prdId);
      const p = data.prd || data;
      store.mergePrdFromApi(normalizePrdFromApi(p));
      prd = store.getPRD(prdId);
    } catch {
      /* fall through */
    }
  }
  if (!prd) {
    showToast('❌ PRD not found', 'error');
    switchView('prd-dashboard');
    return;
  }
  if (getToken()) {
    try {
      const { versions } = await api.prdVersions(prdId);
      if (versions?.length) {
        prd.versions = versions.map(v => ({
          id: v.id,
          versionNumber: v.versionNumber,
          label: v.label || '',
          contentSnapshot: Array.isArray(v.contentSnapshot) ? v.contentSnapshot : JSON.parse(JSON.stringify(v.contentSnapshot || [])),
          createdAt: v.createdAt,
          createdBy: v.createdBy?.name || 'You'
        }));
        store.save();
      }
    } catch {
      /* keep local versions */
    }
  }
  if (getToken()) {
    await store.loadPrdComments(prdId);
    prd = store.getPRD(prdId);
  }
  currentPrd = prd;
  versionPanelOpen = false;
  commentPanelSection = null;
  exportModalOpen = false;

  const toolbar = document.getElementById('editorToolbar');
  toolbar.innerHTML = renderToolbar(prd);

  const scroll = document.getElementById('editorScroll');
  scroll.innerHTML = renderEditorContent(prd);

  const sidebar = document.getElementById('editorSidebar');
  sidebar.innerHTML = renderEditorSidebar(prd);

  bindEditorEvents(prd);
  startAutoSave(prd.id);

  // Save initial version if none exist
  if (!prd.versions || prd.versions.length === 0) {
    store.saveVersion(prd.id, 'Initial version');
  }
}

function renderToolbar(prd) {
  const collabAvatars = (prd.collaborators || []).slice(0, 3).map(c =>
    `<div class="collab-avatar" style="background:${c.gradient}" title="${c.name}">${c.initials}</div>`
  ).join('');

  const statusActions = {
    draft: { label: 'Send for Review', next: 'review', icon: '📤' },
    review: { label: 'Approve', next: 'approved', icon: '✅' },
    approved: { label: 'Archive', next: 'archived', icon: '📦' },
    archived: { label: 'Reopen', next: 'draft', icon: '🔓' }
  };
  const action = statusActions[prd.status] || statusActions.draft;

  return `
    <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px;" id="editorBack">← Back</button>
    <div class="toolbar-sep"></div>
    <div class="toolbar-group">
      <button class="toolbar-btn" title="Bold (Ctrl+B)" data-format="bold"><b>B</b></button>
      <button class="toolbar-btn" title="Italic (Ctrl+I)"><i>I</i></button>
      <button class="toolbar-btn" title="Underline" style="text-decoration:underline">U</button>
      <button class="toolbar-btn" title="Strikethrough" style="text-decoration:line-through">S</button>
      <button class="toolbar-btn" title="Code" style="font-family:monospace">&lt;/&gt;</button>
    </div>
    <div class="toolbar-sep"></div>
    <div class="toolbar-group">
      <button class="toolbar-btn" title="Heading 1" style="font-size:11px;font-weight:700">H1</button>
      <button class="toolbar-btn" title="Heading 2" style="font-size:11px;font-weight:700">H2</button>
      <button class="toolbar-btn" title="Bullet List">≡</button>
      <button class="toolbar-btn" title="Table">⊞</button>
      <button class="toolbar-btn" title="Link">🔗</button>
    </div>
    <div class="toolbar-sep"></div>
    <div class="toolbar-group">
      <button class="toolbar-btn ai-btn" title="AI: Improve" id="aiImprove">✨ Improve</button>
      <button class="toolbar-btn ai-btn teal" title="AI: Shorten" id="aiShorten">✂️ Shorten</button>
      <button class="toolbar-btn ai-btn amber" title="AI: Formalize" id="aiFormalize">📝 Formalize</button>
    </div>
    <div class="toolbar-sep"></div>
    <div style="display:flex;gap:6px;align-items:center;font-size:12px;color:var(--text-muted)">
      <span id="saveStatus" style="color:var(--green);font-weight:600">● Saved</span>
      <span>v${(prd.versions?.length || 1)}.0</span>
    </div>
    <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
      <div class="collab-avatars">${collabAvatars}</div>
      <button class="btn btn-ghost" style="font-size:12px;padding:5px 12px" id="editorVersions" title="Version History (${prd.versions?.length || 0} versions)">🕐 History</button>
      <button class="btn btn-secondary" style="font-size:12px;padding:5px 12px" id="editorExport">📤 Export</button>
      <button class="btn btn-primary" style="font-size:12px;padding:5px 12px" id="editorAction">${action.icon} ${action.label}</button>
    </div>
  `;
}

function renderEditorContent(prd) {
  const statusClass = prd.status === 'draft' ? 'status-draft' : prd.status === 'review' ? 'status-review' : prd.status === 'approved' ? 'status-approved' : 'status-draft';
  const statusLabel = prd.status === 'draft' ? 'Draft' : prd.status === 'review' ? 'In Review' : prd.status === 'approved' ? 'Approved' : 'Archived';

  const sectionsHtml = (prd.sections || []).map((s, i) => renderSection(s, i, prd)).join('');
  const commentCount = prd.comments?.length || 0;

  return `
    <div class="prd-header-block">
      <div class="prd-title-input" contenteditable="true" id="prdTitleInput" spellcheck="false">${escapeHtml(prd.title)}</div>
      <div class="prd-doc-meta">
        <div class="prd-doc-meta-item">
          <strong>Status</strong>
          <span class="status-badge ${statusClass}" style="margin:0">${statusLabel}</span>
        </div>
        <div class="prd-doc-meta-item">
          <strong>Source</strong>
          <span class="meta-badge" style="background:rgba(74,158,255,0.1);color:#4A9EFF">${prd.jiraKey}</span>
        </div>
        <div class="prd-doc-meta-item"><strong>Template</strong> ${prd.template}</div>
        <div class="prd-doc-meta-item"><strong>Author</strong> ${prd.collaborators?.[0]?.name || 'Arjun Kumar'}</div>
        <div class="prd-doc-meta-item"><strong>Updated</strong> ${new Date(prd.updatedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        <div class="prd-doc-meta-item"><strong>Comments</strong> <span style="color:var(--indigo)">${commentCount}</span></div>
      </div>
    </div>
    ${sectionsHtml}
    <div class="add-section-bar" id="addSectionBar">
      <button class="btn btn-ghost" id="addSectionBtn">+ Add Section</button>
    </div>

    <!-- Version History Panel (overlay) -->
    <div class="version-panel ${versionPanelOpen ? 'open' : ''}" id="versionPanel">
      <div class="version-panel-header">
        <h3>Version History</h3>
        <button class="modal-close" id="closeVersions">✕</button>
      </div>
      <div class="version-panel-body" id="versionList"></div>
    </div>

    <!-- Export Modal (inline) -->
    <div class="export-panel ${exportModalOpen ? 'open' : ''}" id="exportPanel">
      <div class="version-panel-header">
        <h3>Export PRD</h3>
        <button class="modal-close" id="closeExport">✕</button>
      </div>
      <div class="export-panel-body">
        <div class="export-option" data-export="pdf">
          <div class="export-icon">📄</div>
          <div>
            <div class="export-name">PDF Document</div>
            <div class="export-desc">Styled PDF with table of contents and page numbers</div>
          </div>
        </div>
        <div class="export-option" data-export="markdown">
          <div class="export-icon">📝</div>
          <div>
            <div class="export-name">Markdown (.md)</div>
            <div class="export-desc">Clean markdown file for GitHub, Confluence import</div>
          </div>
        </div>
        <div class="export-option" data-export="json">
          <div class="export-icon">{ }</div>
          <div>
            <div class="export-name">JSON (Structured)</div>
            <div class="export-desc">Structured PRD data for programmatic integrations</div>
          </div>
        </div>
        <div class="export-option" data-export="docx">
          <div class="export-icon">📃</div>
          <div>
            <div class="export-name">DOCX (Word)</div>
            <div class="export-desc">Editable Word document, Google Docs compatible</div>
          </div>
        </div>
        <div class="export-option" data-export="clipboard">
          <div class="export-icon">📋</div>
          <div>
            <div class="export-name">Copy to Clipboard</div>
            <div class="export-desc">Copy full PRD content as formatted text</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Comment Thread Panel -->
    <div class="comment-panel ${commentPanelSection ? 'open' : ''}" id="commentPanel">
      <div class="version-panel-header">
        <h3 id="commentPanelTitle">Comments</h3>
        <button class="modal-close" id="closeComments">✕</button>
      </div>
      <div class="comment-thread" id="commentThread"></div>
      <div class="comment-input-row">
        <input type="text" class="input-field" placeholder="Add a comment…" id="commentInput" style="font-size:12px;padding:8px 12px">
        <button class="btn btn-primary" style="font-size:11px;padding:5px 10px" id="commentSubmit">Send</button>
      </div>
    </div>
  `;
}

function renderSection(section, index, prd) {
  const confClass = section.confidence === 'high' ? 'conf-high' : section.confidence === 'mid' ? 'conf-mid' : 'conf-low';
  const confTitle = section.confidence === 'high' ? 'High Confidence' : section.confidence === 'mid' ? 'Medium Confidence' : 'Low Confidence — AI inferred';
  const isLocked = section.locked;
  const isCollapsed = section.collapsed;
  const commentCount = prd.comments?.filter(c => c.sectionId === section.id).length || 0;
  const feedbackState = section.feedback; // 'up' | 'down' | null

  let bodyContent = '';

  if (section.banner) {
    const bannerClass = section.banner.type === 'low' ? 'banner-low' : 'banner-mid';
    bodyContent += `<div class="section-banner ${bannerClass}">${section.banner.text}</div>`;
  }

  if (section.type === 'text') {
    bodyContent += `<div class="section-text" contenteditable="${isLocked ? 'false' : 'true'}" data-section="${section.id}" spellcheck="false">${escapeHtml(section.content)}</div>`;
  } else if (section.type === 'list') {
    bodyContent += `<ul class="section-list">${(section.items || []).map((item, idx) =>
      `<li contenteditable="${isLocked ? 'false' : 'true'}" data-section="${section.id}" data-item="${idx}">${item}</li>`
    ).join('')}</ul>`;
    if (!isLocked) {
      bodyContent += `<button class="btn btn-ghost add-item-btn" data-section-id="${section.id}" style="font-size:11px;padding:4px 8px;margin-top:4px">+ Add item</button>`;
    }
  } else if (section.type === 'table') {
    bodyContent += `<table class="ac-table">
      <thead><tr>${(section.headers || []).map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${(section.rows || []).map(row => `<tr>${row.map((cell, i) => {
        if (i === 0) return `<td style="font-family:monospace;font-size:11px;color:var(--text-muted)">${cell}</td>`;
        if (i === 2) {
          const pColor = cell === 'P0' ? 'var(--red-dim)' : 'var(--amber-dim)';
          const pText = cell === 'P0' ? '#F87171' : 'var(--amber)';
          const pBorder = cell === 'P0' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)';
          return `<td><span class="status-badge" style="background:${pColor};color:${pText};border:1px solid ${pBorder}">${cell}</span></td>`;
        }
        if (i === 3) {
          const sClass = cell === '✓ Done' ? 'status-approved' : cell === 'In Dev' ? 'status-review' : 'status-draft';
          return `<td><span class="status-badge ${sClass}">${cell}</span></td>`;
        }
        return `<td>${cell}</td>`;
      }).join('')}</tr>`).join('')}</tbody>
    </table>`;
  }

  // Feedback row
  bodyContent += `
    <div class="section-feedback-row">
      <button class="feedback-btn ${feedbackState === 'up' ? 'active' : ''}" data-fb="up" data-section-id="${section.id}" title="Good quality">👍</button>
      <button class="feedback-btn ${feedbackState === 'down' ? 'active' : ''}" data-fb="down" data-section-id="${section.id}" title="Needs improvement">👎</button>
      <span class="feedback-label">${feedbackState === 'up' ? 'Helpful' : feedbackState === 'down' ? 'Needs work' : 'Rate this section'}</span>
    </div>
  `;

  return `
    <div class="prd-section ${isCollapsed ? 'collapsed' : ''} ${isLocked ? 'locked' : ''}" data-section-num="${section.num}" data-section-id="${section.id}">
      <div class="section-head">
        <div class="section-drag" title="Drag to reorder">⠿</div>
        <div class="section-num">§${section.num}</div>
        <div class="section-title">${section.title}</div>
        <div class="section-controls">
          <div class="ctrl-btn regen" title="Regenerate this section" data-action="regen" data-section-id="${section.id}">↻</div>
          <div class="ctrl-btn comment ${commentCount > 0 ? 'has-comments' : ''}" title="${commentCount} comments" data-action="comment" data-section-id="${section.id}">💬${commentCount > 0 ? `<span class="comment-count">${commentCount}</span>` : ''}</div>
          <div class="ctrl-btn ${isLocked ? 'active' : ''}" title="${isLocked ? 'Unlock' : 'Lock'}" data-action="lock" data-section-id="${section.id}">${isLocked ? '🔒' : '🔓'}</div>
          <div class="ctrl-btn" title="Duplicate" data-action="duplicate" data-section-id="${section.id}">📋</div>
          <div class="ctrl-btn" title="Move Up" data-action="moveup" data-section-id="${section.id}" ${index === 0 ? 'style="opacity:0.3"' : ''}>↑</div>
          <div class="ctrl-btn" title="Move Down" data-action="movedown" data-section-id="${section.id}" ${index === (currentPrd?.sections?.length || 0) - 1 ? 'style="opacity:0.3"' : ''}>↓</div>
          <div class="ctrl-btn danger" title="Delete section" data-action="deletesection" data-section-id="${section.id}">✕</div>
        </div>
        <div class="confidence-dot ${confClass}" title="${confTitle}"></div>
        <div class="section-chevron">▾</div>
      </div>
      <div class="section-body">
        ${bodyContent}
      </div>
    </div>
  `;
}

function renderEditorSidebar(prd) {
  const sections = prd.sections || [];
  const outlineItems = sections.map(s => {
    const dotClass = s.confidence === 'high' ? 'sn-green' : s.confidence === 'mid' ? 'sn-amber' : 'sn-red';
    const lockIcon = s.locked ? ' 🔒' : '';
    return `<div class="section-nav-item" data-nav-section="${s.id}"><div class="section-nav-dot ${dotClass}"></div> §${s.num} ${s.title}${lockIcon}</div>`;
  }).join('');

  const collabHtml = (prd.collaborators || []).map(c => `
    <div style="display:flex;align-items:center;gap:10px">
      <div class="collab-avatar" style="background:${c.gradient};width:28px;height:28px;font-size:11px">${c.initials}</div>
      <div>
        <div style="font-size:12.5px;font-weight:500;color:var(--text-primary)">${c.name}</div>
        <div style="font-size:11px;color:${c.statusColor || 'var(--text-muted)'}">${c.statusColor ? '● ' : ''}${c.status || ''}</div>
      </div>
    </div>
  `).join('');

  const statusSteps = [
    { label: 'Draft', done: true, current: prd.status === 'draft' },
    { label: 'In Review', done: prd.status === 'review' || prd.status === 'approved' || prd.status === 'archived', current: prd.status === 'review' },
    { label: 'Approved', done: prd.status === 'approved' || prd.status === 'archived', current: prd.status === 'approved' },
    { label: 'Archived', done: prd.status === 'archived', current: prd.status === 'archived' },
  ];

  const linkedWf = prd.linkedWireframe;
  const highConf = sections.filter(s => s.confidence === 'high').length;
  const midConf = sections.filter(s => s.confidence === 'mid').length;
  const lowConf = sections.filter(s => s.confidence === 'low').length;

  return `
    <div class="sidebar-widget">
      <div class="widget-title">Document Outline</div>
      ${outlineItems}
    </div>

    <div class="sidebar-divider"></div>

    <div class="sidebar-widget">
      <div class="widget-title">Confidence Summary</div>
      <div style="display:flex;flex-direction:column;gap:7px;font-size:12px;color:var(--text-muted)">
        <div style="display:flex;align-items:center;gap:8px"><div class="confidence-dot conf-high" style="flex-shrink:0"></div> High — ${highConf} sections</div>
        <div style="display:flex;align-items:center;gap:8px"><div class="confidence-dot conf-mid" style="flex-shrink:0"></div> Medium — ${midConf} sections</div>
        <div style="display:flex;align-items:center;gap:8px"><div class="confidence-dot conf-low" style="flex-shrink:0"></div> Low — ${lowConf} sections</div>
      </div>
    </div>

    <div class="sidebar-divider"></div>

    ${linkedWf ? `
    <div class="sidebar-widget">
      <div class="widget-title">Linked Wireframe</div>
      <div class="linked-card">
        <div class="linked-card-title">${linkedWf.title}</div>
        <div class="linked-card-meta">${linkedWf.screens} screens · Updated ${linkedWf.updated}</div>
        <div class="linked-card-actions">
          <button class="link-btn primary" id="viewLinkedWf">View Figma</button>
          <button class="link-btn secondary" id="manageLink">Manage</button>
        </div>
      </div>
    </div>
    <div class="sidebar-divider"></div>
    ` : ''}

    <div class="sidebar-widget">
      <div class="widget-title">Collaborators</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${collabHtml}
      </div>
    </div>

    <div class="sidebar-divider"></div>

    <div class="sidebar-widget">
      <div class="widget-title">Approval Workflow</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${statusSteps.map(s => `
          <div style="display:flex;align-items:center;gap:8px;font-size:12px">
            <span style="color:${s.done && !s.current ? 'var(--green)' : s.current ? 'var(--amber)' : 'var(--text-muted)'}">${s.done && !s.current ? '✓' : s.current ? '●' : '○'}</span>
            <span style="color:${s.current ? 'var(--text-primary)' : 'var(--text-muted)'}${s.current ? ';font-weight:500' : ''}">${s.label}</span>
            ${s.current ? '<span style="margin-left:auto;color:var(--text-muted);font-size:11px">Current</span>' : ''}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="sidebar-divider"></div>

    <div class="sidebar-widget">
      <div class="widget-title">Quick Actions</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn btn-ghost" style="font-size:12px;padding:5px 10px;justify-content:flex-start" id="duplicatePrdBtn">📋 Duplicate PRD</button>
        <button class="btn btn-ghost" style="font-size:12px;padding:5px 10px;justify-content:flex-start" id="saveVersionBtn">💾 Save Version</button>
        <button class="btn btn-ghost" style="font-size:12px;padding:5px 10px;justify-content:flex-start" id="saveAsTemplateBtn">🎨 Save as Template</button>
        <button class="btn btn-danger" style="font-size:12px;padding:5px 10px;justify-content:flex-start" id="deletePrdBtn">🗑️ Delete PRD</button>
      </div>
    </div>
  `;
}

function bindEditorEvents(prd) {
  // Back button
  document.getElementById('editorBack')?.addEventListener('click', () => {
    stopAutoSave();
    switchView('prd-dashboard');
  });

  // Save as Template
  document.getElementById('saveAsTemplateBtn')?.addEventListener('click', () => {
    // Custom prompt modal to avoid blocking automated tests
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.style.zIndex = '9999';
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px">
        <div class="modal-header">
          <div class="modal-title">Save as Template</div>
        </div>
        <div class="modal-body">
          <div class="input-group">
            <label class="input-label">Template Name</label>
            <input class="input-field" type="text" id="tplPromptInput" value="${prd.title} Template">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="tplPromptCancel">Cancel</button>
          <button class="btn btn-primary" id="tplPromptSave">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('tplPromptCancel').onclick = () => overlay.remove();
    document.getElementById('tplPromptSave').onclick = () => {
      const tplName = document.getElementById('tplPromptInput').value.trim();
      if (!tplName) return;
      
      const sections = (prd.sections || []).map(s => ({
        title: s.title,
        type: s.type,
        required: true,
        guidance: `Generate content for ${s.title}`
      }));

      store.createTemplate({
        id: 'tpl-' + Date.now(),
        name: tplName,
        description: 'Custom template saved from PRD: ' + prd.title,
        icon: '🎨',
        visibility: 'personal',
        isDefault: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        color: 'var(--indigo-dim)',
        variables: [],
        sections
      });
      showToast('✅ Template saved to Library!', 'success');
      overlay.remove();
    };
  });

  // Title editing
  const titleInput = document.getElementById('prdTitleInput');
  if (titleInput) {
    titleInput.addEventListener('input', () => {
      triggerAutoSave(prd.id, { title: titleInput.textContent.trim() });
    });
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); titleInput.blur(); }
    });
  }

  // Section collapse/expand
  document.querySelectorAll('.section-head').forEach(head => {
    head.addEventListener('click', (e) => {
      if (e.target.closest('.section-controls') || e.target.closest('.section-drag')) return;
      const sectionEl = head.closest('.prd-section');
      sectionEl.classList.toggle('collapsed');
      // Persist collapse state
      const sectionId = sectionEl.dataset.sectionId;
      const section = prd.sections.find(s => s.id === sectionId);
      if (section) {
        section.collapsed = sectionEl.classList.contains('collapsed');
        store.save();
      }
    });
  });

  // Section controls
  document.querySelectorAll('[data-action="regen"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const sectionId = btn.dataset.sectionId;
      const section = prd.sections.find(s => s.id === sectionId);
      if (!section) return;

      const hint = prompt(`Regenerate "${section.title}"?\n\nOptional: Add a hint for the AI (leave blank for default):`);
      if (hint === null) return; // Cancelled

      showToast(`🔄 Regenerating ${section.title}…`, 'info');
      store.saveVersion(prd.id, `Before regenerating §${section.num}`);

      try {
        if (getToken()) {
          const data = await api.regenerateSection(prd.id, { sectionId, hint: hint || '' });
          const updated = data.prd || data;
          store.mergePrdFromApi(normalizePrdFromApi(updated));
        } else {
          const newContent = regenerateSection(section, hint);
          const idx = prd.sections.findIndex(s => s.id === sectionId);
          if (idx !== -1) {
            prd.sections[idx] = { ...prd.sections[idx], ...newContent };
            store.updatePRD(prd.id, { sections: prd.sections });
          }
        }
        await renderEditor(prd.id);
        showToast(`✅ ${section.title} regenerated`, 'success');
      } catch (err) {
        showToast(err.message || 'Regeneration failed', 'error');
      }
    });
  });

  // Comment
  document.querySelectorAll('[data-action="comment"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      commentPanelSection = btn.dataset.sectionId;
      openCommentPanel(prd);
    });
  });

  // Lock
  document.querySelectorAll('[data-action="lock"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sectionId = btn.dataset.sectionId;
      const section = prd.sections.find(s => s.id === sectionId);
      if (section) {
        section.locked = !section.locked;
        store.updatePRD(prd.id, { sections: prd.sections });
        showToast(section.locked ? '🔒 Section locked' : '🔓 Section unlocked', 'success');
        renderEditor(prd.id);
      }
    });
  });

  // Duplicate section
  document.querySelectorAll('[data-action="duplicate"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sectionId = btn.dataset.sectionId;
      const idx = prd.sections.findIndex(s => s.id === sectionId);
      if (idx === -1) return;
      const copy = JSON.parse(JSON.stringify(prd.sections[idx]));
      copy.id = 'sec-' + Date.now();
      copy.title += ' (Copy)';
      prd.sections.splice(idx + 1, 0, copy);
      renumberSections(prd);
      store.updatePRD(prd.id, { sections: prd.sections });
      showToast('📋 Section duplicated', 'success');
      renderEditor(prd.id);
    });
  });

  // Move up
  document.querySelectorAll('[data-action="moveup"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sectionId = btn.dataset.sectionId;
      const idx = prd.sections.findIndex(s => s.id === sectionId);
      if (idx <= 0) return;
      [prd.sections[idx - 1], prd.sections[idx]] = [prd.sections[idx], prd.sections[idx - 1]];
      renumberSections(prd);
      store.updatePRD(prd.id, { sections: prd.sections });
      renderEditor(prd.id);
    });
  });

  // Move down
  document.querySelectorAll('[data-action="movedown"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sectionId = btn.dataset.sectionId;
      const idx = prd.sections.findIndex(s => s.id === sectionId);
      if (idx === -1 || idx >= prd.sections.length - 1) return;
      [prd.sections[idx + 1], prd.sections[idx]] = [prd.sections[idx], prd.sections[idx + 1]];
      renumberSections(prd);
      store.updatePRD(prd.id, { sections: prd.sections });
      renderEditor(prd.id);
    });
  });

  // Delete section
  document.querySelectorAll('[data-action="deletesection"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sectionId = btn.dataset.sectionId;
      const section = prd.sections.find(s => s.id === sectionId);
      if (!section) return;
      if (!confirm(`Delete section "${section.title}"? This can be undone via version history.`)) return;
      store.saveVersion(prd.id, `Before deleting §${section.num}`);
      prd.sections = prd.sections.filter(s => s.id !== sectionId);
      renumberSections(prd);
      store.updatePRD(prd.id, { sections: prd.sections });
      showToast(`🗑️ Section "${section.title}" deleted`, 'warn');
      renderEditor(prd.id);
    });
  });

  // Add item to list
  document.querySelectorAll('.add-item-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sectionId = btn.dataset.sectionId;
      const section = prd.sections.find(s => s.id === sectionId);
      if (section && section.items) {
        section.items.push('New item — click to edit');
        store.updatePRD(prd.id, { sections: prd.sections });
        renderEditor(prd.id);
      }
    });
  });

  // Add section
  document.getElementById('addSectionBtn')?.addEventListener('click', () => {
    const title = prompt('New section title:');
    if (!title) return;
    const newSection = {
      id: 'sec-' + Date.now(),
      num: String(prd.sections.length + 1).padStart(2, '0'),
      title: title,
      confidence: 'high',
      type: 'text',
      locked: false,
      collapsed: false,
      content: 'Enter content here…',
      feedback: null
    };
    prd.sections.push(newSection);
    store.updatePRD(prd.id, { sections: prd.sections });
    showToast(`✅ Section "${title}" added`, 'success');
    renderEditor(prd.id);
  });

  // Section text editing — auto-save
  document.querySelectorAll('.section-text[contenteditable="true"]').forEach(el => {
    el.addEventListener('input', () => {
      const sectionId = el.dataset.section;
      const section = prd.sections.find(s => s.id === sectionId);
      if (section) {
        section.content = el.textContent;
        triggerAutoSave(prd.id, { sections: prd.sections });
      }
    });
  });

  // List item editing
  document.querySelectorAll('.section-list li[contenteditable="true"]').forEach(el => {
    el.addEventListener('input', () => {
      const sectionId = el.dataset.section;
      const itemIdx = parseInt(el.dataset.item);
      const section = prd.sections.find(s => s.id === sectionId);
      if (section && section.items && !isNaN(itemIdx)) {
        section.items[itemIdx] = el.textContent;
        triggerAutoSave(prd.id, { sections: prd.sections });
      }
    });
  });

  // Sidebar outline navigation
  document.querySelectorAll('[data-nav-section]').forEach(item => {
    item.addEventListener('click', () => {
      const sectionId = item.dataset.navSection;
      const section = document.querySelector(`[data-section-id="${sectionId}"]`);
      if (section) {
        section.classList.remove('collapsed');
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      document.querySelectorAll('.section-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // Feedback buttons
  document.querySelectorAll('.feedback-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sectionId = btn.dataset.sectionId;
      const fb = btn.dataset.fb;
      const section = prd.sections.find(s => s.id === sectionId);
      if (section) {
        section.feedback = section.feedback === fb ? null : fb;
        store.updatePRD(prd.id, { sections: prd.sections });
        renderEditor(prd.id);
        showToast(fb === 'up' ? '👍 Thanks for the feedback!' : '👎 We\'ll improve this section', 'info');
      }
    });
  });

  // AI buttons
  document.getElementById('aiImprove')?.addEventListener('click', () => void runAiAssist(prd, 'improve'));
  document.getElementById('aiShorten')?.addEventListener('click', () => void runAiAssist(prd, 'shorten'));
  document.getElementById('aiFormalize')?.addEventListener('click', () => void runAiAssist(prd, 'formalize'));

  // Version history
  document.getElementById('editorVersions')?.addEventListener('click', () => {
    versionPanelOpen = !versionPanelOpen;
    const panel = document.getElementById('versionPanel');
    panel.classList.toggle('open', versionPanelOpen);
    if (versionPanelOpen) renderVersionList(prd);
  });
  document.getElementById('closeVersions')?.addEventListener('click', () => {
    versionPanelOpen = false;
    document.getElementById('versionPanel').classList.remove('open');
  });

  // Export
  document.getElementById('editorExport')?.addEventListener('click', () => {
    exportModalOpen = !exportModalOpen;
    document.getElementById('exportPanel').classList.toggle('open', exportModalOpen);
  });
  document.getElementById('closeExport')?.addEventListener('click', () => {
    exportModalOpen = false;
    document.getElementById('exportPanel').classList.remove('open');
  });

  // Export options
  document.querySelectorAll('[data-export]').forEach(btn => {
    btn.addEventListener('click', () => void handleExport(prd, btn.dataset.export));
  });

  // Status action
  document.getElementById('editorAction')?.addEventListener('click', () => {
    const statusActions = { draft: 'review', review: 'approved', approved: 'archived', archived: 'draft' };
    const next = statusActions[prd.status];
    if (next) {
      store.saveVersion(prd.id, `Before status change to ${next}`);
      const result = store.updatePRDStatus(prd.id, next);
      if (result) {
        const labels = { draft: 'Draft', review: 'In Review', approved: 'Approved', archived: 'Archived' };
        showToast(`✅ Status changed to ${labels[next]}`, 'success');
        renderNotifications();
        renderEditor(prd.id);
      }
    }
  });

  // Linked wireframe
  document.getElementById('viewLinkedWf')?.addEventListener('click', () => {
    switchView('wireframes');
    showToast('🎨 Opening Figma wireframe…', 'info');
  });
  document.getElementById('manageLink')?.addEventListener('click', () => showToast('⚙️ Link Settings', 'info'));

  // Quick actions
  document.getElementById('duplicatePrdBtn')?.addEventListener('click', async () => {
    const copy = await store.duplicatePRD(prd.id);
    if (copy) {
      showToast('📋 PRD duplicated', 'success');
      switchView('prd-editor', copy.id);
    }
  });

  document.getElementById('saveVersionBtn')?.addEventListener('click', () => {
    const label = prompt('Version label (optional):') || 'Manual save';
    store.saveVersion(prd.id, label);
    showToast('💾 Version saved', 'success');
    renderEditor(prd.id);
  });

  document.getElementById('deletePrdBtn')?.addEventListener('click', () => {
    if (!confirm(`Delete "${prd.title}"? This cannot be undone.`)) return;
    stopAutoSave();
    store.deletePRD(prd.id);
    showToast('🗑️ PRD deleted', 'warn');
    renderNotifications();
    switchView('prd-dashboard');
  });

  // Comment panel
  document.getElementById('closeComments')?.addEventListener('click', () => {
    commentPanelSection = null;
    document.getElementById('commentPanel').classList.remove('open');
  });

  document.getElementById('commentSubmit')?.addEventListener('click', async () => {
    const input = document.getElementById('commentInput');
    const text = input?.value?.trim();
    if (!text || !commentPanelSection) return;
    await store.addComment(prd.id, commentPanelSection, text);
    input.value = '';
    openCommentPanel(store.getPRD(prd.id));
    showToast('💬 Comment added', 'success');
    const sidebar = document.getElementById('editorSidebar');
    const prdNow = store.getPRD(prd.id);
    sidebar.innerHTML = renderEditorSidebar(prdNow);
    bindEditorEvents(prdNow);
  });

  document.getElementById('commentInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('commentSubmit')?.click();
    }
  });

  // Save indicator ref
  saveIndicator = document.getElementById('saveStatus');

  // Keyboard shortcuts
  const keyHandler = (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's') {
        e.preventDefault();
        store.saveVersion(prd.id, 'Manual save (Ctrl+S)');
        showToast('💾 Version saved', 'success');
      }
    }
  };
  document.addEventListener('keydown', keyHandler);
  // Store cleanup reference
  window.__editorKeyHandler = keyHandler;
}

function openCommentPanel(prd) {
  const panel = document.getElementById('commentPanel');
  panel.classList.add('open');

  const section = prd.sections.find(s => s.id === commentPanelSection);
  const title = document.getElementById('commentPanelTitle');
  if (title && section) title.textContent = `Comments — §${section.num} ${section.title}`;

  const comments = store.getComments(prd.id, commentPanelSection);
  const thread = document.getElementById('commentThread');
  if (thread) {
    thread.innerHTML = comments.length === 0
      ? `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">No comments yet.<br>Be the first to add one.</div>`
      : comments.map(c => `
        <div class="comment-item ${c.status === 'resolved' ? 'resolved' : ''}">
          <div class="comment-header">
            <div class="collab-avatar" style="background:linear-gradient(135deg,#5B7EF8,#7C5BF8);width:22px;height:22px;font-size:9px">${c.authorInitials}</div>
            <span class="comment-author">${c.author}</span>
            <span class="comment-time">${new Date(c.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            <button class="link-btn secondary" style="margin-left:auto;font-size:10px" data-resolve="${c.id}">${c.status === 'resolved' ? 'Reopen' : 'Resolve'}</button>
          </div>
          <div class="comment-text">${escapeHtml(c.text)}</div>
        </div>
      `).join('');

    // Bind resolve buttons
    thread.querySelectorAll('[data-resolve]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await store.resolveComment(prd.id, btn.dataset.resolve);
        openCommentPanel(store.getPRD(prd.id));
      });
    });
  }
}

function syncSectionContentFromDom(prd, sectionId) {
  const section = prd.sections.find(s => s.id === sectionId);
  if (!section) return;
  if (section.type === 'text') {
    const el = document.querySelector(`.section-text[data-section="${sectionId}"]`);
    if (el) section.content = el.textContent;
  } else if (section.type === 'list') {
    document.querySelectorAll(`li[data-section="${sectionId}"]`).forEach(li => {
      const idx = Number(li.dataset.item);
      if (!Number.isNaN(idx) && section.items?.[idx] !== undefined) {
        section.items[idx] = li.textContent.trim();
      }
    });
  }
}

async function runAiAssist(prd, action) {
  if (!getToken()) {
    showToast('Sign in to use AI assist', 'warn');
    return;
  }
  const sel = window.getSelection();
  const selectedText = sel?.toString()?.trim() || '';
  if (!selectedText) {
    showToast('Select text in the document first', 'warn');
    return;
  }
  if (!sel.rangeCount) return;
  const rangeSnapshot = sel.getRangeAt(0).cloneRange();
  let sectionEl = sel.anchorNode && sel.anchorNode.nodeType === Node.TEXT_NODE
    ? sel.anchorNode.parentElement?.closest?.('.prd-section')
    : sel.anchorNode?.closest?.('.prd-section');
  const sectionId = sectionEl?.dataset?.sectionId;
  const section = prd.sections.find(s => s.id === sectionId);
  try {
    showToast('AI is working…', 'info');
    const data = await api.aiAssist(prd.id, {
      action,
      selectedText,
      sectionContext: section ? JSON.stringify({ title: section.title, type: section.type }) : ''
    });
    const suggestion = data.suggestion || '';
    if (!suggestion) {
      showToast('No suggestion returned', 'warn');
      return;
    }
    const apply = window.confirm(`\n${suggestion.slice(0, 1200)}${suggestion.length > 1200 ? '…' : ''}\n\nReplace selected text with this suggestion?`);
    if (!apply) return;
    rangeSnapshot.deleteContents();
    rangeSnapshot.insertNode(document.createTextNode(suggestion));
    syncSectionContentFromDom(prd, sectionId);
    triggerAutoSave(prd.id, { sections: prd.sections });
    showToast('Text updated', 'success');
  } catch (e) {
    showToast(e.message || 'AI assist failed', 'error');
  }
}

function renderVersionList(prd) {
  const versions = store.getVersions(prd.id);
  const list = document.getElementById('versionList');
  if (!list) return;

  list.innerHTML = versions.length === 0
    ? '<div style="padding:20px;text-align:center;color:var(--text-muted)">No versions yet</div>'
    : [...versions].reverse().map(v => `
      <div class="version-item">
        <div class="version-item-header">
          <span class="version-num">v${v.versionNumber}</span>
          <span class="version-label">${escapeHtml(v.label)}</span>
          <span class="version-time">${new Date(v.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="version-meta">
          <span>${v.createdBy}</span>
          <span>·</span>
          <span>${v.contentSnapshot?.length || 0} sections</span>
          <button class="link-btn primary" data-restore="${v.id}" style="margin-left:auto">Restore</button>
        </div>
      </div>
    `).join('');

  // Bind restore buttons
  list.querySelectorAll('[data-restore]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Restore this version? Current content will be saved first.')) return;
      try {
        if (getToken()) {
          await api.restorePrdVersion(prd.id, btn.dataset.restore);
          const data = await api.getPrd(prd.id);
          const p = data.prd || data;
          store.mergePrdFromApi(normalizePrdFromApi(p));
        } else {
          store.restoreVersion(prd.id, btn.dataset.restore);
        }
        showToast('🔄 Version restored', 'success');
        await renderEditor(prd.id);
      } catch (err) {
        showToast(err.message || 'Restore failed', 'error');
      }
    });
  });
}

async function handleExport(prd, format) {
  exportModalOpen = false;
  document.getElementById('exportPanel')?.classList.remove('open');

  if (format === 'markdown' && getToken()) {
    try {
      const res = await api.exportPrd(prd.id, 'md');
      const blob = await res.blob();
      downloadBlob(`${safeFilename(prd.title)}.md`, blob, 'text/markdown');
      store.addExport(prd.id, 'markdown');
      showToast('📝 Exported as Markdown', 'success');
    } catch (e) {
      showToast(e.message || 'Export failed', 'error');
    }
    renderNotifications();
    return;
  }
  if (format === 'json' && getToken()) {
    try {
      const res = await api.exportPrd(prd.id, 'json');
      const blob = await res.blob();
      downloadBlob(`${safeFilename(prd.title)}.json`, blob, 'application/json');
      store.addExport(prd.id, 'json');
      showToast('{ } Exported as JSON', 'success');
    } catch (e) {
      showToast(e.message || 'Export failed', 'error');
    }
    renderNotifications();
    return;
  }
  if (format === 'docx' && getToken()) {
    try {
      const res = await api.exportPrd(prd.id, 'docx');
      const blob = await res.blob();
      downloadBlob(`${safeFilename(prd.title)}.docx`, blob, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      store.addExport(prd.id, 'docx');
      showToast('📃 Exported DOCX', 'success');
    } catch (e) {
      showToast(e.message || 'Export failed', 'error');
    }
    renderNotifications();
    return;
  }
  if (format === 'pdf' && getToken()) {
    try {
      const res = await api.exportPrd(prd.id, 'html');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (w) {
        store.addExport(prd.id, 'pdf');
        showToast('Print this page to PDF (Ctrl/Cmd+P)', 'success');
      }
      setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } catch (e) {
      showToast(e.message || 'Export failed', 'error');
    }
    renderNotifications();
    return;
  }

  if (format === 'markdown') {
    const md = generateMarkdown(prd);
    downloadFile(`${prd.title}.md`, md, 'text/markdown');
    store.addExport(prd.id, 'markdown');
    showToast('📝 Exported as Markdown', 'success');
  } else if (format === 'json') {
    const json = JSON.stringify(prd, null, 2);
    downloadFile(`${prd.title}.json`, json, 'application/json');
    store.addExport(prd.id, 'json');
    showToast('{ } Exported as JSON', 'success');
  } else if (format === 'clipboard') {
    const md = generateMarkdown(prd);
    navigator.clipboard.writeText(md).then(() => {
      showToast('📋 Copied to clipboard!', 'success');
    }).catch(() => {
      showToast('❌ Failed to copy', 'error');
    });
  } else if (format === 'pdf') {
    showToast('📄 Preparing PDF…', 'info');
    store.addExport(prd.id, 'pdf');
    setTimeout(() => {
      printPRD(prd);
    }, 500);
  } else if (format === 'docx') {
    const md = generateMarkdown(prd);
    downloadFile(`${prd.title}.md`, md, 'text/markdown');
    store.addExport(prd.id, 'docx');
    showToast('📃 Exported as Markdown (DOCX requires backend). File saved as .md', 'info');
  }
  renderNotifications();
}

function safeFilename(s) {
  return String(s || 'prd').replace(/[^\w\s.-]/g, '').slice(0, 80) || 'prd';
}

function downloadBlob(filename, blob, mimeType) {
  const blob2 = blob.type ? blob : new Blob([blob], { type: mimeType });
  const url = URL.createObjectURL(blob2);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateMarkdown(prd) {
  let md = `# ${prd.title}\n\n`;
  md += `**Status:** ${prd.status} | **Jira:** ${prd.jiraKey} | **Template:** ${prd.template}\n`;
  md += `**Author:** ${prd.collaborators?.[0]?.name || 'Arjun Kumar'} | **Updated:** ${new Date(prd.updatedAt || Date.now()).toLocaleDateString()}\n\n---\n\n`;

  (prd.sections || []).forEach(s => {
    md += `## §${s.num} ${s.title}\n\n`;
    if (s.type === 'text') {
      md += `${s.content}\n\n`;
    } else if (s.type === 'list') {
      (s.items || []).forEach(item => { md += `- ${item}\n`; });
      md += '\n';
    } else if (s.type === 'table') {
      const headers = s.headers || [];
      md += `| ${headers.join(' | ')} |\n`;
      md += `| ${headers.map(() => '---').join(' | ')} |\n`;
      (s.rows || []).forEach(row => { md += `| ${row.join(' | ')} |\n`; });
      md += '\n';
    }
  });

  md += `\n---\n*Generated by PM AI Tool v1.0*\n`;
  return md;
}

function printPRD(prd) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) { showToast('❌ Popup blocked — allow popups for PDF', 'error'); return; }

  const md = generateMarkdown(prd);
  const html = `<!DOCTYPE html><html><head><title>${escapeHtml(prd.title)}</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a2e; line-height: 1.7; }
      h1 { font-size: 28px; border-bottom: 3px solid #5B7EF8; padding-bottom: 12px; margin-bottom: 24px; }
      h2 { font-size: 18px; color: #333; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px; margin-top: 32px; }
      ul { padding-left: 24px; }
      li { margin: 6px 0; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0; }
      th { background: #f0f0f8; padding: 8px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #ddd; }
      td { padding: 8px 12px; border-bottom: 1px solid #eee; }
      hr { border: none; border-top: 1px solid #e0e0e0; margin: 24px 0; }
      .meta { color: #666; font-size: 14px; }
      @media print { body { margin: 20px; } }
    </style>
  </head><body>
    <h1>${escapeHtml(prd.title)}</h1>
    <p class="meta"><strong>Status:</strong> ${prd.status} &nbsp;|&nbsp; <strong>Jira:</strong> ${prd.jiraKey} &nbsp;|&nbsp; <strong>Template:</strong> ${prd.template}</p>
    <p class="meta"><strong>Author:</strong> ${prd.collaborators?.[0]?.name || 'Arjun Kumar'} &nbsp;|&nbsp; <strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
    <hr>
    ${(prd.sections || []).map(s => {
      let content = `<h2>§${s.num} ${escapeHtml(s.title)}</h2>`;
      if (s.type === 'text') content += `<p>${escapeHtml(s.content).replace(/\n/g, '<br>')}</p>`;
      else if (s.type === 'list') content += `<ul>${(s.items || []).map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
      else if (s.type === 'table') {
        content += `<table><thead><tr>${(s.headers || []).map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
        content += `<tbody>${(s.rows || []).map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      }
      return content;
    }).join('')}
    <hr><p style="font-size:12px;color:#999;text-align:center">Generated by PM AI Tool v1.0 — ${new Date().toLocaleDateString()}</p>
  </body></html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => { printWindow.print(); }, 500);
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renumberSections(prd) {
  prd.sections.forEach((s, i) => {
    s.num = String(i + 1).padStart(2, '0');
  });
}

function triggerAutoSave(prdId, updates) {
  if (saveIndicator) {
    saveIndicator.style.color = 'var(--amber)';
    saveIndicator.textContent = '● Saving…';
  }

  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    store.updatePRD(prdId, updates);
    if (saveIndicator) {
      saveIndicator.style.color = 'var(--green)';
      saveIndicator.textContent = '● Saved';
    }
  }, 800);
}

function startAutoSave(prdId) {
  stopAutoSave();
  const settings = store.getSettings();
  const interval = (settings.autoSaveInterval || 60) * 1000;
  autoSaveInterval = setInterval(() => {
    store.saveVersion(prdId, 'Auto-save');
  }, interval);
}

function stopAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
  if (window.__editorKeyHandler) {
    document.removeEventListener('keydown', window.__editorKeyHandler);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
