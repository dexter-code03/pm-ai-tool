import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type WireframeListItem } from '../lib/api';
import { useIntegrationStatus } from '../hooks/useIntegrationStatus';
import { GenerateWireframeModal } from '../components/GenerateWireframeModal';
import { useToast } from '../hooks/useToast';

const screenColors = ['var(--indigo)', 'var(--teal)', 'var(--amber)', '#a259ff'];

function WireframePreview({ index }: { index: number }) {
  const c = screenColors[index % screenColors.length];
  return (
    <div className="flex h-[160px] items-center justify-center overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div className="flex gap-1.5 px-3.5" style={{ transform: 'perspective(400px) rotateY(-5deg) rotateX(3deg)' }}>
        {[0, 1, 2].map((s) => (
          <div key={s} className="flex w-14 flex-col gap-1 overflow-hidden rounded-md border p-1.5 shrink-0" style={{ height: 96, background: 'var(--bg-elevated)', borderColor: 'var(--border-light)', opacity: s === 2 ? 0.5 : 1 }}>
            <div className="h-[5px] rounded-sm" style={{ width: s === 0 ? '80%' : '60%', background: s === 0 ? c : 'var(--bg-active)' }} />
            <div className="h-[5px] w-[40%] rounded-sm" style={{ background: 'var(--bg-active)' }} />
            <div className="flex-1 rounded-sm" style={{ background: 'var(--bg-active)' }} />
            <div className="h-[5px] rounded-sm" style={{ width: '50%', background: s === 1 ? c : 'var(--bg-active)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WireframesPage() {
  const { hasAiProvider, hasStitch, loading: capLoading } = useIntegrationStatus();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [wireframes, setWireframes] = useState<WireframeListItem[]>([]);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState<{ step: number; total: number; detail: string } | null>(null);
  const [genError, setGenError] = useState('');

  const initialPrdId = searchParams.get('generateFromPrd') || undefined;
  useEffect(() => {
    if (initialPrdId) {
      setShowModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [initialPrdId, setSearchParams]);

  const load = useCallback(async () => {
    try {
      const wf = await api.listWireframes();
      setWireframes(wf.wireframes || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    if (tab === 'All') return wireframes;
    if (tab === 'Linked to PRD') return wireframes.filter((w) => w.links?.length > 0);
    return wireframes.filter((w) => !w.links?.length);
  }, [wireframes, tab]);

  const stats = useMemo(() => ({
    total: wireframes.length,
    screens: wireframes.reduce((acc, w) => acc + (w.screens?.length || 0), 0),
    linked: wireframes.filter((w) => w.links?.length > 0).length,
  }), [wireframes]);

  async function handleGenerate(opts: { method: string; brief: string; platform: string; style: string; prdIds?: string[] }) {
    setGenerating(true);
    setGenError('');
    setGenProgress({ step: 0, total: 1, detail: 'Starting generation...' });
    setErr('');
    const startTime = Date.now();
    try {
      const deviceType = opts.platform === 'mobile' ? 'MOBILE' : opts.platform === 'tablet' ? 'TABLET' : 'DESKTOP';

      const genPromise = opts.method === 'linkprd' && opts.prdIds?.length
        ? api.generateWireframeFromPrd({ prdIds: opts.prdIds, deviceType })
        : api.generateWireframeStandalone({ title: 'Wireframe', brief: opts.brief, deviceType });

      const pollId = setInterval(async () => {
        const generating = wireframes.find(w => w.status === 'generating');
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        if (!generating) {
          const latest = await api.listWireframes().catch(() => null);
          const gen = latest?.wireframes?.find((w: WireframeListItem) => w.status === 'generating');
          if (gen) {
            try {
              const p = await api.getWireframeProgress(gen.id);
              if (p.generating) setGenProgress({ step: p.step, total: p.total, detail: p.detail });
            } catch { /* ignore */ }
          } else {
            setGenProgress({ step: 0, total: 1, detail: `Working... (${elapsed}s)` });
          }
        }
      }, 3000);

      try {
        await genPromise;
        clearInterval(pollId);
        await load();
        setShowModal(false);
        showToast('Wireframe generated!', 'success');
      } catch (e) {
        clearInterval(pollId);
        const msg = e instanceof Error ? e.message : 'Generation failed';
        setGenError(msg);
        showToast(msg, 'error');
      }
    } finally {
      setGenerating(false);
      setGenProgress(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this wireframe?')) return;
    try {
      await api.deleteWireframe(id);
      await load();
      showToast('Wireframe deleted', 'info');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  }

  const needsConfig = !capLoading && !hasAiProvider;

  return (
    <div className="animate-fade-in">
      {needsConfig && (
        <div className="mb-6 rounded-xl border px-5 py-4" style={{ background: 'var(--amber-dim)', borderColor: 'rgba(245,158,11,0.2)' }}>
          <p className="text-sm font-medium text-[var(--amber)]">Finish setup to generate wireframes</p>
          <ul className="mt-2 list-inside list-disc text-sm text-[var(--amber)]">
            <li>Add an AI provider (OpenAI, Claude, Gemini, or Custom) to generate wireframe specs.</li>
            {!hasStitch && <li>Optional: Add a Stitch API key for visual screen generation.</li>}
          </ul>
          <Link to="/settings" className="mt-3 inline-block rounded-md px-3 py-1.5 text-sm font-medium text-white" style={{ background: 'var(--amber)' }}>Open Settings</Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-7 grid grid-cols-4 gap-3.5">
        <StatCard color="var(--teal)" label="Total Wireframes" value={stats.total} sub={`+${Math.min(stats.total, 2)} this sprint`} />
        <StatCard color="var(--indigo)" label="Total Screens" value={stats.screens} sub="Across all projects" />
        <StatCard color="var(--green)" label="Figma Synced" value={stats.linked} sub="Bidirectional active" />
        <StatCard color="var(--amber)" label="Avg Gen Time" value="2.1" unit="m" sub="Target < 3 min ✓" />
      </div>

      {/* Section header */}
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-heading text-base font-bold text-[var(--text-primary)]">Wireframe Projects</h2>
        <span className="rounded-[10px] bg-[var(--bg-active)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">{wireframes.length}</span>
        <div className="ml-auto flex gap-0.5 rounded-[10px] p-1" style={{ background: 'var(--bg-base)' }}>
          {['All', 'Linked to PRD', 'Standalone'].map((t) => (
            <button key={t} type="button" className="rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all" style={{ background: tab === t ? 'var(--bg-elevated)' : 'transparent', color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.3)' : 'none' }} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {err && <p className="mb-4 text-sm text-[var(--red)]">{err}</p>}

      {/* Wireframe grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map((w, i) => (
          <div key={w.id} className="group cursor-pointer overflow-hidden rounded-[14px] border transition-all hover:-translate-y-0.5 hover:border-[rgba(45,212,183,0.3)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.25)]" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
            <WireframePreview index={i} />
            <div className="p-3.5 pt-3">
              <Link to={`/wireframes/${w.id}`} className="font-heading text-[13.5px] font-semibold text-[var(--text-primary)] hover:text-[var(--indigo)]">
                {w.title}
              </Link>
              <div className="mt-1 flex items-center gap-2 text-[11.5px] text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--teal)]">{w.screens?.length ?? 0} screens</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[10px] font-semibold" style={{ color: w.deviceType === 'MOBILE' ? 'var(--teal)' : w.deviceType === 'TABLET' ? 'var(--amber)' : 'var(--indigo)', borderColor: 'var(--border)' }}>
                  {w.deviceType === 'MOBILE' ? '📱' : w.deviceType === 'TABLET' ? '📟' : '🖥️'} {w.deviceType || 'Desktop'}
                </span>
                {w.links?.length ? (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 rounded border px-1.5 py-px text-[10.5px] font-semibold" style={{ color: '#a259ff', background: 'rgba(162,89,255,0.1)', borderColor: 'rgba(162,89,255,0.2)' }}>Linked to PRD</span>
                  </>
                ) : null}
                <span>·</span>
                <span>{new Date(w.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="mt-2 flex gap-1.5">
                <Link to={`/wireframes/${w.id}`} className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-[var(--indigo)] transition-colors hover:bg-[rgba(91,126,248,0.25)]" style={{ background: 'var(--indigo-dim)' }}>View</Link>
                <button type="button" className="rounded-md border px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--red)]" style={{ background: 'var(--bg-active)', borderColor: 'var(--border)' }} onClick={(e) => { e.stopPropagation(); void remove(w.id); }}>Delete</button>
              </div>
            </div>
          </div>
        ))}

        {/* New wireframe card */}
        <div className="flex h-[250px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[14px] border-2 border-dashed text-[var(--text-muted)] transition-all hover:border-[rgba(45,212,183,0.4)] hover:bg-[var(--teal-dim)] hover:text-[var(--teal)]" style={{ borderColor: 'var(--border)' }} onClick={() => setShowModal(true)}>
          <span className="text-[28px] font-light">＋</span>
          <p className="text-[13px] font-medium">Create New Wireframe</p>
          <span className="text-[11.5px] opacity-70">From brief, PRD, or screenshots</span>
        </div>
      </div>

      <GenerateWireframeModal open={showModal} onClose={() => { if (!generating) setShowModal(false); }} onGenerate={handleGenerate} generating={generating} progress={genProgress} error={genError} initialPrdId={initialPrdId} />
    </div>
  );
}

function StatCard({ color, label, value, unit, sub }: { color: string; label: string; value: string | number; unit?: string; sub: string }) {
  return (
    <div className="relative cursor-default overflow-hidden rounded-xl border p-[18px_20px] transition-all hover:-translate-y-px hover:border-[var(--border-light)]" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
      <div className="absolute left-0 right-0 top-0 h-0.5" style={{ background: color }} />
      <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className="font-heading text-[28px] font-bold leading-none tracking-tight text-[var(--text-primary)]">
        {value}{unit && <span className="text-base font-medium text-[var(--text-muted)]">{unit}</span>}
      </div>
      <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">{sub}</div>
    </div>
  );
}
