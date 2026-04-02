/* ═══════════════════════════════════════════════════════════
   PM AI TOOL — Modal System (Generate PRD + Wireframe)
   Full generation flow with AI simulation, input validation,
   template selection, and wireframe creation
   ═══════════════════════════════════════════════════════════ */

import { store } from '../data/store.js';
import { api } from '../data/api.js';
import { showToast, renderNotifications } from './notifications.js';
import { switchView } from './router.js';

export function initModals() {
  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) closeModal(o.id); });
  });

  // Escape key closes modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
    }
  });

  // Input method switcher
  document.querySelectorAll('[data-input-method]').forEach(btn => {
    btn.addEventListener('click', () => {
      const method = btn.dataset.inputMethod;
      ['jira', 'paste', 'manual'].forEach(m => {
        const el = document.getElementById('input-' + m);
        if (el) el.style.display = m === method ? '' : 'none';
      });
      btn.closest('.tab-bar, div').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');

      // Update generation steps text
      updateStepLabels(method);
    });
  });

  // Template selection
  document.querySelectorAll('.template-option').forEach(opt => {
    opt.addEventListener('click', () => {
      opt.closest('.template-options').querySelectorAll('.template-option').forEach(t => t.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });

  // Generate PRD button
  const genBtn = document.getElementById('generateBtn');
  if (genBtn) genBtn.addEventListener('click', startGeneration);

  // Generate Wireframe button
  const wfGenBtn = document.getElementById('wfGenerateBtn');
  if (wfGenBtn) {
    wfGenBtn.addEventListener('click', startWireframeGeneration);
  }

  // Filter chips (toggle groups)
  document.querySelectorAll('.chip-toggle').forEach(chip => {
    chip.addEventListener('click', () => {
      // Toggle within group (only one active per group)
      const siblings = chip.parentElement.querySelectorAll('.chip-toggle');
      siblings.forEach(s => s.classList.remove('active'));
      chip.classList.add('active');
    });
  });
}

function updateStepLabels(method) {
  const labels = {
    jira: ['Fetching Jira ticket…', 'Parsing ticket structure…', 'Generating Executive Summary…', 'Expanding Functional Requirements…', 'Finalising all sections…'],
    paste: ['Analyzing pasted content…', 'Extracting structure & fields…', 'Generating Executive Summary…', 'Building all sections…', 'Finalising PRD…'],
    manual: ['Processing form data…', 'Building context…', 'Generating Executive Summary…', 'Expanding Requirements…', 'Finalising all sections…']
  };
  const steps = labels[method] || labels.jira;
  ['gs1', 'gs2', 'gs3', 'gs4', 'gs5'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) {
      el.childNodes[1].textContent = ' ' + steps[i];
    }
  });
}

export function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('open');

  if (id === 'generateModal') {
    const progress = document.getElementById('genProgress');
    const btn = document.getElementById('generateBtn');
    const fill = document.getElementById('genBarFill');
    if (progress) progress.classList.remove('show');
    if (btn) { btn.disabled = false; btn.innerHTML = '✨ Generate PRD'; }
    if (fill) fill.style.width = '0%';
    resetGenSteps();
    // Clear validation errors
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    document.querySelectorAll('.validation-msg').forEach(el => el.remove());

    // Populate templates dynamically
    const tplContainer = document.querySelector('.template-options');
    if (tplContainer) {
      const templates = store.getTemplates();
      tplContainer.innerHTML = templates.map((t, i) => `
        <div class="template-option ${i === 0 ? 'selected' : ''}" data-tpl-id="${t.id}">
          <div class="template-option-name">${t.icon || '📄'} ${t.name}</div>
          <div class="template-option-desc">${t.description || (t.sections?.length ? t.sections.length + ' sections' : 'Custom template')}</div>
        </div>
      `).join('');
      
      // Rebind click listeners for new elements
      tplContainer.querySelectorAll('.template-option').forEach(opt => {
        opt.addEventListener('click', () => {
          tplContainer.querySelectorAll('.template-option').forEach(t => t.classList.remove('selected'));
          opt.classList.add('selected');
        });
      });
    }
  }
}

