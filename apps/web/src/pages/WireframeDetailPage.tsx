import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type WireframeListItem } from '../lib/api';
import { useToast } from '../hooks/useToast';

const TLDrawViewer = lazy(() => import('../components/TLDrawViewer').then(m => ({ default: m.TLDrawViewer })));

type ScreenMeta = {
  elements: string[];
  flow: string | null;
  screenType?: string;
  device?: string;
  dimensions?: { w: number; h: number; label: string };
  hasStitchVisual?: boolean;
};

type FlowGraph = {
  nodes: number[];
  edges: { from: number; to: number; label: string }[];
};

type PrototypeSpec = {
  initScreenId?: string;
  screenIds?: string[];
  links?: Record<string, { links?: { targetScreenId: string; xpath?: string; transition?: string }[] }>;
};

function parseScreenMeta(htmlUrl: string | null | undefined): ScreenMeta {
  if (!htmlUrl) return { elements: [], flow: null };
  try {
    const parsed = JSON.parse(htmlUrl);
    return {
      elements: Array.isArray(parsed.elements) ? parsed.elements : [],
      flow: parsed.flow || null,
      screenType: parsed.screenType || null,
      device: parsed.device || null,
      dimensions: parsed.dimensions || null,
      hasStitchVisual: !!parsed.hasStitchVisual,
    };
  } catch {
    return { elements: [], flow: null };
  }
}

function parseFlowGraph(raw: string | null | undefined): FlowGraph | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.edges)) return parsed;
    return null;
  } catch {
    return null;
  }
}

function parsePrototype(raw: string | null | undefined): PrototypeSpec | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const SCREEN_TYPE_ICONS: Record<string, string> = {
  splash: '\uD83D\uDE80', onboarding: '\uD83D\uDC4B', auth: '\uD83D\uDD10', dashboard: '\uD83D\uDCCA',
  list: '\uD83D\uDCCB', detail: '\uD83D\uDCC4', form: '\u270F\uFE0F', settings: '\u2699\uFE0F',
  profile: '\uD83D\uDC64', modal: '\uD83D\uDCAC', search: '\uD83D\uDD0D', empty: '\uD83D\uDCED',
};

const DEVICE_BADGES: Record<string, { icon: string; label: string; color: string }> = {
  MOBILE: { icon: '\uD83D\uDCF1', label: 'Mobile', color: 'var(--teal)' },
  TABLET: { icon: '\uD83D\uDCDF', label: 'Tablet', color: 'var(--amber)' },
  DESKTOP: { icon: '\uD83D\uDDA5\uFE0F', label: 'Desktop', color: 'var(--indigo)' },
};

function dagLayout(screenCount: number, flowGraph: FlowGraph | null) {
  const forwardEdges = (flowGraph?.edges || []).filter(e =>
    e.from >= 0 && e.from < screenCount &&
    e.to >= 0 && e.to < screenCount &&
    e.to > e.from
  );
  if (forwardEdges.length === 0) {
    return Array.from({ length: screenCount }, (_, i) => ({ col: i, row: 0 }));
  }

  const adj = new Map<number, number[]>();
  const inDeg = new Map<number, number>();
  for (let i = 0; i < screenCount; i++) {
    adj.set(i, []);
    inDeg.set(i, 0);
  }
  for (const e of forwardEdges) {
    adj.get(e.from)?.push(e.to);
    inDeg.set(e.to, (inDeg.get(e.to) || 0) + 1);
  }

  const layers: number[][] = [];
  const assigned = new Set<number>();
  let queue = [...inDeg.entries()].filter(([, d]) => d === 0).map(([n]) => n);
  if (queue.length === 0) queue = [0];

  while (queue.length > 0) {
    const layer: number[] = [];
    const next: number[] = [];
    for (const n of queue) {
      if (assigned.has(n)) continue;
      assigned.add(n);
      layer.push(n);
      for (const child of adj.get(n) || []) {
        if (!assigned.has(child)) next.push(child);
      }
    }
    if (layer.length > 0) layers.push(layer);
    queue = [...new Set(next)];
  }

  for (let i = 0; i < screenCount; i++) {
    if (!assigned.has(i)) {
      layers.push([i]);
      assigned.add(i);
    }
  }

  const positions: { col: number; row: number }[] = new Array(screenCount);
  for (let col = 0; col < layers.length; col++) {
    const layer = layers[col];
    const startRow = -(layer.length - 1) / 2;
    for (let r = 0; r < layer.length; r++) {
      positions[layer[r]] = { col, row: startRow + r };
    }
  }

  return positions;
}

