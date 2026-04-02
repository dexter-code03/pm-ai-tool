import { useEffect, useState } from 'react';
import { api, type VersionItem } from '../lib/api';
import { useToast } from '../hooks/useToast';

type Props = {
  open: boolean;
  onClose: () => void;
  prdId?: string;
  onRestore?: () => void;
};

export function VersionHistoryPanel({ open, onClose, prdId, onRestore }: Props) {
  const { showToast } = useToast();
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!open || !prdId) return;
    setLoading(true);
    api.getVersions(prdId)
      .then((data) => setVersions(data.versions || []))
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [open, prdId]);

  if (!open) return null;

  async function handleRestore() {
    if (!prdId || !selected) return;
    setRestoring(true);
    try {
      await api.restoreVersion(prdId, selected);
      showToast('Version restored!', 'success');
      onRestore?.();
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Restore failed', 'error');
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="animate-modal-in w-[720px] max-w-[95vw] rounded-2xl border shadow-2xl" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-light)', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
        <div className="flex items-start justify-between border-b px-6 py-4" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="font-heading text-lg font-bold text-[var(--text-primary)]">Version History</h2>
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">Browse and compare past versions of this PRD</p>
          </div>
          <button type="button" className="text-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={onClose}>✕</button>
        </div>
        <div className="flex" style={{ minHeight: 400 }}>
          <div className="w-[240px] border-r py-4 pl-6 pr-4" style={{ borderColor: 'var(--border)' }}>
            {loading && <p className="text-xs text-[var(--text-muted)]">Loading…</p>}
            {!loading && versions.length === 0 && <p className="text-xs text-[var(--text-muted)]">No versions saved yet.</p>}
            <div className="relative">
              {versions.length > 1 && <div className="absolute left-[7px] top-3 bottom-3 w-px" style={{ background: 'var(--border)' }} />}
              {versions.map((v, i) => (
                <div
                  key={v.id}
                  className="relative cursor-pointer pb-5"
                  onClick={() => setSelected(selected === v.id ? null : v.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative z-10 mt-1 flex h-[14px] w-[14px] shrink-0 items-center justify-center">
                      <span className={`h-2.5 w-2.5 rounded-full ${i === 0 ? 'bg-[var(--green)] shadow-[0_0_6px_rgba(34,197,94,0.5)]' : selected === v.id ? 'bg-[var(--indigo)]' : 'bg-[var(--bg-active)]'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[var(--text-primary)]">{v.label || `v${versions.length - i}`}</span>
                        {i === 0 && <span className="rounded bg-[var(--green-dim)] px-1.5 py-px text-[9px] font-bold text-[var(--green)]">CURRENT</span>}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{v.user?.name || 'Unknown'} · {new Date(v.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {selected ? (
              <div>
                <h3 className="mb-4 text-sm font-bold text-[var(--text-primary)]">
                  Version: {versions.find((v) => v.id === selected)?.label || 'Selected'}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">Snapshot data saved at {new Date(versions.find((v) => v.id === selected)?.createdAt || '').toLocaleString()}</p>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
                <p className="text-center text-sm">Select a version to view details</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2.5 border-t px-6 py-3.5" style={{ borderColor: 'var(--border)' }}>
          <button type="button" className="rounded-lg border px-3.5 py-1.5 text-[13px] font-medium" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderColor: 'var(--border-light)' }} onClick={onClose}>Close</button>
          <button
            type="button"
            className="rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--indigo)' }}
            disabled={!selected || restoring}
            onClick={handleRestore}
          >
            {restoring ? 'Restoring…' : 'Restore This Version'}
          </button>
        </div>
      </div>
    </div>
  );
}