export function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

function resetGenSteps() {
  ['gs1', 'gs2', 'gs3', 'gs4', 'gs5'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('done', 'active');
  });
}

function getActiveInputMethod() {
  const activeTab = document.querySelector('[data-input-method].active');
  return activeTab?.dataset?.inputMethod || 'jira';
}

function validateInputs() {
  const method = getActiveInputMethod();
  let isValid = true;

  // Clear previous errors
  document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  document.querySelectorAll('.validation-msg').forEach(el => el.remove());

  if (method === 'jira') {
    const jiraInput = document.getElementById('jiraUrl');
    const url = jiraInput?.value?.trim();
    if (!url) {
      showValidationError(jiraInput, 'Please enter a Jira ticket URL');
      isValid = false;
    } else if (!/^https?:\/\/.*atlassian\.net\/browse\/[A-Z]+-\d+/.test(url) && !/^[A-Z]+-\d+$/.test(url)) {
      // Also accept just the key like PROJ-123
      if (!/^[A-Z]+-\d+$/.test(url)) {
        showValidationError(jiraInput, 'Enter a valid Jira URL (e.g. https://org.atlassian.net/browse/PROJ-123) or ticket key (e.g. PROJ-123)');
        isValid = false;
      }
    }
  } else if (method === 'paste') {
    const textarea = document.querySelector('#input-paste textarea');
    const text = textarea?.value?.trim();
    if (!text) {
      showValidationError(textarea, 'Please paste your ticket content');
      isValid = false;
    } else if (text.length < 50) {
      showValidationError(textarea, `Content too short (${text.length}/50 chars minimum). Add more detail for better PRD generation.`);
      isValid = false;
    }
  } else if (method === 'manual') {
    const titleInput = document.querySelector('#input-manual input');
    const title = titleInput?.value?.trim();
    if (!title) {
      showValidationError(titleInput, 'Title is required');
      isValid = false;
    } else if (title.length > 200) {
      showValidationError(titleInput, `Title too long (${title.length}/200 max)`);
      isValid = false;
    }
  }

  return isValid;
}

function showValidationError(inputEl, message) {
  if (!inputEl) return;
  inputEl.classList.add('input-error');
  const msg = document.createElement('div');
  msg.className = 'validation-msg';
  msg.textContent = message;
  inputEl.parentElement.appendChild(msg);
}

