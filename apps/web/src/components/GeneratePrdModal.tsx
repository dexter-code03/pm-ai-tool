import { useState, useCallback, useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onGenerate: (opts: { method: string; jiraUrl?: string; pasteContent?: string; title?: string; userStory?: string; ac?: string; template: string; brief?: string }) => void;
  generating: boolean;
};

const templates = [
  { id: 'standard', icon: '📄', name: 'Standard Feature PRD', desc: 'All 15 sections · General features' },
  { id: 'mobile', icon: '📱', name: 'Mobile Feature PRD', desc: 'iOS/Android · App Store considerations' },
  { id: 'api', icon: '🔌', name: 'API PRD', desc: 'Endpoints · Auth · Rate limits' },
  { id: 'growth', icon: '🧪', name: 'Growth / Experiment PRD', desc: 'A/B tests · Hypothesis · Metrics' },
];

const genSteps = [
  'Fetching Jira ticket…',
  'Parsing ticket structure…',
  'Generating Executive Summary…',
  'Expanding Functional Requirements…',
  'Finalising all sections…',
];

export function GeneratePrdModal({ open, onClose, onGenerate, generating }: Props) {
  const [method, setMethod] = useState<'jira' | 'paste' | 'manual'>('jira');
  const [template, setTemplate] = useState('standard');
  const [jiraUrl, setJiraUrl] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [title, setTitle] = useState('');
  const [userStory, setUserStory] = useState('');
  const [ac, setAc] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!generating) {
      setActiveStep(0);
      setProgress(0);
      return;
    }
    const delays = [400, 1200, 2200, 3200, 4400];
    const pcts = [20, 40, 60, 80, 100];
    const timers: ReturnType<typeof setTimeout>[] = [];
    delays.forEach((d, i) => {
      timers.push(setTimeout(() => {
        setActiveStep(i);
        setProgress(pcts[i]);
      }, d));
    });
    return () => timers.forEach(clearTimeout);
  }, [generating]);

  const handleGenerate = useCallback(() => {
    onGenerate({
      method,
      jiraUrl: method === 'jira' ? jiraUrl : undefined,
      pasteContent: method === 'paste' ? pasteContent : undefined,
      title: method === 'manual' ? title : undefined,
      userStory: method === 'manual' ? userStory : undefined,
      ac: method === 'manual' ? ac : undefined,
      template,
      brief: method === 'paste' ? pasteContent : undefined,
    });
  }, [method, jiraUrl, pasteContent, title, userStory, ac, template, onGenerate]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="animate-modal-in w-[560px] max-w-[95vw] rounded-2xl border shadow-2xl" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-light)', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
        <div className="flex items-start justify-between px-6 pt-5">
          <div>
            <h2 className="font-heading text-lg font-bold text-[var(--text-primary)]">Generate New PRD</h2>
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">Connect a Jira ticket or paste content to get started</p>
          </div>
          <button type="button" className="text-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={onClose}>✕</button>
        </div>
        <div className="px-6 py-5">
          {/* Method tabs */}
          <div className="mb-4 flex gap-0 rounded-[9px] p-1" style={{ background: 'var(--bg-base)' }}>
            {(['jira', 'paste', 'manual'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className="flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all"
                style={{
                  background: method === m ? 'var(--bg-elevated)' : 'transparent',
                  color: method === m ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: method === m ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                }}
                onClick={() => setMethod(m)}
              >
                {m === 'jira' ? '🔗 Jira URL' : m === 'paste' ? '📋 Paste Content' : '✏️ Manual Form'}
              </button>
            ))}
          </div>

          {/* Method content */}
          {method === 'jira' && (
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Jira Ticket URL</label>
              <input
                className="w-full rounded-[9px] border px-3.5 py-2.5 text-[13.5px] text-[var(--text-primary)] outline-none transition-all focus:border-[var(--indigo)] focus:shadow-[0_0_0_3px_var(--indigo-dim)]"
                style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}
                placeholder="https://yourorg.atlassian.net/browse/PROJ-123"
                value={jiraUrl}
                onChange={(e) => setJiraUrl(e.target.value)}
              />
            </div>
          )}
          {method === 'paste' && (
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Paste Ticket Content</label>
              <textarea
                className="w-full resize-none rounded-[9px] border px-3.5 py-2.5 text-[13.5px] text-[var(--text-primary)] outline-none transition-all focus:border-[var(--indigo)] focus:shadow-[0_0_0_3px_var(--indigo-dim)]"
                style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}
                rows={4}
                placeholder="Paste your Jira ticket content, user story, or acceptance criteria here…"
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
              />
            </div>
          )}
          {method === 'manual' && (
            <>
              <div className="mb-3">
                <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Title</label>
                <input className="w-full rounded-[9px] border px-3.5 py-2.5 text-[13.5px] text-[var(--text-primary)] outline-none transition-all focus:border-[var(--indigo)] focus:shadow-[0_0_0_3px_var(--indigo-dim)]" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }} placeholder="Feature title (max 200 chars)" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">User Story</label>
                <textarea className="w-full resize-none rounded-[9px] border px-3.5 py-2.5 text-[13.5px] text-[var(--text-primary)] outline-none transition-all focus:border-[var(--indigo)] focus:shadow-[0_0_0_3px_var(--indigo-dim)]" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }} rows={2} placeholder="As a [user], I want to [action], so that [outcome]…" value={userStory} onChange={(e) => setUserStory(e.target.value)} />
              </div>
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Acceptance Criteria</label>
                <textarea className="w-full resize-none rounded-[9px] border px-3.5 py-2.5 text-[13.5px] text-[var(--text-primary)] outline-none transition-all focus:border-[var(--indigo)] focus:shadow-[0_0_0_3px_var(--indigo-dim)]" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }} rows={2} placeholder="Given… When… Then…" value={ac} onChange={(e) => setAc(e.target.value)} />
              </div>
            </>
          )}

          {/* Template selector */}
          <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Select Template</label>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                className="rounded-[9px] border p-3 text-left transition-all"
                style={{
                  background: template === t.id ? 'var(--indigo-dim)' : 'var(--bg-base)',
                  borderColor: template === t.id ? 'var(--indigo)' : 'var(--border)',
                }}
                onClick={() => setTemplate(t.id)}
              >
                <div className="text-[13px] font-semibold text-[var(--text-primary)]">{t.icon} {t.name}</div>
                <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{t.desc}</div>
              </button>
            ))}
          </div>

          {/* Generation progress */}
          {generating && (
            <div className="pt-4">
              {genSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2.5 py-1.5 text-[12.5px]" style={{ color: i < activeStep ? 'var(--green)' : i === activeStep ? 'var(--indigo)' : 'var(--text-muted)' }}>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${i < activeStep ? 'bg-[var(--green)]' : i === activeStep ? 'animate-pulse-dot bg-[var(--indigo)]' : 'bg-[var(--bg-active)]'}`} />
                  {step}
                </div>
              ))}
              <div className="mt-3 h-1 overflow-hidden rounded-sm" style={{ background: 'var(--bg-active)' }}>
                <div className="h-full rounded-sm transition-all duration-400" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--indigo), var(--teal))' }} />
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2.5 px-6 pb-5">
          <button type="button" className="rounded-lg border px-3.5 py-1.5 text-[13px] font-medium transition-all" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderColor: 'var(--border-light)' }} onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-white shadow transition-all hover:-translate-y-px disabled:opacity-50"
            style={{ background: 'var(--indigo)', boxShadow: '0 2px 8px rgba(91,126,248,0.35)' }}
            disabled={generating}
            onClick={handleGenerate}
          >
            {generating ? '⏳ Generating…' : '✨ Generate PRD'}
          </button>
        </div>
      </div>
    </div>
  );
}
