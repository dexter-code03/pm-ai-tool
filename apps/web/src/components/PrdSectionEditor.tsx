import { useState } from 'react';
import type { PrdSection, PrdSectionType } from '../lib/prdSection';
import { api } from '../lib/api';
import { TiptapEditor } from './TiptapEditor';
import { CommentThread } from './CommentThread';
import { useToast } from '../hooks/useToast';

type Props = {
  section: PrdSection;
  index: number;
  prdId?: string;
  onChange: (s: PrdSection) => void;
  onRemove: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

const confDot: Record<string, { cls: string; title: string }> = {
  high: { cls: 'bg-[var(--green)] shadow-[0_0_6px_rgba(34,197,94,0.4)]', title: 'High Confidence' },
  mid: { cls: 'bg-[var(--amber)] shadow-[0_0_6px_rgba(245,158,11,0.4)]', title: 'Medium Confidence' },
  low: { cls: 'bg-[var(--red)] shadow-[0_0_6px_rgba(239,68,68,0.4)]', title: 'Low Confidence' },
};

export function PrdSectionEditor({ section, index, prdId, onChange, onRemove, onDuplicate, onMoveUp, onMoveDown }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const { showToast } = useToast();
  const conf = section.confidence ? confDot[section.confidence] : null;
  const sectionNum = section.num || String(index + 1).padStart(2, '0');

  const setType = (type: PrdSectionType) => {
    if (type === section.type) return;
    if (type === 'text') {
      onChange({ ...section, type: 'text', content: '', items: undefined, headers: undefined, rows: undefined });
    } else if (type === 'list') {
      onChange({ ...section, type: 'list', items: [''], content: undefined, headers: undefined, rows: undefined });
    } else {
      onChange({ ...section, type: 'table', headers: ['Column A', 'Column B'], rows: [['', '']], content: undefined, items: undefined });
    }
  };

  async function handleRegenerate() {
    if (!prdId) { showToast('No PRD context for regeneration', 'error'); return; }
    setRegenerating(true);
    try {
      const data = await api.regenerateSection(prdId, { sectionId: section.id });
      if (data.section && typeof data.section === 'object') {
        const regen = data.section as Partial<PrdSection>;
        onChange({ ...section, content: regen.content ?? section.content, items: regen.items ?? section.items });
      }
      showToast('Section regenerated', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Regeneration failed', 'error');
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div
      className="mb-3.5 overflow-hidden rounded-xl border transition-all hover:border-[var(--border-light)]"
      style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
    >
      {/* Section head */}
      <div
        className="group flex cursor-pointer items-center gap-3 px-[18px] py-3.5"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="shrink-0 rounded bg-[var(--bg-active)] px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-[var(--text-muted)]">
          §{sectionNum}
        </span>
        <input
          type="text"
          className="min-w-0 flex-1 border-none bg-transparent font-heading text-sm font-semibold text-[var(--text-primary)] outline-none"
          value={section.title || ''}
          onChange={(e) => { e.stopPropagation(); onChange({ ...section, title: e.target.value }); }}
          onClick={(e) => e.stopPropagation()}
          placeholder="Section title"
        />

        {/* Hover controls */}
        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
          <CtrlBtn
            title="Regenerate"
            cls="hover:text-[var(--indigo)] hover:border-[rgba(91,126,248,0.3)] hover:bg-[var(--indigo-dim)]"
            onClick={() => void handleRegenerate()}
          >
            {regenerating ? '⏳' : '↻'}
          </CtrlBtn>
          <CtrlBtn
            title="Comment"
            cls="hover:text-[var(--teal)] hover:border-[rgba(45,212,183,0.3)] hover:bg-[var(--teal-dim)]"
            onClick={() => setShowComments(true)}
          >
            💬
          </CtrlBtn>
          <CtrlBtn title="Lock" onClick={() => showToast('Section locked', 'success')}>🔒</CtrlBtn>
          {onDuplicate && <CtrlBtn title="Duplicate" cls="hover:text-[var(--amber)] hover:border-[rgba(245,158,11,0.3)] hover:bg-[var(--amber-dim)]" onClick={onDuplicate}>⧉</CtrlBtn>}
          {onMoveUp && <CtrlBtn title="Move up" onClick={onMoveUp}>↑</CtrlBtn>}
          {onMoveDown && <CtrlBtn title="Move down" onClick={onMoveDown}>↓</CtrlBtn>}
          <CtrlBtn title="Remove" cls="hover:text-[var(--red)] hover:border-[rgba(239,68,68,0.3)] hover:bg-[var(--red-dim)]" onClick={onRemove}>×</CtrlBtn>
        </div>

        {conf && <span className={`h-2 w-2 shrink-0 rounded-full ${conf.cls}`} title={conf.title} />}
        <span className={`text-xs text-[var(--text-muted)] transition-transform ${collapsed ? '-rotate-90' : ''}`}>▾</span>
      </div>

      {/* Section body */}
      {!collapsed && (
        <div className="px-[18px] pb-[18px]">
          {section.confidence === 'low' && (
            <div className="mb-3 flex items-center gap-2 rounded-[7px] border px-3 py-2 text-xs font-medium" style={{ background: 'var(--red-dim)', color: '#F87171', borderColor: 'rgba(239,68,68,0.2)' }}>
              ⚠️ Low confidence — AI inferred this section. Please verify carefully.
            </div>
          )}
          {section.confidence === 'mid' && (
            <div className="mb-3 flex items-center gap-2 rounded-[7px] border px-3 py-2 text-xs font-medium" style={{ background: 'var(--amber-dim)', color: 'var(--amber)', borderColor: 'rgba(245,158,11,0.2)' }}>
              ⚡ Medium confidence — inferred from ticket context. Please verify KPI targets.
            </div>
          )}

          <div className="mb-3 flex items-center gap-2">
            <select
              className="rounded border px-2 py-1 text-xs outline-none"
              style={{ background: 'var(--bg-active)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              value={section.type}
              onChange={(e) => setType(e.target.value as PrdSectionType)}
            >
              <option value="text">Text</option>
              <option value="list">List</option>
              <option value="table">Table</option>
            </select>
            <div className="ml-auto flex items-center gap-1">
              <span className="text-[10px] text-[var(--text-muted)]">Helpful?</span>
              <button
                type="button"
                className={`rounded px-1.5 py-0.5 text-[12px] transition-all ${feedback === 'up' ? 'bg-[var(--green-dim)] text-[var(--green)]' : 'text-[var(--text-muted)] hover:text-[var(--green)]'}`}
                onClick={() => { setFeedback(feedback === 'up' ? null : 'up'); showToast('Thanks for the feedback!', 'success'); }}
                title="Thumbs up"
              >👍</button>
              <button
                type="button"
                className={`rounded px-1.5 py-0.5 text-[12px] transition-all ${feedback === 'down' ? 'bg-[var(--red-dim)] text-[var(--red)]' : 'text-[var(--text-muted)] hover:text-[var(--red)]'}`}
                onClick={() => { setFeedback(feedback === 'down' ? null : 'down'); showToast('Feedback noted — we\'ll improve this.', 'info'); }}
                title="Thumbs down"
              >👎</button>
            </div>
          </div>

          {section.type === 'text' && (
            <TiptapEditor
              content={section.content || ''}
              onChange={(html) => onChange({ ...section, content: html })}
              placeholder="Write section content…"
            />
          )}

          {section.type === 'list' && (
            <ul className="space-y-1.5">
              {(section.items || ['']).map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-2.5 shrink-0 text-xs font-semibold text-[var(--indigo)]">→</span>
                  <input
                    className="flex-1 rounded border px-2.5 py-1.5 text-[13.5px] text-[var(--text-secondary)] outline-none transition-all focus:border-[var(--indigo)] focus:shadow-[0_0_0_3px_var(--indigo-dim)]"
                    style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}
                    value={item}
                    onChange={(e) => {
                      const items = [...(section.items || [])];
                      items[i] = e.target.value;
                      onChange({ ...section, items });
                    }}
                  />
                  <button type="button" className="mt-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={() => {
                    const items = (section.items || []).filter((_, j) => j !== i);
                    onChange({ ...section, items: items.length ? items : [''] });
                  }}>×</button>
                </li>
              ))}
              <li>
                <button type="button" className="text-sm font-medium text-[var(--indigo)] hover:underline" onClick={() => onChange({ ...section, items: [...(section.items || []), ''] })}>
                  + Add item
                </button>
              </li>
            </ul>
          )}

          {section.type === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    {(section.headers || ['A', 'B']).map((h, hi) => (
                      <th key={hi} className="border-b px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ background: 'var(--bg-active)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                        <input className="w-full bg-transparent text-[var(--text-muted)] outline-none" value={h} onChange={(e) => {
                          const headers = [...(section.headers || [])];
                          headers[hi] = e.target.value;
                          onChange({ ...section, headers });
                        }} />
                      </th>
                    ))}
                    <th className="w-12 border-b px-2 py-2" style={{ background: 'var(--bg-active)', borderColor: 'var(--border)' }}>
                      <button type="button" className="text-xs text-[var(--indigo)]" onClick={() => {
                        const headers = [...(section.headers || []), `Col ${(section.headers?.length || 0) + 1}`];
                        const rows = (section.rows || []).map((r) => [...r, '']);
                        onChange({ ...section, headers, rows });
                      }}>+Col</button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(section.rows || [['', '']]).map((row, ri) => (
                    <tr key={ri} className="hover:bg-[var(--bg-hover)]">
                      {row.map((cell, ci) => (
                        <td key={ci} className="border-b px-3 py-2.5" style={{ borderColor: 'var(--border)' }}>
                          <input className="w-full bg-transparent text-[13px] text-[var(--text-secondary)] outline-none" value={cell} onChange={(e) => {
                            const rows = [...(section.rows || [])];
                            const r = [...(rows[ri] || [])];
                            r[ci] = e.target.value;
                            rows[ri] = r;
                            onChange({ ...section, rows });
                          }} />
                        </td>
                      ))}
                      <td className="border-b px-2 py-2" style={{ borderColor: 'var(--border)' }}>
                        <button type="button" className="text-xs text-[var(--text-muted)] hover:text-[var(--red)]" onClick={() => {
                          const rows = (section.rows || []).filter((_, j) => j !== ri);
                          onChange({ ...section, rows: rows.length ? rows : [['']] });
                        }}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" className="mt-2 text-sm font-medium text-[var(--indigo)] hover:underline" onClick={() => {
                const colCount = section.headers?.length || 2;
                onChange({ ...section, rows: [...(section.rows || []), Array(colCount).fill('')] });
              }}>+ Add row</button>
            </div>
          )}
        </div>
      )}

      <CommentThread
        open={showComments}
        onClose={() => setShowComments(false)}
        prdId={prdId}
        sectionId={section.id}
        sectionTitle={section.title}
      />
    </div>
  );
}

function CtrlBtn({ children, title, cls, onClick }: { children: React.ReactNode; title: string; cls?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      className={`flex h-[26px] w-[26px] items-center justify-center rounded-md border text-[11px] transition-all ${cls || ''}`}
      style={{ background: 'var(--bg-active)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
