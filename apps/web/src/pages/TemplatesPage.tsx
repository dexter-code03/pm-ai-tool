import { useState } from 'react';
import { useToast } from '../hooks/useToast';

type Template = {
  id: string;
  name: string;
  icon: string;
  desc: string;
  sections: string[];
  isCustom?: boolean;
};

const builtInTemplates: Template[] = [
  { id: 'standard', icon: '📄', name: 'Standard Feature PRD', desc: 'All 15 sections — General features, specs, and requirements', sections: ['Executive Summary', 'Problem Statement', 'Goals & Objectives', 'User Stories', 'Functional Requirements', 'Non-Functional Requirements', 'Acceptance Criteria', 'Technical Architecture', 'Data Model', 'API Specifications', 'UI/UX Requirements', 'Dependencies', 'Timeline & Milestones', 'Risks & Mitigations', 'Success Metrics'] },
  { id: 'mobile', icon: '📱', name: 'Mobile Feature PRD', desc: 'iOS/Android — App Store considerations', sections: ['Overview', 'Platform Requirements', 'User Experience', 'Screen Flows', 'Push Notifications', 'Offline Support', 'Performance Targets', 'App Store Requirements'] },
  { id: 'api', icon: '🔌', name: 'API PRD', desc: 'Endpoints — Auth — Rate limits', sections: ['API Overview', 'Authentication', 'Endpoints', 'Request/Response Schemas', 'Error Handling', 'Rate Limits', 'Versioning Strategy', 'Migration Plan'] },
  { id: 'growth', icon: '🧪', name: 'Growth / Experiment PRD', desc: 'A/B tests — Hypothesis — Metrics', sections: ['Hypothesis', 'Experiment Design', 'Variants', 'Success Metrics', 'Sample Size', 'Duration', 'Rollout Plan', 'Rollback Criteria'] },
];

export function TemplatesPage() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<Template[]>(builtInTemplates);
  const [showEditor, setShowEditor] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [icon, setIcon] = useState('📋');
  const [sectionsText, setSectionsText] = useState('');

  function openEditor(tpl?: Template) {
    if (tpl) {
      setEditTemplate(tpl);
      setName(tpl.name);
      setDesc(tpl.desc);
      setIcon(tpl.icon);
      setSectionsText(tpl.sections.join('\n'));
    } else {
      setEditTemplate(null);
      setName('');
      setDesc('');
      setIcon('📋');
      setSectionsText('');
    }
    setShowEditor(true);
  }

  function saveTemplate() {
    if (!name.trim()) { showToast('Template name required', 'error'); return; }
    const sections = sectionsText.split('\n').map((s) => s.trim()).filter(Boolean);
    if (sections.length === 0) { showToast('Add at least one section', 'error'); return; }

    if (editTemplate) {
      setTemplates((prev) => prev.map((t) => t.id === editTemplate.id ? { ...t, name, desc, icon, sections } : t));
      showToast('Template updated!', 'success');
    } else {
      const newTpl: Template = { id: `custom_${Date.now()}`, name, icon, desc, sections, isCustom: true };
      setTemplates((prev) => [...prev, newTpl]);
      showToast('Template created!', 'success');
    }
    setShowEditor(false);
  }

  function deleteTemplate(id: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    showToast('Template deleted', 'info');
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--text-primary)]">PRD Templates</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Choose from built-in templates or create your own custom templates.</p>
        </div>
        <button
          type="button"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:-translate-y-0.5"
          style={{ background: 'var(--indigo)', boxShadow: '0 2px 8px rgba(91,126,248,0.35)' }}
          onClick={() => openEditor()}
        >
          + New Template
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="rounded-xl border p-5 transition-all hover:border-[var(--border-light)]"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="text-2xl">{tpl.icon}</span>
              <div className="flex-1">
                <div className="font-heading text-[15px] font-bold text-[var(--text-primary)]">{tpl.name}</div>
                <div className="text-[12px] text-[var(--text-muted)]">{tpl.desc}</div>
              </div>
              {tpl.isCustom && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'var(--indigo-dim)', color: 'var(--indigo)' }}>Custom</span>
              )}
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {tpl.sections.slice(0, 5).map((s, i) => (
                <span key={i} className="rounded-full border px-2 py-0.5 text-[10px] font-medium" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  {s}
                </span>
              ))}
              {tpl.sections.length > 5 && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">+{tpl.sections.length - 5} more</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-[var(--indigo)] transition-colors hover:bg-[rgba(91,126,248,0.15)]"
                style={{ background: 'var(--indigo-dim)' }}
                onClick={() => openEditor(tpl)}
              >
                {tpl.isCustom ? 'Edit' : 'Customize'}
              </button>
              {tpl.isCustom && (
                <button
                  type="button"
                  className="rounded-md border px-2.5 py-1 text-[11px] font-semibold text-[var(--red)] transition-colors hover:bg-[rgba(239,68,68,0.1)]"
                  style={{ borderColor: 'rgba(239,68,68,0.2)' }}
                  onClick={() => deleteTemplate(tpl.id)}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Template Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={(e) => { if (e.target === e.currentTarget) setShowEditor(false); }}>
          <div className="animate-modal-in w-[560px] max-w-[95vw] rounded-2xl border shadow-2xl" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-light)' }}>
            <div className="flex items-start justify-between px-6 pt-5 pb-4">
              <h2 className="font-heading text-lg font-bold text-[var(--text-primary)]">{editTemplate ? 'Edit Template' : 'Create New Template'}</h2>
              <button type="button" className="text-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={() => setShowEditor(false)}>✕</button>
            </div>
            <div className="space-y-4 px-6 pb-5">
              <div className="flex gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Icon</label>
                  <input
                    className="w-16 rounded-[9px] border px-3 py-2.5 text-center text-lg outline-none"
                    style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Template Name</label>
                  <input
                    className="w-full rounded-[9px] border px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all focus:border-[var(--indigo)]"
                    style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mobile Feature PRD"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Description</label>
                <input
                  className="w-full rounded-[9px] border px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all focus:border-[var(--indigo)]"
                  style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Short description of what this template covers"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Sections (one per line)</label>
                <textarea
                  className="w-full resize-none rounded-[9px] border px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all focus:border-[var(--indigo)]"
                  style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}
                  rows={8}
                  value={sectionsText}
                  onChange={(e) => setSectionsText(e.target.value)}
                  placeholder={"Executive Summary\nProblem Statement\nGoals & Objectives\n…"}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2.5 border-t px-6 py-4" style={{ borderColor: 'var(--border)' }}>
              <button type="button" className="rounded-lg border px-3.5 py-1.5 text-[13px] font-medium" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderColor: 'var(--border-light)' }} onClick={() => setShowEditor(false)}>Cancel</button>
              <button
                type="button"
                className="rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-white"
                style={{ background: 'var(--indigo)', boxShadow: '0 2px 8px rgba(91,126,248,0.35)' }}
                onClick={saveTemplate}
              >
                {editTemplate ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