async function startGeneration() {
  if (!validateInputs()) return;

  const btn = document.getElementById('generateBtn');
  const progress = document.getElementById('genProgress');
  const fill = document.getElementById('genBarFill');

  progress?.classList.add('show');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Generating…';
  }
  resetGenSteps();

  const steps = [
    { id: 'gs1', pct: 20 },
    { id: 'gs2', pct: 40 },
    { id: 'gs3', pct: 60 },
    { id: 'gs4', pct: 80 },
    { id: 'gs5', pct: 100 }
  ];
  let stepIdx = 0;
  const stepTimer = setInterval(() => {
    if (stepIdx > 0) {
      document.getElementById(steps[stepIdx - 1].id)?.classList.remove('active');
      document.getElementById(steps[stepIdx - 1].id)?.classList.add('done');
    }
    if (stepIdx < steps.length) {
      document.getElementById(steps[stepIdx].id)?.classList.add('active');
      if (fill) fill.style.width = `${steps[stepIdx].pct}%`;
      stepIdx++;
    }
  }, 700);

  try {
    const method = getActiveInputMethod();
    let brief = '';
    let jiraContext = null;
    const templateHint =
      document.querySelector('.template-option.selected .template-option-name')?.textContent?.replace(/^[^\s]+\s/, '') ||
      'Standard Feature PRD';

    if (method === 'jira') {
      const jiraUrl = document.getElementById('jiraUrl')?.value.trim() || '';
      const jiraMatch = jiraUrl.match(/([A-Z]+-\d+)/);
      const jiraKey = jiraMatch ? jiraMatch[1] : `PROJ-${Math.floor(Math.random() * 900) + 100}`;
      brief = `Generate a PRD for Jira ticket ${jiraKey}. Include acceptance criteria and rollout plan.`;
      jiraContext = { url: jiraUrl, key: jiraKey };
    } else if (method === 'paste') {
      brief = document.querySelector('#input-paste textarea')?.value?.trim() || '';
    } else {
      const title = document.querySelector('#input-manual input')?.value?.trim() || 'Untitled PRD';
      const userStory = document.querySelector('#input-manual textarea:first-of-type')?.value?.trim() || '';
      const ac = document.querySelector('#input-manual textarea:last-of-type')?.value?.trim() || '';
      brief = `${title}\n\nUser story:\n${userStory}\n\nAcceptance criteria:\n${ac}`;
    }

    const prdRaw = await api.generatePrd({ brief, templateHint, jiraContext });
    const { normalizePrdFromApi } = await import('../data/normalize.js');
    const n = normalizePrdFromApi(prdRaw);
    const icons = ['📄', '📱', '🔌', '📊', '🧪', '🐛', '⚡', '🎯'];
    const colors = ['blue', 'teal', 'amber'];
    n.icon = icons[Math.floor(Math.random() * icons.length)];
    n.iconColor = colors[Math.floor(Math.random() * colors.length)];
    n.collaborators = n.collaborators?.length
      ? n.collaborators
      : [
          {
            initials: 'AK',
            name: 'Arjun Kumar',
            gradient: 'linear-gradient(135deg,#5B7EF8,#7C5BF8)',
            status: 'Editing now',
            statusColor: 'var(--teal)'
          }
        ];
    store.mergePrdFromApi(n);
    closeModal('generateModal');
    showToast('✅ PRD generated successfully!', 'success');
    renderNotifications();
    switchView('prd-editor', n.id);
  } catch (e) {
    showToast(e.message || 'Generation failed', 'error');
  } finally {
    clearInterval(stepTimer);
    document.getElementById('gs5')?.classList.remove('active');
    document.getElementById('gs5')?.classList.add('done');
    if (fill) fill.style.width = '100%';
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '✨ Generate PRD';
    }
    progress?.classList.remove('show');
  }
}

async function startWireframeGeneration() {
  const textInput = document.querySelector('#wireframeModal textarea');
  const brief = textInput?.value?.trim();

  if (!brief) {
    showToast('⚠️ Please describe your screen or user flow', 'warn');
    textInput?.focus();
    return;
  }

  const btn = document.getElementById('wfGenerateBtn');
  btn.disabled = true;
  btn.innerHTML = '⏳ Generating…';

  const platform = document.querySelector('#wireframeModal .chip-toggle.active')?.textContent?.trim() || 'Mobile';
  const deviceMap = { Mobile: 'MOBILE', Desktop: 'DESKTOP', Tablet: 'TABLET' };
  const deviceType = deviceMap[platform] || 'DESKTOP';

  showToast('🎨 Generating wireframes (Stitch)…', 'info');

  try {
    const title = brief.length > 80 ? `${brief.slice(0, 80)}…` : brief;
    const res = await api.generateWireframeStandalone({ title, brief, deviceType });
    const wf = res.wireframe || res;
    const { normalizeWireframeFromApi } = await import('../data/normalize.js');
    const n = normalizeWireframeFromApi(wf);
    store.mergeWireframeFromApi(n);
    store.addNotification({
      title: `Wireframe Created — ${n.title}`,
      sub: `${n.screens} screens`,
      type: 'info',
      color: 'var(--teal)'
    });
    closeModal('wireframeModal');
    textInput.value = '';
    showToast(`✅ Wireframe ready: ${n.screens} screens`, 'success');
    renderNotifications();
    switchView('wireframes');
  } catch (e) {
    showToast(e.message || 'Wireframe generation failed', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🎨 Generate Wireframe';
  }
}
