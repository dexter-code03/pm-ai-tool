import { useToast } from '../hooks/useToast';

type Props = {
  open: boolean;
  onClose: () => void;
  status: string;
  onStatusChange: (status: string) => void;
  prdTitle?: string;
};

const stages = [
  { key: 'draft', label: 'Draft', desc: 'Document is being written', icon: '📝' },
  { key: 'review', label: 'In Review', desc: 'Sent to stakeholders for review', icon: '👀' },
  { key: 'approved', label: 'Approved', desc: 'All reviewers have approved', icon: '✅' },
];

const reviewers = [
  { name: 'Sarah K.', initials: 'SK', role: 'Product Lead', status: 'approved', color: 'linear-gradient(135deg, #2DD4B7, #5B7EF8)' },
  { name: 'Alex M.', initials: 'AM', role: 'Engineering Lead', status: 'pending', color: 'linear-gradient(135deg, #5B7EF8, #7C5BF8)' },
  { name: 'Jordan L.', initials: 'JL', role: 'Design Lead', status: 'pending', color: 'linear-gradient(135deg, #F59E0B, #EF4444)' },
];

export function ApprovalWorkflow({ open, onClose, status, onStatusChange, prdTitle }: Props) {
  const { showToast } = useToast();

  if (!open) return null;

  const currentIndex = stages.findIndex((s) => s.key === status);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="animate-modal-in w-[520px] max-w-[95vw] rounded-2xl border shadow-2xl" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-light)', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
        <div className="flex items-start justify-between border-b px-6 py-4" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="font-heading text-lg font-bold text-[var(--text-primary)]">Approval Workflow</h2>
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">{prdTitle || 'PRD Document'}</p>
          </div>
          <button type="button" className="text-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={onClose}>✕</button>
        </div>
        <div className="px-6 py-5">
          {/* Progress stages */}
          <div className="mb-6 flex items-center gap-3">
            {stages.map((s, i) => {
              const isComplete = i < currentIndex || status === 'approved';
              const isCurrent = i === currentIndex;
              return (
                <div key={s.key} className="flex flex-1 items-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-base transition-all"
                      style={{
                        background: isComplete ? 'var(--green-dim)' : isCurrent ? 'var(--indigo-dim)' : 'var(--bg-active)',
                        border: `2px solid ${isComplete ? 'var(--green)' : isCurrent ? 'var(--indigo)' : 'var(--border-light)'}`,
                      }}
                    >
                      {isComplete ? '✓' : s.icon}
                    </div>
                    <span className="text-[11px] font-semibold" style={{ color: isCurrent ? 'var(--indigo)' : isComplete ? 'var(--green)' : 'var(--text-muted)' }}>{s.label}</span>
                  </div>
                  {i < stages.length - 1 && (
                    <div className="h-0.5 flex-1 rounded" style={{ background: i < currentIndex ? 'var(--green)' : 'var(--border)' }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Reviewers */}
          <div className="mb-2 text-xs font-bold uppercase tracking-[1px] text-[var(--text-muted)]">Reviewers</div>
          <div className="space-y-2.5">
            {reviewers.map((r) => (
              <div key={r.name} className="flex items-center gap-3 rounded-xl border p-3" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: r.color }}>{r.initials}</div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-[var(--text-primary)]">{r.name}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">{r.role}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.status === 'approved' ? 'bg-[var(--green-dim)] text-[var(--green)]' : 'bg-[var(--bg-active)] text-[var(--text-muted)]'}`}>
                  {r.status === 'approved' ? '✓ Approved' : '○ Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2.5 border-t px-6 py-3.5" style={{ borderColor: 'var(--border)' }}>
          <button type="button" className="rounded-lg border px-3.5 py-1.5 text-[13px] font-medium" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderColor: 'var(--border-light)' }} onClick={onClose}>Close</button>
          {status === 'draft' && (
            <button type="button" className="rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-white" style={{ background: 'var(--indigo)', boxShadow: '0 2px 8px rgba(91,126,248,0.35)' }} onClick={() => { onStatusChange('review'); showToast('Sent for review!', 'success'); onClose(); }}>
              Send for Review →
            </button>
          )}
          {status === 'review' && (
            <button type="button" className="rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-white" style={{ background: 'var(--green)', boxShadow: '0 2px 8px rgba(34,197,94,0.35)' }} onClick={() => { onStatusChange('approved'); showToast('PRD Approved!', 'success'); onClose(); }}>
              ✓ Approve
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
