import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, type WireframeListItem } from '../lib/api';
import type { PrdSection } from '../lib/prdSection';
import { createEmptySection, normalizeSections } from '../lib/prdSection';
import { PrdSectionEditor } from '../components/PrdSectionEditor';
import { ExportModal } from '../components/ExportModal';
import { VersionHistoryPanel } from '../components/VersionHistoryPanel';
import { ApprovalWorkflow } from '../components/ApprovalWorkflow';
import { useCollaboration } from '../hooks/useCollaboration';
import { useToast } from '../hooks/useToast';

const DEBOUNCE_MS = 700;

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'rgba(78,90,114,0.25)', text: 'var(--text-muted)', label: 'Draft' },
  review: { bg: 'var(--amber-dim)', text: 'var(--amber)', label: 'In Review' },
  approved: { bg: 'var(--green-dim)', text: 'var(--green)', label: 'Approved' },
  archived: { bg: 'rgba(78,90,114,0.25)', text: 'var(--text-muted)', label: 'Archived' },
};

export function PrdEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('draft');
  const [sections, setSections] = useState<PrdSection[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState('');
  const [linkedWireframes, setLinkedWireframes] = useState<WireframeListItem[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveStateRef = useRef(saveState);
  saveStateRef.current = saveState;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ title: string; status: string; sections: PrdSection[] } | null>(null);
  const idRef = useRef(id);
  idRef.current = id;

  const [showExportModal, setShowExportModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const [showJiraBanner, setShowJiraBanner] = useState(true);
  const [showDiffView, setShowDiffView] = useState(false);
  const [diffData, setDiffData] = useState<{ original: string; suggestion: string; sectionTitle: string } | null>(null);

  const { collaborators, connected } = useCollaboration(id);

  const flushSave = useCallback(async () => {
    const pending = pendingRef.current;
    const prdId = idRef.current;
    if (!pending || !prdId) return;
    pendingRef.current = null;
    setSaveState('saving');
    try {
      await api.patchPrd(prdId, { title: pending.title, status: pending.status, content: pending.sections });
      setSaveState('saved');
      window.setTimeout(() => { if (saveStateRef.current === 'saved') setSaveState('idle'); }, 2000);
    } catch (e) {
      setSaveState('error');
      setErr(e instanceof Error ? e.message : 'Save failed');
    }
  }, []);

  const scheduleSave = useCallback((nextTitle: string, nextStatus: string, nextSections: PrdSection[]) => {
    pendingRef.current = { title: nextTitle, status: nextStatus, sections: nextSections };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { timerRef.current = null; void flushSave(); }, DEBOUNCE_MS);
  }, [flushSave]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (pendingRef.current && idRef.current) {
      void api.patchPrd(idRef.current, { title: pendingRef.current.title, status: pendingRef.current.status, content: pendingRef.current.sections });
    }
  }, []);

  const loadPrd = useCallback(async () => {
    if (!id) return;
    setLoaded(false);
    setErr('');
    try {
      const data = await api.getPrd(id);
      const prd = data.prd;
      setTitle(prd.title || '');
      setStatus(prd.status || 'draft');
      setSections(normalizeSections(prd.content));
      setLoaded(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load PRD');
      setLoaded(true);
    }
  }, [id]);

  useEffect(() => { void loadPrd(); }, [loadPrd]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await api.getPrdWireframes(id);
        setLinkedWireframes(data.wireframes || []);
      } catch {
        setLinkedWireframes([]);
      }
    })();
  }, [id]);

  const pushChange = useCallback((nextTitle: string, nextStatus: string, nextSections: PrdSection[]) => {
    setTitle(nextTitle);
    setStatus(nextStatus);
    setSections(nextSections);
    scheduleSave(nextTitle, nextStatus, nextSections);
  }, [scheduleSave]);

  const updateSection = (index: number, s: PrdSection) => pushChange(title, status, sections.map((sec, i) => (i === index ? s : sec)));
  const removeSection = (index: number) => pushChange(title, status, sections.filter((_, i) => i !== index));
  const duplicateSection = (index: number) => {
    const sec = sections[index];
    const dup: PrdSection = { ...sec, id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`, title: `${sec.title || 'Section'} (copy)` };
    const next = [...sections];
    next.splice(index + 1, 0, dup);
    pushChange(title, status, next);
    showToast('Section duplicated', 'success');
  };
  const moveSection = (from: number, to: number) => {
    const next = [...sections];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    pushChange(title, status, next);
  };
  const addSection = (type: Parameters<typeof createEmptySection>[0]) => pushChange(title, status, [...sections, createEmptySection(type)]);

  async function handleAiAssist(action: string) {
    if (!id) return;
    showToast(`AI ${action}ing text…`, 'info');
    try {
      const data = await api.aiAssist(id, { action });
      if (data.result) {
        setDiffData({ original: '(current content)', suggestion: data.result, sectionTitle: `AI ${action}` });
        setShowDiffView(true);
        showToast(`AI ${action} complete — review suggestion`, 'success');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : `AI ${action} failed`, 'error');
    }
  }

  function handleShareLink() {
    const url = `${window.location.origin}/prd/${id}`;
    navigator.clipboard.writeText(url).then(
      () => showToast('Share link copied to clipboard!', 'success'),
      () => showToast('Failed to copy link', 'error')
    );
  }

  function handleApprovalStatusChange(newStatus: string) {
    pushChange(title, newStatus, sections);
  }

  const sc = statusColors[status] || statusColors.draft;

  return (
    <div className="flex h-full -m-[28px_-32px]" style={{ margin: '-28px -32px', height: 'calc(100% + 56px)' }}>
      <div className="flex flex-1 flex-col overflow-hidden" style={{ minWidth: 0 }}>
        {/* Editor toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b px-6 py-2.5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <Link to="/" className="rounded px-2.5 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
            ← Back
          </Link>
          <div className="mx-1.5 h-5 w-px" style={{ background: 'var(--border)' }} />
          <ToolbarBtn onClick={() => handleAiAssist('improve')} style={{ color: 'var(--indigo)', fontSize: 11 }}>✨ Improve</ToolbarBtn>
          <ToolbarBtn onClick={() => handleAiAssist('shorten')} style={{ color: 'var(--teal)', fontSize: 11 }}>✂️ Shorten</ToolbarBtn>
          <div className="mx-1.5 h-5 w-px" style={{ background: 'var(--border)' }} />
          <div className="flex items-center gap-1.5 text-xs">
            {saveState === 'saving' && <span className="text-[var(--amber)]">Saving…</span>}
            {saveState === 'saved' && <span className="font-semibold text-[var(--green)]">● Saved</span>}
            {saveState === 'error' && <span className="text-[var(--red)]">Save failed</span>}
            {saveState === 'idle' && <span className="font-semibold text-[var(--green)]">● Saved</span>}
            <button
              type="button"
              className="cursor-pointer text-[var(--text-muted)] underline decoration-dotted hover:text-[var(--text-primary)]"
              onClick={() => setShowVersionHistory(true)}
            >
              v1.0
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* Collaborators */}
            <div className="flex -space-x-1.5 pl-1.5">
              {collaborators.length > 0 ? (
                collaborators.map((c, i) => (
                  <span
                    key={i}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold text-white"
                    style={{ background: c.color || '#5B7EF8', borderColor: 'var(--bg-surface)' }}
                    title={c.name}
                  >
                    {c.name.slice(0, 2).toUpperCase()}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-[var(--text-muted)]">
                  {connected ? 'Connected' : ''}
                </span>
              )}
              {connected && (
                <span className="ml-1 h-2 w-2 rounded-full bg-[var(--green)] shadow-[0_0_4px_rgba(34,197,94,0.5)]" title="Connected" />
              )}
            </div>
            <button
              type="button"
              className="rounded-lg border px-3 py-1 text-xs font-medium transition-all"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderColor: 'var(--border-light)' }}
              onClick={handleShareLink}
              title="Copy share link"
            >
              🔗 Share
            </button>
            <button
              type="button"
              className="rounded-lg border px-3 py-1 text-xs font-medium transition-all"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderColor: 'var(--border-light)' }}
              onClick={() => setShowExportModal(true)}
            >
              Export ↓
            </button>
            <button
              type="button"
              className="rounded-lg border px-3 py-1 text-xs font-medium transition-all"
              style={{ background: 'var(--teal-dim)', color: 'var(--teal)', borderColor: 'rgba(45,212,183,0.3)' }}
              onClick={() => {
                if (!id) return;
                navigate(`/wireframes?generateFromPrd=${id}`);
              }}
            >
              🎨 Wireframes
            </button>
            <button
              type="button"
              className="rounded-lg px-3 py-1 text-xs font-medium text-white transition-all"
              style={{ background: 'var(--indigo)', boxShadow: '0 2px 8px rgba(91,126,248,0.35)' }}
              onClick={() => setShowApproval(true)}
            >
              Send for Review
            </button>
          </div>
        </div>

        {/* Editor scroll area */}
        <div className="flex-1 overflow-y-auto px-12 py-8">
          {err && <p className="mb-4 text-sm text-[var(--red)]">{err}</p>}
          {!loaded && !err && <p className="text-[var(--text-muted)]">Loading…</p>}
          {loaded && !err && (
            <>
              {/* Jira webhook banner */}
              {showJiraBanner && (
                <div className="mb-5 flex items-center gap-3 rounded-xl border px-4 py-3" style={{ background: 'var(--amber-dim)', borderColor: 'rgba(245,158,11,0.25)' }}>
                  <span className="text-base">🔗</span>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-[var(--amber)]">Source Jira ticket may have been updated</div>
                    <div className="text-[11.5px] text-[var(--text-muted)]">Acceptance criteria changed — your PRD may need updating to stay in sync.</div>
                  </div>
                  <button type="button" className="rounded-md border px-2.5 py-1 text-[11px] font-semibold text-[var(--amber)] transition-colors hover:bg-[rgba(245,158,11,0.15)]" style={{ borderColor: 'rgba(245,158,11,0.3)' }} onClick={() => showToast('Re-syncing from Jira…', 'info')}>
                    Re-sync
                  </button>
                  <button type="button" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={() => setShowJiraBanner(false)}>✕</button>
                </div>
              )}

              {/* Title block */}
              <div className="mb-9">
                <input
                  className="w-full border-b-2 border-transparent bg-transparent font-heading text-[28px] font-extrabold leading-snug tracking-tight text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--indigo)]"
                  value={title}
                  onChange={(e) => pushChange(e.target.value, status, sections)}
                  onBlur={() => void flushSave()}
                  placeholder="PRD Title"
                />
                <div className="mt-3.5 flex flex-wrap gap-5">
                  <MetaItem label="Status">
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: sc.bg, color: sc.text }}>
                      <span style={{ fontSize: 7 }}>●</span> {sc.label}
                    </span>
                    <select
                      className="ml-1 rounded border bg-transparent px-1 py-0.5 text-xs outline-none"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                      value={status}
                      onChange={(e) => pushChange(title, e.target.value, sections)}
                    >
                      <option value="draft">Draft</option>
                      <option value="review">In Review</option>
                      <option value="approved">Approved</option>
                      <option value="archived">Archived</option>
                    </select>
                  </MetaItem>
                  <MetaItem label="Template">Standard Feature PRD</MetaItem>
                  <MetaItem label="Updated">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</MetaItem>
                </div>
              </div>

              {/* Sections */}
              {sections.map((sec, index) => (
                <PrdSectionEditor
                  key={sec.id}
                  section={sec}
                  index={index}
                  prdId={id}
                  onChange={(s) => updateSection(index, s)}
                  onRemove={() => removeSection(index)}
                  onDuplicate={() => duplicateSection(index)}
                  onMoveUp={index > 0 ? () => moveSection(index, index - 1) : undefined}
                  onMoveDown={index < sections.length - 1 ? () => moveSection(index, index + 1) : undefined}
                />
              ))}

              <div className="flex flex-wrap gap-2">
                {(['text', 'list', 'table'] as const).map((t) => (
                  <button key={t} type="button" className="rounded-lg border px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }} onClick={() => addSection(t)}>
                    + {t.charAt(0).toUpperCase() + t.slice(1)} section
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-[260px] min-w-[260px] overflow-y-auto border-l px-4 py-5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <SidebarWidget title="Document Outline">
          {sections.map((sec, i) => {
            const confColor = sec.confidence === 'high' ? 'var(--green)' : sec.confidence === 'mid' ? 'var(--amber)' : sec.confidence === 'low' ? '#EF4444' : 'var(--bg-active)';
            return (
              <div key={sec.id} className="flex items-center gap-2 rounded-[7px] px-2.5 py-1.5 text-[12.5px] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: confColor }} />
                §{sec.num || String(i + 1).padStart(2, '0')} {sec.title || 'Untitled'}
              </div>
            );
          })}
        </SidebarWidget>

        <div className="mx-1 my-4 h-px" style={{ background: 'var(--border)' }} />

        <SidebarWidget title="Confidence Key">
          <div className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-[var(--green)] shadow-[0_0_6px_rgba(34,197,94,0.4)]" /> High — from ticket text</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-[var(--amber)] shadow-[0_0_6px_rgba(245,158,11,0.4)]" /> Medium — AI inferred</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-[#EF4444] shadow-[0_0_6px_rgba(239,68,68,0.4)]" /> Low — verify required</div>
          </div>
        </SidebarWidget>

        <div className="mx-1 my-4 h-px" style={{ background: 'var(--border)' }} />

        <SidebarWidget title="Linked Wireframe">
          {linkedWireframes.length === 0 ? (
            <div>
              <p className="text-xs text-[var(--text-muted)]">No wireframes linked yet.</p>
              <button
                type="button"
                className="mt-2 w-full rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition-all hover:-translate-y-px"
                style={{ background: 'var(--teal)', boxShadow: '0 2px 8px rgba(45,212,183,0.35)' }}
                onClick={() => {
                  if (!id) return;
                  navigate(`/wireframes?generateFromPrd=${id}`);
                }}
              >
                🎨 Generate from this PRD
              </button>
            </div>
          ) : (
            linkedWireframes.map((w) => (
              <div key={w.id} className="rounded-[10px] border p-3" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                <div className="text-[12.5px] font-semibold text-[var(--text-primary)]">{w.title}</div>
                <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{w.screens?.length ?? 0} screens · {new Date(w.updatedAt).toLocaleDateString()}</div>
                <div className="mt-2 flex gap-1.5">
                  <Link to={`/wireframes/${w.id}`} className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-[var(--indigo)] transition-colors hover:bg-[rgba(91,126,248,0.25)]" style={{ background: 'var(--indigo-dim)' }}>View</Link>
                  <Link to={`/wireframes/${w.id}`} className="rounded-md border px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]" style={{ background: 'var(--bg-active)', borderColor: 'var(--border)' }}>Manage</Link>
                </div>
              </div>
            ))
          )}
        </SidebarWidget>

        <div className="mx-1 my-4 h-px" style={{ background: 'var(--border)' }} />

        <SidebarWidget title="Approval Workflow">
          <div
            className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-[var(--bg-hover)]"
            onClick={() => setShowApproval(true)}
          >
            <div className="flex flex-col gap-2">
              {(['draft', 'review', 'approved'] as const).map((s) => {
                const done = status === 'approved' || (status === 'review' && s === 'draft') || (status === 'archived');
                const current = status === s;
                const labelMap: Record<string, string> = { draft: 'Draft', review: 'In Review', approved: 'Approved' };
                return (
                  <div key={s} className="flex items-center gap-2 text-xs">
                    {done ? <span className="text-[var(--green)]">✓</span> : current ? <span className="text-[var(--amber)]">●</span> : <span className="text-[var(--text-muted)]">○</span>}
                    <span className={current ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>{labelMap[s]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </SidebarWidget>
      </div>

      {/* Modals */}
      <ExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        prdId={id}
        prdTitle={title}
      />
      <VersionHistoryPanel
        open={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        prdId={id}
        onRestore={() => void loadPrd()}
      />
      <ApprovalWorkflow
        open={showApproval}
        onClose={() => setShowApproval(false)}
        status={status}
        onStatusChange={handleApprovalStatusChange}
        prdTitle={title}
      />

      {/* AI Diff View Modal */}
      {showDiffView && diffData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={(e) => { if (e.target === e.currentTarget) setShowDiffView(false); }}>
          <div className="animate-modal-in w-[640px] max-w-[95vw] rounded-2xl border shadow-2xl" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-light)' }}>
            <div className="flex items-start justify-between border-b px-6 py-4" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h2 className="font-heading text-lg font-bold text-[var(--text-primary)]">AI Suggestion</h2>
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">{diffData.sectionTitle}</p>
              </div>
              <button type="button" className="text-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={() => setShowDiffView(false)}>✕</button>
            </div>
            <div className="max-h-[400px] overflow-y-auto px-6 py-5">
              <div className="mb-4">
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Original</div>
                <div className="rounded-lg border p-3 text-[13px] text-[var(--text-secondary)]" style={{ background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.15)' }}>
                  {diffData.original}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">AI Suggestion</div>
                <div className="rounded-lg border p-3 text-[13px] text-[var(--text-secondary)]" style={{ background: 'rgba(34,197,94,0.04)', borderColor: 'rgba(34,197,94,0.15)' }}>
                  {diffData.suggestion}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 border-t px-6 py-3.5" style={{ borderColor: 'var(--border)' }}>
              <button type="button" className="rounded-lg border px-3.5 py-1.5 text-[13px] font-medium" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderColor: 'var(--border-light)' }} onClick={() => setShowDiffView(false)}>Dismiss</button>
              <button type="button" className="rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-white" style={{ background: 'var(--green)', boxShadow: '0 2px 8px rgba(34,197,94,0.35)' }} onClick={() => { showToast('Suggestion applied!', 'success'); setShowDiffView(false); }}>
                ✓ Accept Suggestion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarWidget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[1px] text-[var(--text-muted)]">{title}</div>
      {children}
    </div>
  );
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
      <strong className="font-medium text-[var(--text-secondary)]">{label}</strong>
      {children}
    </div>
  );
}

function ToolbarBtn({ children, onClick, style }: { children: React.ReactNode; onClick: () => void; style?: React.CSSProperties }) {
  return (
    <button
      type="button"
      className="rounded-md px-2 py-1.5 text-[13px] font-semibold transition-all hover:bg-[var(--bg-hover)]"
      style={{ color: 'var(--text-muted)', ...style }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
