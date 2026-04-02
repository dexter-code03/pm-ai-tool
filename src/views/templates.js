/* ═══════════════════════════════════════════════════════════
   PM AI TOOL — Template Library (Phase 2)
   Full template CRUD, drag-drop editor, variables, sharing
   ═══════════════════════════════════════════════════════════ */

import { store } from '../data/store.js';
import { showToast } from '../components/notifications.js';

let activeEditor = null; // template being edited

export function renderTemplates() {
  const container = document.getElementById('templatesContent');
  if (!container) return;

  const templates = store.getTemplates();
  const builtIn = templates.filter(t => t.isDefault);
  const custom = templates.filter(t => !t.isDefault);

  container.innerHTML = `
    <div class="tpl-page">
      <div class="tpl-header">
        <div>
          <h1 class="tpl-title">📋 Template Library</h1>
          <p class="tpl-subtitle">${templates.length} templates · ${builtIn.length} built-in · ${custom.length} custom</p>
        </div>
        <div class="tpl-actions">
          <button class="btn btn-secondary" id="importTplBtn">📥 Import</button>
          <button class="btn btn-primary" id="createTplBtn">+ New Template</button>
        </div>
      </div>

      <div class="tpl-section">
        <div class="section-header">
          <h2>Built-in Templates</h2>
          <span class="count">${builtIn.length}</span>
        </div>
        <div class="tpl-grid">
          ${builtIn.map(t => renderTemplateCard(t)).join('')}
        </div>
      </div>

      <div class="tpl-section">
        <div class="section-header">
          <h2>Custom Templates</h2>
          <span class="count">${custom.length}</span>
        </div>
        ${custom.length === 0 ? `
          <div class="empty-state" style="padding:40px">
            <div class="empty-icon">🎨</div>
            <div class="empty-title">No Custom Templates</div>
            <div class="empty-sub">Create a template from scratch or save one from the PRD editor</div>
          </div>
        ` : `<div class="tpl-grid">${custom.map(t => renderTemplateCard(t)).join('')}</div>`}
      </div>

      ${activeEditor ? renderTemplateEditor() : ''}
    </div>
    <input type="file" id="tplFileInput" accept=".json" style="display:none">
  `;

  bindTemplateEvents();
}

function renderTemplateCard(t) {
  const sectionCount = t.sections?.length || 0;
  const visibility = t.visibility || 'personal';
  const visIcon = visibility === 'org' ? '🏢' : visibility === 'team' ? '👥' : '👤';
  return `
    <div class="tpl-card ${t.isDefault ? 'default' : ''}" data-id="${t.id}">
      <div class="tpl-card-top">
        <div class="tpl-card-icon" style="background:${t.color || 'var(--indigo-dim)'}">
          ${t.icon || '📄'}
        </div>
        <div class="tpl-card-info">
          <div class="tpl-card-name">${t.name}</div>
          <div class="tpl-card-desc">${t.description || 'No description'}</div>
        </div>
        ${t.isDefault ? '<span class="tpl-badge default">Built-in</span>' : `<span class="tpl-badge custom">${visIcon} ${visibility}</span>`}
      </div>
      <div class="tpl-card-meta">
        <span>📑 ${sectionCount} sections</span>
        <span>📊 Used ${t.usageCount || 0}×</span>
        ${t.variables?.length ? `<span>🔤 ${t.variables.length} vars</span>` : ''}
      </div>
      <div class="tpl-card-sections">
        ${(t.sections || []).slice(0, 5).map(s => `<span class="tpl-section-tag">${s.title || s.name}</span>`).join('')}
        ${sectionCount > 5 ? `<span class="tpl-section-tag more">+${sectionCount - 5}</span>` : ''}
      </div>
      <div class="tpl-card-actions">
        <button class="link-btn primary tpl-use-btn" data-id="${t.id}">Use Template</button>
        <button class="link-btn secondary tpl-edit-btn" data-id="${t.id}">Edit</button>
        <button class="link-btn secondary tpl-export-btn" data-id="${t.id}">Export</button>
        ${!t.isDefault ? `<button class="link-btn secondary tpl-dup-btn" data-id="${t.id}">📋</button>
        <button class="link-btn secondary tpl-del-btn" data-id="${t.id}" style="color:var(--red)">🗑</button>` : `<button class="link-btn secondary tpl-dup-btn" data-id="${t.id}">📋 Clone</button>`}
      </div>
    </div>
  `;
}