export function WireframeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [wf, setWf] = useState<WireframeListItem | null>(null);
  const [err, setErr] = useState('');
  const [editScreenId, setEditScreenId] = useState('');
  const [instruction, setInstruction] = useState('');
  const [editing, setEditing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'screens' | 'flow' | 'canvas' | 'json' | 'stitch' | 'versions'>('screens');
  const [jsonSpec, setJsonSpec] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await api.getWireframe(id);
        setWf(data.wireframe);
        setJsonSpec(JSON.stringify(data.wireframe, null, 2));
        const first = data.wireframe.screens?.[0];
        if (first) setEditScreenId(first.id);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load');
      }
    })();
  }, [id]);

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !editScreenId || !instruction.trim()) return;
    setEditing(true);
    setErr('');
    try {
      await api.editWireframeScreen(id, { screenId: editScreenId, instruction: instruction.trim() });
      setInstruction('');
      const data = await api.getWireframe(id);
      setWf(data.wireframe);
      setJsonSpec(JSON.stringify(data.wireframe, null, 2));
      showToast('Screen updated successfully', 'success');
    } catch (e2) {
      showToast(e2 instanceof Error ? e2.message : 'Edit failed', 'error');
    } finally {
      setEditing(false);
    }
  }

  async function handleStitchSync() {
    if (!id) return;
    setSyncing(true);
    try {
      const data = await api.syncStitchScreens(id);
      setWf(data.wireframe);
      setJsonSpec(JSON.stringify(data.wireframe, null, 2));
      showToast('Synced from Stitch successfully', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  }

  if (err && !wf) {
    return (
      <div className="animate-fade-in">
        <Link to="/wireframes" className="text-sm text-[var(--indigo)] hover:underline">&larr; Wireframes</Link>
        <p className="mt-4 text-[var(--red)]">{err}</p>
      </div>
    );
  }

  if (!wf) {
    return (
      <div className="animate-fade-in text-[var(--text-muted)]">
        <Link to="/wireframes" className="text-[var(--indigo)] hover:underline">&larr; Wireframes</Link>
        <p className="mt-4">Loading...</p>
      </div>
    );
  }

  const hasStitch = !!wf.stitchProjectId;
  const stitchUrl = hasStitch ? `https://stitch.withgoogle.com/projects/${wf.stitchProjectId}` : null;
  const deviceBadge = DEVICE_BADGES[wf.deviceType] || DEVICE_BADGES.DESKTOP;
  const screens = wf.screens || [];
  const screenMetas = screens.map(s => parseScreenMeta(s.htmlUrl));
  const flowGraph = parseFlowGraph(wf.flowGraph);
  const hasFigmaExport = screens.some(s => s.figmaExportUrl);

  const allPrototypes: PrototypeSpec[] = screens
    .map(s => parsePrototype(s.prototypeData))
    .filter((p): p is PrototypeSpec => p !== null);
  const mergedPrototype = allPrototypes.length > 0 ? allPrototypes[0] : null;

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <Link to="/wireframes" className="text-sm text-[var(--indigo)] hover:underline">&larr; Wireframes</Link>
      </div>
      <div className="mb-2 flex items-center gap-3">
        <h1 className="font-heading text-2xl font-bold text-[var(--text-primary)]">{wf.title}</h1>
        <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'var(--teal-dim)', color: 'var(--teal)' }}>{wf.status}</span>
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold" style={{ borderColor: `color-mix(in srgb, ${deviceBadge.color} 30%, transparent)`, color: deviceBadge.color, background: `color-mix(in srgb, ${deviceBadge.color} 10%, transparent)` }}>
          {deviceBadge.icon} {deviceBadge.label}
        </span>
        <span className="text-[var(--border-light)]">&middot;</span>
        <span className="font-semibold text-[var(--indigo)]">{screens.length} screens</span>
        {flowGraph && flowGraph.edges.length > 0 && (
          <>
            <span className="text-[var(--border-light)]">&middot;</span>
            <span className="text-[var(--teal)]">{flowGraph.edges.length} flow edges</span>
          </>
        )}
        {hasStitch && (
          <>
            <span className="text-[var(--border-light)]">&middot;</span>
            {stitchUrl && (
              <a href={stitchUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[12px] font-semibold text-[var(--teal)] transition-colors hover:bg-[var(--teal-dim)]" style={{ borderColor: 'rgba(45,212,183,0.25)' }}>
                Open in Stitch
              </a>
            )}
            <button
              type="button"
              disabled={syncing}
              onClick={() => void handleStitchSync()}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors hover:bg-[var(--bg-active)] disabled:opacity-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
          </>
        )}
      </div>

      {err && <p className="mb-4 text-sm text-[var(--red)]">{err}</p>}

      {/* Tab bar */}
      <div className="mb-5 flex gap-1 rounded-lg p-1" style={{ background: 'var(--bg-base)' }}>
        {(['screens', 'flow', 'canvas', 'json', 'stitch', 'versions'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className="flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all"
            style={{
              background: activeTab === tab ? 'var(--bg-elevated)' : 'transparent',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'screens' ? 'Screens' : tab === 'flow' ? 'Flow' : tab === 'canvas' ? 'Canvas' : tab === 'json' ? 'JSON' : tab === 'stitch' ? 'Stitch & Figma' : 'Versions'}
          </button>
        ))}
      </div>

      {/* Screens tab */}
      {activeTab === 'screens' && (
        <>
          <section className="mb-8">
            <h2 className="mb-4 font-heading text-base font-bold text-[var(--text-primary)]">Screens</h2>
            <div className={`grid gap-4 ${wf.deviceType === 'MOBILE' ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {screens.map((s, idx) => {
                const meta = screenMetas[idx];
                const typeIcon = SCREEN_TYPE_ICONS[meta.screenType || ''] || '\uD83D\uDCC4';
                const isMobile = wf.deviceType === 'MOBILE';

                return (
                  <div key={s.id} className="overflow-hidden rounded-xl border transition-all hover:border-[var(--border-light)]" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                    <div className="relative flex items-center justify-center" style={{ background: 'var(--bg-base)', height: isMobile ? 220 : 160 }}>
                      {s.screenshotUrl ? (
                        <img src={s.screenshotUrl} alt={s.title || ''} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full flex-col" style={{ padding: isMobile ? '8px 12px' : '8px 16px' }}>
                          {isMobile && (
                            <div className="mb-1 flex items-center justify-between px-1 text-[8px] text-[var(--text-muted)]" style={{ opacity: 0.5 }}>
                              <span>9:41</span>
                              <div className="h-[3px] w-[28px] rounded-full" style={{ background: 'var(--text-muted)' }} />
                              <span>100%</span>
                            </div>
                          )}
                          <div className="flex flex-1 flex-col gap-1">
                            {(meta.elements || []).slice(0, isMobile ? 5 : 4).map((el, i) => (
                              <div key={i} className="flex items-center gap-1.5 rounded px-1.5 py-0.5" style={{ background: i === 0 ? 'color-mix(in srgb, var(--indigo) 15%, transparent)' : 'var(--bg-active)' }}>
                                <div className="h-[6px] w-[6px] shrink-0 rounded-sm" style={{ background: i === 0 ? 'var(--indigo)' : 'var(--text-muted)', opacity: 0.6 }} />
                                <span className="truncate text-[8px] text-[var(--text-muted)]">{el}</span>
                              </div>
                            ))}
                          </div>
                          {isMobile && (
                            <div className="mx-auto mt-1 h-[3px] w-[32px] rounded-full" style={{ background: 'var(--text-muted)', opacity: 0.3 }} />
                          )}
                        </div>
                      )}
                      <div className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: 'var(--indigo)' }}>
                        {idx + 1}
                      </div>
                      {meta.screenType && (
                        <div className="absolute right-2 top-2 rounded-full px-1.5 py-px text-[9px]" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                          {typeIcon} {meta.screenType}
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="text-[13px] font-semibold text-[var(--text-primary)]">{s.title || `Screen ${s.order + 1}`}</div>
                      {s.prompt && <p className="mt-1 line-clamp-2 text-[11.5px] text-[var(--text-muted)]">{s.prompt}</p>}
                      {meta.elements.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {meta.elements.slice(0, 4).map((el, i) => (
                            <span key={i} className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: 'var(--indigo-dim)', color: 'var(--indigo)' }}>{el}</span>
                          ))}
                          {meta.elements.length > 4 && (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: 'var(--bg-active)', color: 'var(--text-muted)' }}>+{meta.elements.length - 4}</span>
                          )}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {s.screenshotUrl && (
                          <a className="text-[11px] font-medium text-[var(--indigo)] hover:underline" href={s.screenshotUrl} target="_blank" rel="noreferrer">Screenshot</a>
                        )}
                        {s.figmaExportUrl && (
                          <a className="text-[11px] font-medium text-[var(--teal)] hover:underline" href={s.figmaExportUrl} target="_blank" rel="noreferrer">Figma File</a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {screens.length > 0 && (
            <section className="rounded-xl border p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
              <h2 className="mb-4 font-heading text-base font-bold text-[var(--text-primary)]">AI Edit Screen</h2>
              <form onSubmit={submitEdit} className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Screen</label>
                  <select className="w-full rounded-[9px] border px-3 py-2 text-sm outline-none" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} value={editScreenId} onChange={(e) => setEditScreenId(e.target.value)}>
                    {screens.map((s) => <option key={s.id} value={s.id}>{s.title || s.id.slice(0, 8)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Edit Instruction</label>
                  <textarea className="w-full resize-none rounded-[9px] border px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all focus:border-[var(--indigo)] focus:shadow-[0_0_0_3px_var(--indigo-dim)]" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }} rows={3} value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Describe the change you want..." />
                </div>
                <button type="submit" disabled={editing} className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:-translate-y-px disabled:opacity-50" style={{ background: 'var(--indigo)', boxShadow: '0 2px 8px rgba(91,126,248,0.35)' }}>
                  {editing ? 'Applying...' : 'Apply Changes'}
                </button>
              </form>
            </section>
          )}
        </>
      )}

      {/* Flow tab (DAG) */}
      {activeTab === 'flow' && (
        <section className="rounded-xl border p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <h2 className="mb-4 font-heading text-base font-bold text-[var(--text-primary)]">User Flow Graph</h2>
          <p className="mb-5 text-[12px] text-[var(--text-muted)]">
            {deviceBadge.icon} {deviceBadge.label} flow &middot; {screens.length} screens &middot; {flowGraph?.edges.filter(e => e.to > e.from).length ?? 0} connections
          </p>
          <FlowDag screens={screens} flowGraph={flowGraph} deviceType={wf.deviceType} />
        </section>
      )}

      {/* Canvas (TLDraw) tab */}
      {activeTab === 'canvas' && (
        <section>
          <Suspense fallback={<div className="flex h-[560px] items-center justify-center rounded-lg border text-[var(--text-muted)]" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>Loading canvas...</div>}>
            <TLDrawViewer screens={screens} deviceType={wf.deviceType} flowGraph={flowGraph} />
          </Suspense>
          <p className="mt-3 text-center text-[11.5px] text-[var(--text-muted)]">Interactive canvas -- drag, zoom, and annotate wireframe screens</p>
        </section>
      )}

      {/* Spec JSON tab */}
      {activeTab === 'json' && (
        <section className="rounded-xl border p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-[var(--text-primary)]">Wireframe Spec JSON</h2>
            <div className="flex gap-2">
              <button type="button" className="rounded-md border px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]" style={{ borderColor: 'var(--border)', background: 'var(--bg-active)' }} onClick={() => { navigator.clipboard.writeText(jsonSpec); showToast('Copied', 'success'); }}>Copy</button>
              <button type="button" className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-white" style={{ background: 'var(--indigo)' }} onClick={() => { try { JSON.parse(jsonSpec); showToast('Valid JSON', 'info'); } catch { showToast('Invalid JSON', 'error'); } }}>Validate</button>
            </div>
          </div>
          <textarea className="w-full resize-y rounded-lg border p-4 font-mono text-[12px] leading-relaxed text-[var(--text-secondary)] outline-none transition-all focus:border-[var(--indigo)]" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', minHeight: 300 }} value={jsonSpec} onChange={(e) => setJsonSpec(e.target.value)} spellCheck={false} />
        </section>
      )}

      {/* Stitch & Figma tab */}
      {activeTab === 'stitch' && (
        <section className="rounded-xl border p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <h2 className="mb-4 font-heading text-base font-bold text-[var(--text-primary)]">Stitch & Figma Integration</h2>

          {hasStitch ? (
            <div className="space-y-4">
              {/* Stitch Project */}
              <div className="flex items-center gap-3 rounded-lg border p-4" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
                <span className="text-2xl">🎨</span>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-[var(--text-primary)]">Stitch Project</div>
                  <div className="mt-0.5 text-[11.5px] text-[var(--text-muted)]">Open this wireframe project in Google Stitch for advanced editing, prototyping, and Figma export.</div>
                </div>
                {stitchUrl && (
                  <a href={stitchUrl} target="_blank" rel="noreferrer" className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:-translate-y-px" style={{ background: 'var(--teal)', boxShadow: '0 2px 8px rgba(45,212,183,0.35)' }}>
                    Open in Stitch
                  </a>
                )}
              </div>

              {/* Figma Export */}
              <div className="rounded-lg border p-4" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📤</span>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-[var(--text-primary)]">Export to Figma</div>
                    <div className="mt-0.5 text-[11.5px] text-[var(--text-muted)]">Export your Stitch screens directly into Figma for further design work.</div>
                  </div>
                  {stitchUrl && (
                    <a href={stitchUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:-translate-y-px" style={{ borderColor: 'var(--border-light)', color: 'var(--indigo)', background: 'var(--indigo-dim)' }}>
                      Open Stitch to Export
                    </a>
                  )}
                </div>
                <div className="mt-3 rounded-md p-3 text-[11.5px] text-[var(--text-muted)] leading-relaxed" style={{ background: 'var(--bg-active)' }}>
                  <strong className="text-[var(--text-secondary)]">How to export to Figma:</strong>
                  <ol className="mt-1.5 list-inside list-decimal space-y-1">
                    <li>Click "Open Stitch to Export" above to open the project</li>
                    <li>In Stitch, click the <strong className="text-[var(--text-secondary)]">Export</strong> button (top right)</li>
                    <li>Select <strong className="text-[var(--text-secondary)]">Copy to Figma</strong></li>
                    <li>Paste directly into your Figma canvas (Ctrl/Cmd + V)</li>
                  </ol>
                </div>
                {hasFigmaExport && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {screens.filter(s => s.figmaExportUrl).map(s => (
                      <a key={s.id} href={s.figmaExportUrl!} target="_blank" rel="noreferrer" className="rounded-md border px-3 py-1.5 text-[11px] font-semibold transition-colors hover:bg-[var(--indigo-dim)]" style={{ borderColor: 'var(--border)', color: 'var(--indigo)' }}>
                        Download {s.title || 'Screen'} .fig
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Sync */}
              <div className="flex items-center gap-3 rounded-lg border p-4" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
                <span className="text-2xl">🔄</span>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-[var(--text-primary)]">Sync from Stitch</div>
                  <div className="mt-0.5 text-[11.5px] text-[var(--text-muted)]">Pull latest screenshots and changes from Stitch. Any edits in Stitch will be reflected here after sync.</div>
                </div>
                <button
                  type="button"
                  disabled={syncing}
                  onClick={() => void handleStitchSync()}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:-translate-y-px disabled:opacity-50"
                  style={{ background: 'var(--indigo)', boxShadow: '0 2px 8px rgba(91,126,248,0.35)' }}
                >
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>

              {/* Prototype Info */}
              {mergedPrototype && (
                <div className="rounded-lg border p-4" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-2xl">🔗</span>
                    <div>
                      <div className="text-[13px] font-semibold text-[var(--text-primary)]">Stitch Prototype</div>
                      <div className="text-[11px] text-[var(--text-muted)]">Interactive prototype extracted from Stitch</div>
                    </div>
                  </div>
                  <PrototypeDisplay spec={mergedPrototype} screens={screens} />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border py-16" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
              <span className="text-4xl opacity-60">🔗</span>
              <div className="text-center">
                <div className="font-heading text-base font-bold text-[var(--text-primary)]">No Stitch project linked</div>
                <p className="mt-1 max-w-xs text-sm text-[var(--text-muted)]">Add a Stitch API key in Settings and regenerate wireframes. Stitch generates visual screens with HTML/screenshots and enables Figma export.</p>
              </div>
              <Link to="/settings" className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--indigo)' }}>Configure Stitch</Link>
            </div>
          )}
        </section>
      )}

      {/* Version history tab */}
      {activeTab === 'versions' && (
        <section className="rounded-xl border p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
          <h2 className="mb-4 font-heading text-base font-bold text-[var(--text-primary)]">Version History</h2>
          <div className="relative">
            <div className="absolute left-[7px] top-3 bottom-3 w-px" style={{ background: 'var(--border)' }} />
            {[
              { label: 'Current', time: new Date(wf.updatedAt).toLocaleString(), desc: `${screens.length} screens \u00b7 ${wf.deviceType}`, current: true },
              { label: 'v1.0 \u2014 Initial generation', time: 'Auto-saved', desc: 'Generated from brief', current: false },
            ].map((v, i) => (
              <div key={i} className="relative flex items-start gap-3 pb-5">
                <div className="relative z-10 mt-1 flex h-[14px] w-[14px] shrink-0 items-center justify-center">
                  <span className={`h-2.5 w-2.5 rounded-full ${v.current ? 'bg-[var(--green)] shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-[var(--bg-active)]'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[var(--text-primary)]">{v.label}</span>
                    {v.current && <span className="rounded bg-[var(--green-dim)] px-1.5 py-px text-[9px] font-bold text-[var(--green)]">CURRENT</span>}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{v.time}</div>
                  <div className="mt-0.5 text-[11.5px] text-[var(--text-secondary)]">{v.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FlowDag({ screens, flowGraph, deviceType }: {
  screens: WireframeListItem['screens'];
  flowGraph: FlowGraph | null;
  deviceType: string;
}) {
  const positions = dagLayout(screens.length, flowGraph);
  const isMobile = deviceType === 'MOBILE';
  const nodeW = isMobile ? 150 : 180;
  const nodeH = isMobile ? 190 : 140;
  const colGap = nodeW + 80;
  const rowGap = nodeH + 60;

  const minRow = Math.min(...positions.map(p => p.row));
  const maxRow = Math.max(...positions.map(p => p.row));
  const maxCol = Math.max(...positions.map(p => p.col));
  const rowOffset = -minRow;
  const totalH = (maxRow - minRow + 1) * rowGap + 40;
  const totalW = (maxCol + 1) * colGap + 40;

  function nodePos(idx: number) {
    const p = positions[idx];
    return {
      x: 20 + p.col * colGap,
      y: 20 + (p.row + rowOffset) * rowGap,
    };
  }

  const edges = (flowGraph?.edges || []).filter(e =>
    e.from >= 0 && e.from < screens.length &&
    e.to >= 0 && e.to < screens.length &&
    e.to > e.from
  );

  return (
    <div className="overflow-auto rounded-lg border" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
      <svg width={totalW} height={totalH} className="block">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--indigo)" opacity="0.7" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((e, i) => {
          const from = nodePos(e.from);
          const to = nodePos(e.to);
          const x1 = from.x + nodeW;
          const y1 = from.y + nodeH / 2;
          const x2 = to.x;
          const y2 = to.y + nodeH / 2;
          const midX = (x1 + x2) / 2;

          return (
            <g key={i}>
              <path
                d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke="var(--indigo)"
                strokeWidth="2"
                opacity="0.5"
                markerEnd="url(#arrowhead)"
              />
              {e.label && (
                <text
                  x={midX}
                  y={Math.min(y1, y2) - 6}
                  textAnchor="middle"
                  fill="var(--text-muted)"
                  fontSize="10"
                  fontWeight="600"
                >
                  {e.label.length > 20 ? e.label.slice(0, 20) + '...' : e.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {screens.map((s, idx) => {
          const pos = nodePos(idx);
          return (
            <foreignObject key={s.id} x={pos.x} y={pos.y} width={nodeW} height={nodeH}>
              <div className="h-full overflow-hidden rounded-lg border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                <div className="relative" style={{ height: isMobile ? 110 : 70, background: 'var(--bg-active)' }}>
                  {s.screenshotUrl ? (
                    <img src={s.screenshotUrl} alt={s.title || ''} className="h-full w-full object-cover object-top" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[9px] text-[var(--text-muted)]">
                      Wireframe
                    </div>
                  )}
                  <div className="absolute left-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white" style={{ background: 'var(--indigo)' }}>
                    {idx + 1}
                  </div>
                </div>
                <div className="p-2">
                  <div className="truncate text-[11px] font-semibold text-[var(--text-primary)] leading-tight">{s.title || `Screen ${idx + 1}`}</div>
                  {s.screenshotUrl && (
                    <div className="mt-0.5 text-[8px] font-medium text-[var(--green)]">Stitch visual</div>
                  )}
                </div>
              </div>
            </foreignObject>
          );
        })}
      </svg>
    </div>
  );
}

function PrototypeDisplay({ spec, screens }: { spec: PrototypeSpec; screens: WireframeListItem['screens'] }) {
  function screenTitle(screenId: string) {
    const match = screens.find(s => {
      const sid = s.htmlUrl?.includes(screenId) || s.id === screenId;
      return sid;
    });
    return match?.title || screenId.slice(0, 12);
  }

  const TRANSITIONS: Record<string, string> = {
    NONE: 'Instant', PUSH: 'Push Right', PUSH_BACK: 'Push Back', SLIDE_UP: 'Slide Up',
    TRANSITION_TYPE_UNSPECIFIED: 'Default',
  };

  const linkEntries = Object.entries(spec.links || {});
  const totalLinks = linkEntries.reduce((acc, [, v]) => acc + (v.links?.length || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-[12px]">
        {spec.initScreenId && (
          <span className="text-[var(--text-muted)]">Initial: <strong className="text-[var(--text-primary)]">{screenTitle(spec.initScreenId)}</strong></span>
        )}
        <span className="text-[var(--text-muted)]">{spec.screenIds?.length || 0} screens</span>
        <span className="text-[var(--text-muted)]">{totalLinks} links</span>
      </div>

      {linkEntries.length > 0 && (
        <div className="space-y-2">
          {linkEntries.map(([sourceId, value]) => (
            <div key={sourceId} className="rounded-md border p-2" style={{ background: 'var(--bg-active)', borderColor: 'var(--border)' }}>
              <div className="mb-1 text-[11px] font-semibold text-[var(--text-primary)]">{screenTitle(sourceId)}</div>
              {(value.links || []).map((link, li) => (
                <div key={li} className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                  <span className="text-[var(--indigo)]">&rarr;</span>
                  <span className="font-medium text-[var(--text-secondary)]">{screenTitle(link.targetScreenId)}</span>
                  {link.transition && <span className="rounded bg-[var(--bg-base)] px-1 py-px text-[9px]">{TRANSITIONS[link.transition] || link.transition}</span>}
                  {link.xpath && <span className="truncate text-[9px] opacity-60" title={link.xpath}>{link.xpath.slice(0, 40)}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {linkEntries.length === 0 && (
        <p className="text-[11px] text-[var(--text-muted)]">No interactive prototype links detected. Create them in Stitch, then sync to import here.</p>
      )}
    </div>
  );
}
