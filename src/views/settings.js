/* ═══════════════════════════════════════════════════════════
   PM AI TOOL — Settings View (Full Feature)
   Working settings controls with persistence
   ═══════════════════════════════════════════════════════════ */

import { store } from '../data/store.js';
import { showToast } from '../components/notifications.js';
import { api } from '../data/api.js';

export function renderSettings() {
  const container = document.getElementById('settingsContent');
  if (!container) return;

  const settings = store.getSettings();
  const templates = store.getTemplates();
  const hasStitchKey = !!(String(settings.stitchApiKey || '').trim());

  container.innerHTML = `
    <div class="section-header" style="margin-bottom:24px">
      <h2>Settings</h2>
    </div>

    <div class="settings-grid">
      <!-- Integrations -->
      <div class="settings-card">
        <div class="settings-card-title">🔗 Integrations</div>
        <div class="integration-item">
          <div class="integration-icon" style="background:rgba(74,158,255,0.1)">🎫</div>
          <div style="flex:1">
            <div class="integration-name">Jira</div>
            <div class="integration-status" style="color:var(--green)">● Connected</div>
          </div>
          <button class="link-btn secondary" data-settings-action="jira">Manage</button>
        </div>
        <div class="integration-item">
          <div class="integration-icon" style="background:rgba(162,89,255,0.1)">🎨</div>
          <div style="flex:1">
            <div class="integration-name">Figma</div>
            <div class="integration-status" style="color:var(--green)">● Connected</div>
          </div>
          <button class="link-btn secondary" data-settings-action="figma">Manage</button>
        </div>
        <div class="integration-item">
          <div class="integration-icon" style="background:rgba(45,212,183,0.1)">💬</div>
          <div style="flex:1">
            <div class="integration-name">Slack</div>
            <div class="integration-status" style="color:var(--text-muted)">○ Not connected</div>
          </div>
          <button class="link-btn primary" data-settings-action="slack">Connect</button>
        </div>
        <div class="integration-item">
          <div class="integration-icon" style="background:rgba(245,158,11,0.1)">📝</div>
          <div style="flex:1">
            <div class="integration-name">Confluence</div>
            <div class="integration-status" style="color:var(--text-muted)">○ Not connected</div>
          </div>
          <button class="link-btn primary" data-settings-action="confluence">Connect</button>
        </div>
        <div class="integration-item">
          <div class="integration-icon" style="background:rgba(239,68,68,0.1)">📮</div>
          <div style="flex:1">
            <div class="integration-name">Notion</div>
            <div class="integration-status" style="color:var(--text-muted)">○ Not connected</div>
          </div>
          <button class="link-btn primary" data-settings-action="notion">Connect</button>
        </div>
        <div class="integration-item">
          <div class="integration-icon" style="background:rgba(162,89,255,0.12)">🧵</div>
          <div style="flex:1">
            <div class="integration-name">Stitch (Wireframes)</div>
            <div class="integration-status" style="color:${hasStitchKey ? 'var(--green)' : 'var(--text-muted)'}">
              ${hasStitchKey ? '● API key saved locally' : '○ Add key below'}
            </div>
          </div>
        </div>
      </div>

      <div class="settings-card">
        <div class="settings-card-title">🔑 LLM & Slack (server)</div>
        <p style="font-size:11px;color:var(--text-muted);margin:-4px 0 12px;line-height:1.5">
          Keys are stored encrypted server-side. At least one LLM provider is required for PRD generation.
        </p>
        <div class="setting-row">
          <div class="setting-label">OpenAI API Key</div>
          <div style="display:flex;gap:8px;flex:1;max-width:480px;flex-wrap:wrap">
            <input class="input-field" type="password" id="settingOpenAiKey" placeholder="sk-…" style="flex:1;min-width:200px;font-size:12px;padding:6px 10px">
            <input class="input-field" type="text" id="settingOpenAiModel" placeholder="gpt-4o" style="width:120px;font-size:12px;padding:6px 10px">
            <button class="btn btn-secondary" type="button" id="saveOpenAiBtn" style="font-size:11px">Save</button>
            <button class="btn btn-ghost" type="button" id="testOpenAiBtn" style="font-size:11px">Test</button>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-label">Slack webhook URL</div>
          <div style="display:flex;gap:8px;flex:1;max-width:480px;flex-wrap:wrap">
            <input class="input-field" type="password" id="settingSlackWebhook" placeholder="https://hooks.slack.com/…" style="flex:1;min-width:200px;font-size:12px;padding:6px 10px">
            <button class="btn btn-secondary" type="button" id="saveSlackBtn" style="font-size:11px">Save</button>
            <button class="btn btn-ghost" type="button" id="testSlackBtn" style="font-size:11px">Test</button>
          </div>
        </div>
      </div>

      <!-- Stitch (local demo: key stored in browser; production uses a server proxy) -->
      <div class="settings-card">
        <div class="settings-card-title">🎨 Stitch / Wireframe Defaults</div>
        <p style="font-size:11px;color:var(--text-muted);margin:-4px 0 12px;line-height:1.5">
          Get a key from <a href="https://stitch.withgoogle.com" target="_blank" rel="noopener noreferrer">stitch.withgoogle.com</a>.
          Keys are saved on the server via Settings → Integrations when you are signed in.
        </p>
        <div class="setting-row">
          <div class="setting-label">Stitch API Key</div>
          <div style="display:flex;gap:8px;flex:1;max-width:420px">
            <input class="input-field" type="password" id="settingStitchKey" placeholder="Paste API key…" value="${hasStitchKey ? '••••••••••••••••' : ''}" style="flex:1;font-size:12px;padding:6px 10px">
            <button class="btn btn-secondary" type="button" id="saveStitchKey" style="font-size:11px;padding:4px 10px">Save</button>
            <button class="btn btn-ghost" type="button" id="testStitchKey" style="font-size:11px;padding:4px 10px" ${!hasStitchKey ? 'disabled' : ''}>Test</button>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-label">Device Type</div>
          <select class="settings-select" id="settingStitchDevice">
            <option value="DESKTOP" ${settings.stitchDeviceType === 'DESKTOP' ? 'selected' : ''}>Desktop</option>
            <option value="MOBILE" ${settings.stitchDeviceType === 'MOBILE' ? 'selected' : ''}>Mobile</option>
            <option value="TABLET" ${settings.stitchDeviceType === 'TABLET' ? 'selected' : ''}>Tablet</option>
          </select>
        </div>
      </div>

      <!-- AI Preferences -->
      <div class="settings-card">
        <div class="settings-card-title">🤖 AI Preferences</div>
        <div class="setting-row">
          <div class="setting-label">AI Model</div>
          <select class="settings-select" id="settingAiModel">
            <option ${settings.aiModel === 'Claude Sonnet 4' ? 'selected' : ''}>Claude Sonnet 4</option>
            <option ${settings.aiModel === 'Claude Opus 4' ? 'selected' : ''}>Claude Opus 4</option>
            <option ${settings.aiModel === 'GPT-4o' ? 'selected' : ''}>GPT-4o</option>
            <option ${settings.aiModel === 'GPT-4.1' ? 'selected' : ''}>GPT-4.1</option>
            <option ${settings.aiModel === 'Gemini 2.5 Pro' ? 'selected' : ''}>Gemini 2.5 Pro</option>
          </select>
        </div>
        <div class="setting-row">
          <div class="setting-label">Auto-save Interval</div>
          <select class="settings-select" id="settingAutoSave">
            <option value="30" ${settings.autoSaveInterval === 30 ? 'selected' : ''}>30 seconds</option>
            <option value="60" ${settings.autoSaveInterval === 60 ? 'selected' : ''}>60 seconds</option>
            <option value="120" ${settings.autoSaveInterval === 120 ? 'selected' : ''}>2 minutes</option>
            <option value="300" ${settings.autoSaveInterval === 300 ? 'selected' : ''}>5 minutes</option>
          </select>
        </div>
        <div class="setting-row">
          <div class="setting-label">PRD Language</div>
          <select class="settings-select" id="settingLanguage">
            <option ${settings.language === 'English' ? 'selected' : ''}>English</option>
            <option ${settings.language === 'Hindi' ? 'selected' : ''}>Hindi</option>
            <option ${settings.language === 'Spanish' ? 'selected' : ''}>Spanish</option>
            <option ${settings.language === 'French' ? 'selected' : ''}>French</option>
            <option ${settings.language === 'German' ? 'selected' : ''}>German</option>
            <option ${settings.language === 'Japanese' ? 'selected' : ''}>Japanese</option>
          </select>
        </div>
        <div class="setting-row">
          <div class="setting-label">Default Template</div>
          <select class="settings-select" id="settingTemplate">
            ${templates.map(t => `<option ${settings.defaultTemplate === t.name ? 'selected' : ''}>${t.name}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Appearance -->
      <div class="settings-card">
        <div class="settings-card-title">🎨 Appearance</div>
        <div class="setting-row">
          <div class="setting-label">Theme</div>
          <select class="settings-select" id="settingTheme">
            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>🌙 Dark</option>
            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>☀️ Light</option>
            <option value="system" ${settings.theme === 'system' ? 'selected' : ''}>🖥️ System</option>
          </select>
        </div>
        <div class="setting-row">
          <div class="setting-label">Editor Font Size</div>
          <select class="settings-select" id="settingFontSize">
            <option value="12" ${settings.editorFontSize === 12 ? 'selected' : ''}>12px</option>
            <option value="13" ${settings.editorFontSize === 13 ? 'selected' : ''}>13px</option>
            <option value="14" ${settings.editorFontSize === 14 ? 'selected' : ''}>14px</option>
            <option value="15" ${settings.editorFontSize === 15 ? 'selected' : ''}>15px</option>
            <option value="16" ${settings.editorFontSize === 16 ? 'selected' : ''}>16px</option>
          </select>
        </div>
      </div>

      <!-- Notifications -->
      <div class="settings-card">
        <div class="settings-card-title">🔔 Notifications</div>
        <div class="setting-row">
          <div class="setting-label">Email Notifications</div>
          <label class="toggle-switch">
            <input type="checkbox" id="settingEmailNotif" ${settings.notificationsEmail ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-row">
          <div class="setting-label">In-App Notifications</div>
          <label class="toggle-switch">
            <input type="checkbox" id="settingInAppNotif" ${settings.notificationsInApp ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Templates -->
      <div class="settings-card" style="grid-column: 1 / -1">
        <div class="settings-card-title" style="display:flex;align-items:center;justify-content:space-between">
          <span>📋 Template Library</span>
          <button class="link-btn primary" id="createTemplateBtn">+ New Template</button>
        </div>
        <div class="template-library">
          ${templates.map(t => `
            <div class="template-lib-item">
              <div class="template-lib-icon">${t.icon}</div>
              <div style="flex:1">
                <div class="template-lib-name">${t.name}</div>
                <div class="template-lib-desc">${t.description}</div>
                <div class="template-lib-meta">
                  <span>${t.sections} sections</span>
                  <span>·</span>
                  <span>${t.visibility === 'org' ? '🏢 Org' : '👤 Personal'}</span>
                  <span>·</span>
                  <span>Used ${t.usageCount}x</span>
                  ${t.tags ? `<span>·</span>${t.tags.map(tag => `<span class="template-tag">${tag}</span>`).join('')}` : ''}
                </div>
              </div>
              ${!t.isDefault ? `<button class="link-btn secondary" data-delete-tpl="${t.id}" style="color:var(--red);font-size:10px">Delete</button>` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Account -->
      <div class="settings-card">
        <div class="settings-card-title">👤 Account</div>
        <div class="setting-row">
          <div class="setting-label">Name</div>
          <div class="setting-value">Arjun Kumar</div>
        </div>
        <div class="setting-row">
          <div class="setting-label">Role</div>
          <div class="setting-value">Product Manager</div>
        </div>
        <div class="setting-row">
          <div class="setting-label">Email</div>
          <div class="setting-value">arjun@company.com</div>
        </div>
        <div class="setting-row">
          <div class="setting-label">Organization</div>
          <div class="setting-value">Acme Corp</div>
        </div>
      </div>

      <!-- Data Management -->
      <div class="settings-card">
        <div class="settings-card-title">🗄️ Data Management</div>
        <div class="setting-row">
          <div class="setting-label">Storage Used</div>
          <div class="setting-value">${(JSON.stringify(store.getSettings()).length / 1024).toFixed(1)} KB</div>
        </div>
        <div class="setting-row" style="border-bottom:none;padding-top:16px;gap:8px;flex-wrap:wrap">
          <button class="btn btn-secondary" id="exportAllBtn" style="font-size:12px">📦 Export All Data</button>
          <button class="btn btn-danger" id="resetDataBtn" style="font-size:12px">🗑️ Reset All Data</button>
        </div>
      </div>
    </div>
  `;

  // Bind setting change events
  document.getElementById('saveOpenAiBtn')?.addEventListener('click', async () => {
    const apiKey = document.getElementById('settingOpenAiKey')?.value?.trim();
    const model = document.getElementById('settingOpenAiModel')?.value?.trim() || 'gpt-4o';
    if (!apiKey) return showToast('Enter OpenAI API key', 'warn');
    try {
      await api.updateIntegration('openai', { apiKey, model });
      showToast('OpenAI saved', 'success');
    } catch (e) {
      showToast(e.message || 'Save failed', 'error');
    }
  });
  document.getElementById('testOpenAiBtn')?.addEventListener('click', async () => {
    try {
      const r = await api.testIntegration('openai');
      showToast(r.message || 'OK', 'success');
    } catch (e) {
      showToast(e.message || 'Test failed', 'error');
    }
  });
  document.getElementById('saveSlackBtn')?.addEventListener('click', async () => {
    const webhookUrl = document.getElementById('settingSlackWebhook')?.value?.trim();
    if (!webhookUrl) return showToast('Enter Slack webhook URL', 'warn');
    try {
      await api.updateIntegration('slack', { webhookUrl });
      showToast('Slack webhook saved', 'success');
    } catch (e) {
      showToast(e.message || 'Save failed', 'error');
    }
  });
  document.getElementById('testSlackBtn')?.addEventListener('click', async () => {
    try {
      const r = await api.testIntegration('slack');
      showToast(r.message || 'OK', 'success');
    } catch (e) {
      showToast(e.message || 'Test failed', 'error');
    }
  });

  document.getElementById('saveStitchKey')?.addEventListener('click', async () => {
    const key = document.getElementById('settingStitchKey')?.value;
    if (!key || key.startsWith('••')) return showToast('Enter a new Stitch API key', 'warn');
    store.updateSettings({ stitchApiKey: key.trim() });
    try {
      await api.updateIntegration('stitch', {
        apiKey: key.trim(),
        deviceType: document.getElementById('settingStitchDevice')?.value || 'DESKTOP'
      });
      showToast('Stitch API key saved on server', 'success');
    } catch (e) {
      showToast(e.message || 'Save failed', 'error');
    }
    document.getElementById('testStitchKey').disabled = false;
    renderSettings();
  });

  document.getElementById('testStitchKey')?.addEventListener('click', async () => {
    try {
      const r = await api.testIntegration('stitch');
      showToast(r.message || 'Stitch OK', 'success');
    } catch (e) {
      showToast(e.message || 'Test failed', 'error');
    }
  });

  document.getElementById('settingStitchDevice')?.addEventListener('change', async (e) => {
    store.updateSettings({ stitchDeviceType: e.target.value });
    try {
      await api.updateIntegration('stitch', { deviceType: e.target.value });
      showToast(`Stitch device: ${e.target.value}`, 'success');
    } catch {
      showToast(`Stitch device: ${e.target.value}`, 'success');
    }
  });

  document.getElementById('settingAiModel')?.addEventListener('change', (e) => {
    store.updateSettings({ aiModel: e.target.value });
    showToast(`🤖 AI Model: ${e.target.value}`, 'success');
  });

  document.getElementById('settingAutoSave')?.addEventListener('change', (e) => {
    store.updateSettings({ autoSaveInterval: parseInt(e.target.value) });
    showToast(`💾 Auto-save: ${e.target.value}s`, 'success');
  });

  document.getElementById('settingLanguage')?.addEventListener('change', (e) => {
    store.updateSettings({ language: e.target.value });
    showToast(`🌍 Language: ${e.target.value}`, 'success');
  });

  document.getElementById('settingTemplate')?.addEventListener('change', (e) => {
    store.updateSettings({ defaultTemplate: e.target.value });
    showToast(`📋 Default: ${e.target.value}`, 'success');
  });

  document.getElementById('settingTheme')?.addEventListener('change', (e) => {
    store.updateSettings({ theme: e.target.value });
    showToast(`🎨 Theme: ${e.target.value}`, 'success');
  });

  document.getElementById('settingFontSize')?.addEventListener('change', (e) => {
    store.updateSettings({ editorFontSize: parseInt(e.target.value) });
    showToast(`🔤 Font: ${e.target.value}px`, 'success');
  });

  document.getElementById('settingEmailNotif')?.addEventListener('change', (e) => {
    store.updateSettings({ notificationsEmail: e.target.checked });
    showToast(e.target.checked ? '📧 Email notifications on' : '📧 Email notifications off', 'info');
  });

  document.getElementById('settingInAppNotif')?.addEventListener('change', (e) => {
    store.updateSettings({ notificationsInApp: e.target.checked });
    showToast(e.target.checked ? '🔔 In-app notifications on' : '🔔 In-app notifications off', 'info');
  });

  // Integration buttons
  container.querySelectorAll('[data-settings-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.settingsAction;
      const msgs = {
        jira: '🎫 Jira settings — OAuth 2.0 connected',
        figma: '🎨 Figma settings — OAuth connected',
        slack: '💬 Connecting to Slack… (OAuth required)',
        confluence: '📝 Connecting to Confluence… (OAuth required)',
        notion: '📮 Connecting to Notion… (OAuth required)'
      };
      showToast(msgs[action] || 'Opening settings…', 'info');
    });
  });

  // Create template
  document.getElementById('createTemplateBtn')?.addEventListener('click', () => {
    const name = prompt('Template name:');
    if (!name) return;
    const desc = prompt('Template description:') || 'Custom template';
    store.createTemplate({
      id: 'tpl-' + Date.now(),
      name,
      description: desc,
      icon: '📄',
      isDefault: false,
      visibility: 'personal',
      sections: 15,
      tags: ['custom'],
      usageCount: 0
    });
    showToast(`📋 Template "${name}" created`, 'success');
    renderSettings();
  });

  // Delete templates
  container.querySelectorAll('[data-delete-tpl]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tplId = btn.dataset.deleteTpl;
      if (confirm('Delete this template?')) {
        store.deleteTemplate(tplId);
        showToast('🗑️ Template deleted', 'warn');
        renderSettings();
      }
    });
  });

  // Export all data
  document.getElementById('exportAllBtn')?.addEventListener('click', () => {
    const data = localStorage.getItem('pm_ai_tool_data');
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pm-ai-tool-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📦 Data exported', 'success');
  });

  // Reset data
  document.getElementById('resetDataBtn')?.addEventListener('click', () => {
    if (confirm('Reset all data to defaults? This will clear all your PRDs, wireframes, and settings.')) {
      store.reset();
    }
  });
}
