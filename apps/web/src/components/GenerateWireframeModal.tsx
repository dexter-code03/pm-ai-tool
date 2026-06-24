import { useEffect, useRef, useState } from 'react';
import { api, type PrdRow } from '../lib/api';

type Props = {
  open: boolean;
  onClose: () => void;
  onGenerate: (opts: { method: string; brief: string; platform: string; style: string; prdIds?: string[] }) => void;
  generating: boolean;
  initialPrdId?: string;
  progress?: { step: number; total: number; detail: string } | null;
  error?: string;
};

export function GenerateWireframeModal({ open, onClose, onGenerate, generating, initialPrdId, progress, error }: Props) {
  const [method, setMethod] = useState(initialPrdId ? 'linkprd' : 'brief');
  const [brief, setBrief] = useState('');
  const [platform, setPlatform] = useState('');
  const [style, setStyle] = useState('lo-fi');
  const [prdIds, setPrdIds] = useState<string[]>(initialPrdId ? [initialPrdId] : []);
  const [prds, setPrds] = useState<PrdRow[]>([]);
  const [prdsLoading, setPrdsLoading] = useState(false);

  // Screenshots source
  const [screenshots, setScreenshots] = useState<{ file: File; previewUrl: string }[]>([]);
  const [screenshotDesc, setScreenshotDesc] = useState('');
  const [screenshotDragging, setScreenshotDragging] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  // Component Kit source
  const [componentKitUrl, setComponentKitUrl] = useState('');
  const [componentKitDesc, setComponentKitDesc] = useState('');

  useEffect(() => {
    if (open && method === 'linkprd' && prds.length === 0) {
      setPrdsLoading(true);
      api.getPrds().then((d) => setPrds(d.prds || [])).catch(() => {}).finally(() => setPrdsLoading(false));
    }
  }, [open, method, prds.length]);

  useEffect(() => {
    if (initialPrdId) {
      setMethod('linkprd');
      setPrdIds(prev => prev.includes(initialPrdId) ? prev : [initialPrdId]);
    }
  }, [initialPrdId]);

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => { screenshots.forEach(s => URL.revokeObjectURL(s.previewUrl)); };
  }, [screenshots]);

  if (!open) return null;

  function togglePrd(id: string) {
    setPrdIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function addScreenshotFiles(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const newEntries = imageFiles.map(file => ({ file, previewUrl: URL.createObjectURL(file) }));
    setScreenshots(prev => [...prev, ...newEntries]);
  }

  function removeScreenshot(index: number) {
    setScreenshots(prev => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function buildBrief(): string {
    if (method === 'screenshots') {
      const names = screenshots.map(s => s.file.name).join(', ');
      const ref = names ? `Reference screenshots: ${names}.\n` : '';
      return ref + (screenshotDesc.trim() || '');
    }
    if (method === 'component') {
      const url = componentKitUrl.trim() ? `Component Kit URL: ${componentKitUrl.trim()}\n` : '';
      return url + (componentKitDesc.trim() || '');
    }
    return brief;
  }

  const canGenerate = (() => {
    if (!platform) return false;
    if (method === 'linkprd') return prdIds.length > 0;
    if (method === 'screenshots') return screenshots.length > 0 || !!screenshotDesc.trim();
    if (method === 'component') return !!componentKitUrl.trim() || !!componentKitDesc.trim();
    return !!brief.trim();
  })();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={(e) => { if (e.target === e.currentTarget && !generating) onClose(); }}>
      <div className="animate-modal-in w-[560px] max-w-[95vw] rounded-2xl border shadow-2xl" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-light)', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
        <div className="flex items-start justify-between px-6 pt-5">
          <div>
            <h2 className="font-heading text-lg font-bold text-[var(--text-primary)]">Generate New Wireframe</h2>
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">Start from a brief, screenshot, component library, or link PRD(s)</p>
          </div>
          {!generating && (
            <button type="button" className="text-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={onClose}>&#x2715;</button>
          )}
        </div>
        <div className="px-6 py-5">
          {/* Step 1: Platform selection */}
          <div className="mb-5">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Step 1 — What are you designing for?
            </label>
            <div className="flex gap-2">
              {[
                { id: 'mobile', label: 'Mobile App', icon: '\uD83D\uDCF1', desc: 'iOS / Android' },
                { id: 'desktop', label: 'Web / Desktop', icon: '\uD83D\uDDA5\uFE0F', desc: 'Browser / Desktop' },
                { id: 'tablet', label: 'Tablet', icon: '\uD83D\uDCDF', desc: 'iPad / Android Tablet' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex-1 rounded-xl border-2 p-3 text-center transition-all hover:-translate-y-0.5"
                  style={{
                    background: platform === p.id ? 'var(--indigo-dim)' : 'var(--bg-base)',
                    borderColor: platform === p.id ? 'var(--indigo)' : 'var(--border)',
                    boxShadow: platform === p.id ? '0 2px 12px rgba(91,126,248,0.25)' : 'none',
                  }}
                  onClick={() => setPlatform(p.id)}
                >
                  <div className="text-lg">{p.icon}</div>
                  <div className="text-[12px] font-semibold text-[var(--text-primary)]">{p.label}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{p.desc}</div>
                </button>
              ))}
            </div>
            {!platform && (
              <p className="mt-1.5 text-[11px] font-medium text-amber-400">Please select a platform to continue</p>
            )}
          </div>

          {/* Step 2: Source selection */}
          <div className="mb-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Step 2 — Source
            </label>
            <div className="flex gap-0 rounded-[9px] p-1" style={{ background: 'var(--bg-base)' }}>
              {[{id:'brief',label:'Text Brief'},{id:'screenshots',label:'Screenshots'},{id:'component',label:'Component Kit'},{id:'linkprd',label:'Link PRD(s)'}].map((t) => (
                <button key={t.id} type="button" className="flex-1 rounded-md px-2 py-1.5 text-[13px] font-medium transition-all" style={{background:method===t.id?'var(--bg-elevated)':'transparent',color:method===t.id?'var(--text-primary)':'var(--text-muted)',boxShadow:method===t.id?'0 1px 4px rgba(0,0,0,0.3)':'none'}} onClick={()=>setMethod(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {method === 'linkprd' ? (
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">
                Select PRD(s) to generate wireframes from
                {prdIds.length > 0 && (
                  <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'var(--indigo-dim)', color: 'var(--indigo)' }}>
                    {prdIds.length} selected
                  </span>
                )}
              </label>
              {prdsLoading ? (
                <p className="text-sm text-[var(--text-muted)]">Loading PRDs...</p>
              ) : prds.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No PRDs found. Create one first.</p>
              ) : (
                <div className="max-h-[200px] space-y-2 overflow-y-auto">
                  {prds.map((p) => {
                    const selected = prdIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all hover:border-[var(--indigo)]"
                        style={{
                          background: selected ? 'var(--indigo-dim)' : 'var(--bg-base)',
                          borderColor: selected ? 'var(--indigo)' : 'var(--border)',
                        }}
                        onClick={() => togglePrd(p.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          readOnly
                          className="accent-[var(--indigo)] h-4 w-4 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{p.title}</div>
                          <div className="text-[11px] text-[var(--text-muted)]">{p.status} · Updated {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'recently'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : method === 'screenshots' ? (
            <div className="mb-4 space-y-3">
              {/* Drop zone */}
              <div
                className="relative flex min-h-[110px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[9px] border-2 border-dashed transition-all"
                style={{
                  borderColor: screenshotDragging ? 'var(--indigo)' : 'var(--border)',
                  background: screenshotDragging ? 'var(--indigo-dim)' : 'var(--bg-base)',
                }}
                onClick={() => screenshotInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setScreenshotDragging(true); }}
                onDragLeave={() => setScreenshotDragging(false)}
                onDrop={(e) => { e.preventDefault(); setScreenshotDragging(false); addScreenshotFiles(e.dataTransfer.files); }}
              >
                <input
                  ref={screenshotInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => { if (e.target.files) addScreenshotFiles(e.target.files); e.target.value = ''; }}
                />
                <div className="text-2xl">🖼️</div>
                <p className="text-[13px] font-medium text-[var(--text-secondary)]">
                  {screenshots.length === 0 ? 'Drop reference screenshots here or click to upload' : 'Add more screenshots'}
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">PNG, JPG, WEBP — multiple allowed</p>
              </div>

              {/* Previews */}
              {screenshots.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {screenshots.map((s, i) => (
                    <div key={i} className="group relative h-16 w-16 overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                      <img src={s.previewUrl} alt={s.file.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        className="absolute inset-0 hidden items-center justify-center rounded-lg bg-black/60 text-white group-hover:flex"
                        onClick={(e) => { e.stopPropagation(); removeScreenshot(i); }}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Optional description */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                  Describe what to generate&nbsp;<span className="font-normal opacity-60">(optional)</span>
                </label>
                <textarea
                  className="w-full resize-none rounded-[9px] border px-3.5 py-2.5 text-[13.5px] text-[var(--text-primary)] outline-none transition-all focus:border-[var(--indigo)] focus:shadow-[0_0_0_3px_var(--indigo-dim)]"
                  style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}
                  rows={2}
                  placeholder="e.g. 'Redesign the checkout flow keeping these screenshots as reference style'"
                  value={screenshotDesc}
                  onChange={(e) => setScreenshotDesc(e.target.value)}
                />
              </div>
            </div>
          ) : method === 'component' ? (
            <div className="mb-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Component Library URL</label>
                <input
                  type="url"
                  className="w-full rounded-[9px] border px-3.5 py-2.5 text-[13.5px] text-[var(--text-primary)] outline-none transition-all focus:border-[var(--indigo)] focus:shadow-[0_0_0_3px_var(--indigo-dim)]"
                  style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}
                  placeholder="https://www.figma.com/community/file/... or Stitch component kit URL"
                  value={componentKitUrl}
                  onChange={(e) => setComponentKitUrl(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">Paste a Figma community file URL or your component library link</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                  What to build&nbsp;<span className="font-normal opacity-60">(describe the screens)</span>
                </label>
                <textarea
                  className="w-full resize-none rounded-[9px] border px-3.5 py-2.5 text-[13.5px] text-[var(--text-primary)] outline-none transition-all focus:border-[var(--indigo)] focus:shadow-[0_0_0_3px_var(--indigo-dim)]"
                  style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}
                  rows={3}
                  placeholder="e.g. 'A 3-screen user onboarding flow using these components: buttons, input fields, progress bar and avatar'"
                  value={componentKitDesc}
                  onChange={(e) => setComponentKitDesc(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Describe your screen or user flow</label>
              <textarea className="w-full resize-none rounded-[9px] border px-3.5 py-2.5 text-[13.5px] text-[var(--text-primary)] outline-none transition-all focus:border-[var(--indigo)] focus:shadow-[0_0_0_3px_var(--indigo-dim)]" style={{background:'var(--bg-base)',borderColor:'var(--border)'}} rows={4} placeholder="e.g. 'A mobile onboarding flow with 4 steps: welcome screen, sign up form with social login, preference selection, and home dashboard.'" value={brief} onChange={(e)=>setBrief(e.target.value)} />
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Wireframe Style</label>
            <div className="flex gap-2">
              {[{id:'lo-fi',label:'Lo-Fi'},{id:'mid-fi',label:'Mid-Fi'},{id:'component',label:'Component Kit'}].map((s)=>(
                <Chip key={s.id} active={style===s.id} onClick={()=>setStyle(s.id)}>{s.label}</Chip>
              ))}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {generating && (
          <div className="mx-6 mb-3 rounded-lg border p-3" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                {progress?.detail || 'Generating wireframes...'}
              </span>
              {progress && progress.total > 0 && (
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  {progress.step}/{progress.total}
                </span>
              )}
            </div>
            <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--bg-active)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  background: 'linear-gradient(90deg, var(--indigo), var(--teal))',
                  width: progress && progress.total > 0
                    ? `${Math.min(100, (progress.step / progress.total) * 100)}%`
                    : '30%',
                  animation: (!progress || progress.total === 0) ? 'pulse 1.5s ease-in-out infinite' : 'none',
                }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-[var(--text-muted)]">
              Stitch generates each screen with AI — this takes 1-3 minutes for 3-4 screens
            </p>
          </div>
        )}

        {/* Error display */}
        {error && !generating && (
          <div className="mx-6 mb-3 rounded-lg border p-3" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }}>
            <p className="text-[12px] font-semibold text-red-400">{error}</p>
            <p className="mt-1 text-[10px] text-red-300">Try again or check your Stitch API key in Settings</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-2.5 px-6 pb-5">
          {platform && !generating && (
            <span className="text-[11px] text-[var(--text-muted)]">
              Generating <strong className="text-[var(--text-primary)]">{platform === 'mobile' ? 'Mobile' : platform === 'tablet' ? 'Tablet' : 'Desktop'}</strong> wireframes {method === 'linkprd' ? `from ${prdIds.length} PRD(s)` : method === 'screenshots' ? `from ${screenshots.length} screenshot(s)` : method === 'component' ? 'from component kit' : 'from brief'}
            </span>
          )}
          <div className="ml-auto flex gap-2.5">
            <button type="button" className="rounded-lg border px-3.5 py-1.5 text-[13px] font-medium" style={{background:'var(--bg-elevated)',color:'var(--text-secondary)',borderColor:'var(--border-light)'}} onClick={onClose} disabled={generating}>
              {generating ? 'Running...' : 'Cancel'}
            </button>
            {!generating && (
              <button type="button" className="rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-white shadow hover:-translate-y-px disabled:opacity-50" style={{background: canGenerate ? 'var(--indigo)' : 'var(--text-muted)', boxShadow: canGenerate ? '0 2px 8px rgba(91,126,248,0.35)' : 'none'}} disabled={!canGenerate} onClick={()=>onGenerate({method,brief:buildBrief(),platform,style,prdIds: method === 'linkprd' ? prdIds : undefined})}>
                Generate Wireframe
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({children,active,onClick}:{children:React.ReactNode;active:boolean;onClick:()=>void}) {
  return (
    <button type="button" className="rounded-full border px-3 py-1 text-xs font-medium transition-all" style={{background:active?'var(--indigo-dim)':'var(--bg-elevated)',color:active?'var(--indigo)':'var(--text-secondary)',borderColor:active?'rgba(91,126,248,0.3)':'var(--border)'}} onClick={onClick}>
      {children}
    </button>
  );
}
