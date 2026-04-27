import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, generatePrd, type PrdRow } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { GeneratePrdModal } from '../components/GeneratePrdModal';

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'rgba(78,90,114,0.25)', text: 'var(--text-muted)', label: 'Draft' },
  review: { bg: 'var(--amber-dim)', text: 'var(--amber)', label: 'In Review' },
  approved: { bg: 'var(--green-dim)', text: 'var(--green)', label: 'Approved' },
  archived: { bg: 'rgba(78,90,114,0.25)', text: 'var(--text-muted)', label: 'Archived' },
};

const cardIcons = ['📄', '📱', '🔌', '📊', '🧪', '🐛', '🚀', '💡'];

export function DashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [prds, setPrds] = useState<PrdRow[]>([]);
  const [err, setErr] = useState('');
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('All');
  const [showGenModal, setShowGenModal] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getPrds();
        setPrds(data.prds || []);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load');
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const total = prds.length;
    const inReview = prds.filter((p) => p.status === 'review').length;
    const approved = prds.filter((p) => p.status === 'approved').length;
    return { total, inReview, approved };
  }, [prds]);

  const filtered = useMemo(() => {
    if (filter === 'All') return prds;
    const key = filter === 'In Review' ? 'review' : filter.toLowerCase();
    return prds.filter((p) => p.status === key);
  }, [prds, filter]);

  async function handleGenerate(opts: { method: string; brief?: string; template: string; jiraUrl?: string; pasteContent?: string; title?: string; userStory?: string; ac?: string }) {
    setGenerating(true);
    try {
      const jiraContext = opts.method === 'jira' && opts.jiraUrl ? { url: opts.jiraUrl } : undefined;
      const brief =
        opts.brief ||
        opts.pasteContent ||
        (opts.method === 'jira' && opts.jiraUrl ? `Generate a PRD for Jira ticket at: ${opts.jiraUrl}` : undefined) ||
        [opts.title, opts.userStory, opts.ac].filter(Boolean).join('\n\n') ||
        undefined;
      const { prd } = await generatePrd({ brief, templateHint: opts.template, jiraContext });
      setShowGenModal(false);
      showToast('PRD generated successfully!', 'success');
      navigate(`/prd/${prd.id}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function handleExportCard(prdId: string) {
    try {
      const data = await api.exportPrd(prdId, 'html');
      if (data.html || data.content) {
        const blob = new Blob([data.html || data.content || ''], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prd-export.html';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Exported successfully', 'success');
      } else if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Export failed', 'error');
    }
  }

  async function handleNewPrd() {
    setCreating(true);
    try {
      const { prd } = await api.createPrd({ title: 'Untitled PRD', content: [], status: 'draft' });
      navigate(`/prd/${prd.id}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not create PRD', 'error');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Stat cards */}
      <div className="mb-7 grid grid-cols-4 gap-3.5">
        <StatCard color="var(--indigo)" label="Total PRDs" value={stats.total} sub={`+${Math.min(stats.total, 3)} this month`} />
        <StatCard color="var(--teal)" label="In Review" value={stats.inReview} sub="Awaiting approval" />
        <StatCard color="var(--green)" label="Approved" value={stats.approved} sub={stats.total ? `${Math.round((stats.approved / stats.total) * 100)}% approval rate` : '—'} />
        <StatCard color="var(--amber)" label="Avg Gen Time" value="68" unit="s" sub="Target < 90s ✓" />
      </div>

      {/* Section header */}
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-heading text-base font-bold text-[var(--text-primary)]">Recent PRDs</h2>
        <button
          type="button"
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all hover:-translate-y-0.5"
          style={{ background: 'var(--indigo)', boxShadow: '0 2px 8px rgba(91,126,248,0.35)' }}
          onClick={() => setShowGenModal(true)}
        >
          ✨ Generate with AI
        </button>
        <span className="rounded-[10px] bg-[var(--bg-active)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">{prds.length}</span>
        <div className="ml-auto flex gap-1.5">
          {['All', 'Draft', 'In Review', 'Approved'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="rounded-full border px-3 py-1 text-xs font-medium transition-all"
              style={{
                background: filter === f ? 'var(--indigo-dim)' : 'var(--bg-elevated)',
                color: filter === f ? 'var(--indigo)' : 'var(--text-secondary)',
                borderColor: filter === f ? 'rgba(91,126,248,0.3)' : 'var(--border)',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {err && <p className="mb-4 text-sm text-[var(--red)]">{err}</p>}

      {/* PRD Grid */}
      <div className="grid gap-3">
        {filtered.map((p, i) => {
          const sc = statusColors[p.status] || statusColors.draft;
          const icon = cardIcons[i % cardIcons.length];
          const colorClass = i % 3 === 0 ? 'var(--indigo-dim)' : i % 3 === 1 ? 'var(--teal-dim)' : 'var(--amber-dim)';
          const progress = p.status === 'approved' ? 100 : p.status === 'review' ? 75 : 40;
          const barColor = p.status === 'approved' ? 'var(--green)' : p.status === 'review' ? 'var(--indigo)' : 'var(--teal)';
          return (
            <div
              key={p.id}
              className="flex cursor-pointer flex-col gap-3 rounded-xl border p-[18px_20px] transition-all hover:-translate-y-px hover:border-[rgba(91,126,248,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
              onClick={() => navigate(`/prd/${p.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] text-base" style={{ background: colorClass }}>
                  {icon}
                </div>
                <div className="flex-1">
                  <div className="font-heading text-[14.5px] font-semibold leading-snug text-[var(--text-primary)]">{p.title}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: sc.bg, color: sc.text }}>
                      <span style={{ fontSize: 7 }}>●</span> {sc.label}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      🕐 {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="h-[3px] overflow-hidden rounded-sm" style={{ background: 'var(--bg-active)' }}>
                <div className="h-full rounded-sm transition-all duration-500" style={{ width: `${progress}%`, background: barColor }} />
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded border bg-[rgba(74,158,255,0.1)] px-2 py-0.5 text-[11px] font-semibold text-[#4A9EFF]" style={{ borderColor: 'rgba(74,158,255,0.2)', fontFamily: "'DM Sans', monospace" }}>
                  PROJ-{100 + i}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">Standard Feature PRD</span>
                <div className="ml-auto flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="rounded-md border bg-[var(--bg-active)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                    style={{ borderColor: 'var(--border)' }}
                    onClick={() => handleExportCard(p.id)}
                  >
                    Export
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-[var(--indigo)] transition-colors hover:bg-[rgba(91,126,248,0.25)]"
                    style={{ background: 'var(--indigo-dim)' }}
                    onClick={() => navigate(`/prd/${p.id}`)}
                  >
                    Open →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && !err && (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="text-5xl opacity-70">📝</div>
          <div className="font-heading text-xl font-bold text-[var(--text-primary)]">No PRDs yet</div>
          <p className="max-w-xs text-sm text-[var(--text-muted)]">Create your first PRD using the "New PRD" button or generate one with AI.</p>
          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--indigo)', boxShadow: '0 2px 8px rgba(91,126,248,0.35)' }}
              onClick={() => void handleNewPrd()}
              disabled={creating}
            >
              {creating ? 'Creating…' : 'Create Blank PRD'}
            </button>
            <button
              type="button"
              className="rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--indigo)' }}
              onClick={() => setShowGenModal(true)}
            >
              ✨ Generate with AI
            </button>
          </div>
        </div>
      )}

      <GeneratePrdModal
        open={showGenModal}
        onClose={() => setShowGenModal(false)}
        onGenerate={handleGenerate}
        generating={generating}
      />
    </div>
  );
}

function StatCard({ color, label, value, unit, sub }: { color: string; label: string; value: string | number; unit?: string; sub: string }) {
  return (
    <div
      className="relative cursor-default overflow-hidden rounded-xl border p-[18px_20px] transition-all hover:-translate-y-px hover:border-[var(--border-light)]"
      style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
    >
      <div className="absolute left-0 right-0 top-0 h-0.5" style={{ background: color }} />
      <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className="font-heading text-[28px] font-bold leading-none tracking-tight text-[var(--text-primary)]">
        {value}
        {unit && <span className="text-base font-medium text-[var(--text-muted)]">{unit}</span>}
      </div>
      <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">{sub}</div>
    </div>
  );
}