function renderTemplateEditor() {
  if (!activeEditor) return '';
  const t = activeEditor;
  const sections = t.sections || [];

  return `
    <div class="tpl-editor-overlay" id="tplEditorOverlay">
      <div class="tpl-editor">
        <div class="tpl-editor-header">
          <h2>${t.id ? 'Edit Template' : 'New Template'}</h2>
          <button class="modal-close" id="closeTplEditor">✕</button>
        </div>
        <div class="tpl-editor-body">
          <div class="tpl-editor-left">
            <div class="input-group">
              <label class="input-label">Template Name</label>
              <input class="input-field" id="tplEdName" value="${t.name || ''}" placeholder="e.g. Mobile Feature PRD">
            </div>
            <div class="input-group">
              <label class="input-label">Description</label>
              <textarea class="input-field" id="tplEdDesc" rows="2" placeholder="Briefly describe when to use this template">${t.description || ''}</textarea>
            </div>
            <div class="input-group" style="display:flex;gap:12px">
              <div style="flex:1">
                <label class="input-label">Visibility</label>
                <select class="input-field" id="tplEdVisibility">
                  <option value="personal" ${t.visibility === 'personal' ? 'selected' : ''}>👤 Personal</option>
                  <option value="team" ${t.visibility === 'team' ? 'selected' : ''}>👥 Team</option>
                  <option value="org" ${t.visibility === 'org' ? 'selected' : ''}>🏢 Organization</option>
                </select>
              </div>
              <div style="flex:1">
                <label class="input-label">Icon</label>
                <select class="input-field" id="tplEdIcon">
                  ${['📄','📋','📊','🔧','🐛','🚀','📱','🎨','⚡','🧪'].map(i => `<option value="${i}" ${t.icon === i ? 'selected' : ''}>${i}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="input-group">
              <label class="input-label">Variables (comma-separated)</label>
              <input class="input-field" id="tplEdVars" value="${(t.variables || []).join(', ')}" placeholder="e.g. product_name, team_name, target_date">
              <div style="font-size:10px;color:var(--text-muted);margin-top:4px">Use {{variable_name}} in section guidance to create fill-at-generation fields</div>
            </div>
          </div>
          <div class="tpl-editor-right">
            <div class="tpl-editor-sections-header">
              <label class="input-label" style="margin:0">Sections (Drag to reorder)</label>
              <button class="link-btn primary" id="addTplSection">+ Add Section</button>
            </div>
            <div class="tpl-editor-sections" id="tplSectionsList">
              ${sections.map((s, i) => `
                <div class="tpl-section-item" data-index="${i}" draggable="true">
                  <div class="tpl-section-drag">⋮⋮</div>
                  <div class="tpl-section-content">
                    <input class="tpl-section-name-input" value="${s.title || s.name || ''}" data-index="${i}" placeholder="Section title">
                    <div class="tpl-section-row">
                      <select class="tpl-section-type" data-index="${i}">
                        <option value="text" ${s.type === 'text' ? 'selected' : ''}>Text</option>
                        <option value="list" ${s.type === 'list' ? 'selected' : ''}>List</option>
                        <option value="table" ${s.type === 'table' ? 'selected' : ''}>Table</option>
                      </select>
                      <label class="tpl-section-required">
                        <input type="checkbox" ${s.required !== false ? 'checked' : ''} data-index="${i}" class="tpl-req-check"> Required
                      </label>
                    </div>
                    <textarea class="tpl-section-guidance" data-index="${i}" placeholder="AI guidance for this section…" rows="2">${s.guidance || ''}</textarea>
                  </div>
                  <button class="tpl-section-delete" data-index="${i}">✕</button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="tpl-editor-footer">
          <button class="btn btn-secondary" id="cancelTplEditor">Cancel</button>
          <button class="btn btn-primary" id="saveTplEditor">💾 Save Template</button>
        </div>
      </div>
    </div>
  `;
}

function bindTemplateEvents() {
  // Create new
  document.getElementById('createTplBtn')?.addEventListener('click', () => {
    activeEditor = {
      id: null,
      name: '',
      description: '',
      icon: '📄',
      visibility: 'personal',
      variables: [],
      sections: [
        { title: 'Executive Summary', type: 'text', required: true, guidance: '' },
        { title: 'Problem Statement', type: 'text', required: true, guidance: '' },
        { title: 'Goals & Success Metrics', type: 'list', required: true, guidance: '' },
        { title: 'User Stories', type: 'list', required: true, guidance: '' },
        { title: 'Functional Requirements', type: 'list', required: true, guidance: '' }
      ]
    };
    renderTemplates();
  });

  // Import template
  document.getElementById('importTplBtn')?.addEventListener('click', () => {
    document.getElementById('tplFileInput')?.click();
  });
  document.getElementById('tplFileInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = store.importTemplate(ev.target.result);
      if (result) {
        showToast('📥 Template imported successfully!', 'success');
        store.addAuditEntry('template.created', `Imported: ${result.name}`);
        renderTemplates();
      } else {
        showToast('❌ Invalid template file', 'error');
      }
    };
    reader.readAsText(file);
  });

  // Card actions
  document.querySelectorAll('.tpl-use-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      store.incrementTemplateUsage(btn.dataset.id);
      showToast('📋 Template selected — use it when generating a PRD', 'info');
    });
  });

  document.querySelectorAll('.tpl-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tpl = store.getTemplate(btn.dataset.id);
      if (tpl) {
        activeEditor = JSON.parse(JSON.stringify(tpl));
        renderTemplates();
      }
    });
  });

  document.querySelectorAll('.tpl-export-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const json = store.exportTemplate(btn.dataset.id);
      if (json) {
        const tpl = JSON.parse(json);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `template-${tpl.name.replace(/\s+/g, '-').toLowerCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('📤 Template exported as JSON', 'success');
      }
    });
  });

  document.querySelectorAll('.tpl-dup-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const result = store.duplicateTemplate(btn.dataset.id);
      if (result) {
        showToast('📋 Template duplicated', 'success');
        renderTemplates();
      }
    });
  });

  document.querySelectorAll('.tpl-del-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Delete this template?')) {
        store.deleteTemplate(btn.dataset.id);
        showToast('🗑 Template deleted', 'warn');
        renderTemplates();
      }
    });
  });

  // Editor events
  bindEditorEvents();
}

function bindEditorEvents() {
  document.getElementById('closeTplEditor')?.addEventListener('click', closeEditor);
  document.getElementById('cancelTplEditor')?.addEventListener('click', closeEditor);
  document.getElementById('tplEditorOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'tplEditorOverlay') closeEditor();
  });

  // Add section
  document.getElementById('addTplSection')?.addEventListener('click', () => {
    if (!activeEditor) return;
    if (!activeEditor.sections) activeEditor.sections = [];
    activeEditor.sections.push({ title: 'New Section', type: 'text', required: false, guidance: '' });
    renderTemplates();
  });

  // Delete section
  document.querySelectorAll('.tpl-section-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!activeEditor) return;
      activeEditor.sections.splice(parseInt(btn.dataset.index), 1);
      renderTemplates();
    });
  });

  // Drag and drop reorder
  const list = document.getElementById('tplSectionsList');
  if (list) {
    let dragSrc = null;
    list.querySelectorAll('.tpl-section-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        dragSrc = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        dragSrc = null;
      });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('drag-over');
      });
      item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        if (!dragSrc || !activeEditor) return;
        const from = parseInt(dragSrc.dataset.index);
        const to = parseInt(item.dataset.index);
        if (from === to) return;
        syncEditorFields();
        const [moved] = activeEditor.sections.splice(from, 1);
        activeEditor.sections.splice(to, 0, moved);
        renderTemplates();
      });
    });
  }

  // Save
  document.getElementById('saveTplEditor')?.addEventListener('click', () => {
    if (!activeEditor) return;
    syncEditorFields();

    if (!activeEditor.name?.trim()) {
      showToast('❌ Template name is required', 'error');
      return;
    }

    if (activeEditor.id) {
      // Update existing
      store.updateTemplate(activeEditor.id, activeEditor);
      showToast('💾 Template updated', 'success');
      store.addAuditEntry('template.updated', activeEditor.name);
    } else {
      // Create new
      activeEditor.id = 'tpl-' + Date.now();
      activeEditor.isDefault = false;
      activeEditor.usageCount = 0;
      activeEditor.createdAt = new Date().toISOString();
      activeEditor.color = 'var(--indigo-dim)';
      store.createTemplate(activeEditor);
      showToast('✅ Template created!', 'success');
      store.addAuditEntry('template.created', activeEditor.name);
    }
    closeEditor();
  });
}

function syncEditorFields() {
  if (!activeEditor) return;
  activeEditor.name = document.getElementById('tplEdName')?.value || '';
  activeEditor.description = document.getElementById('tplEdDesc')?.value || '';
  activeEditor.visibility = document.getElementById('tplEdVisibility')?.value || 'personal';
  activeEditor.icon = document.getElementById('tplEdIcon')?.value || '📄';

  const varsStr = document.getElementById('tplEdVars')?.value || '';
  activeEditor.variables = varsStr.split(',').map(v => v.trim()).filter(Boolean);

  document.querySelectorAll('.tpl-section-name-input').forEach(inp => {
    const idx = parseInt(inp.dataset.index);
    if (activeEditor.sections[idx]) activeEditor.sections[idx].title = inp.value;
  });
  document.querySelectorAll('.tpl-section-type').forEach(sel => {
    const idx = parseInt(sel.dataset.index);
    if (activeEditor.sections[idx]) activeEditor.sections[idx].type = sel.value;
  });
  document.querySelectorAll('.tpl-req-check').forEach(chk => {
    const idx = parseInt(chk.dataset.index);
    if (activeEditor.sections[idx]) activeEditor.sections[idx].required = chk.checked;
  });
  document.querySelectorAll('.tpl-section-guidance').forEach(ta => {
    const idx = parseInt(ta.dataset.index);
    if (activeEditor.sections[idx]) activeEditor.sections[idx].guidance = ta.value;
  });
}

function closeEditor() {
  activeEditor = null;
  renderTemplates();
}
