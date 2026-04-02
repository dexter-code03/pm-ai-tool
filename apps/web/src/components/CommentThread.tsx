import { useEffect, useState } from 'react';
import { api, type CommentItem } from '../lib/api';
import { useToast } from '../hooks/useToast';

type Props = {
  open: boolean;
  onClose: () => void;
  prdId?: string;
  sectionId?: string;
  sectionTitle?: string;
};

const MENTION_USERS = [
  { name: 'Sarah K.', email: 'sarah@pm-ai-tool.local' },
  { name: 'Alex M.', email: 'alex@pm-ai-tool.local' },
  { name: 'Jordan L.', email: 'jordan@pm-ai-tool.local' },
  { name: 'Demo User', email: 'demo@pm-ai-tool.local' },
];

export function CommentThread({ open, onClose, prdId, sectionId, sectionTitle }: Props) {
  const { showToast } = useToast();
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');

  useEffect(() => {
    if (!open || !prdId) return;
    setLoading(true);
    api.getComments(prdId)
      .then((data) => {
        const all = data.comments || [];
        setComments(sectionId ? all.filter((c) => c.sectionId === sectionId) : all);
      })
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [open, prdId, sectionId]);

  if (!open) return null;

  async function addComment() {
    if (!newComment.trim() || !prdId) return;
    try {
      const { comment } = await api.createComment(prdId, { text: newComment.trim(), sectionId });
      setComments((prev) => [...prev, comment]);
      setNewComment('');
      showToast('Comment added', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to add comment', 'error');
    }
  }

  function getInitials(name: string) {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '??';
  }

  const colors = ['#5B7EF8', '#2DD4B7', '#F59E0B', '#EF4444', '#A78BFA'];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="animate-modal-in w-[480px] max-w-[95vw] rounded-2xl border shadow-2xl" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-light)', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
        <div className="flex items-start justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="font-heading text-base font-bold text-[var(--text-primary)]">Comments</h2>
            <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">{sectionTitle || 'Section comments'}</p>
          </div>
          <button type="button" className="text-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={onClose}>✕</button>
        </div>
        <div className="max-h-[360px] overflow-y-auto px-5 py-4">
          {loading && <p className="py-4 text-center text-xs text-[var(--text-muted)]">Loading…</p>}
          {!loading && comments.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-4">
              {comments.map((c, i) => {
                const name = c.user?.name || c.user?.email || 'Unknown';
                return (
                  <div key={c.id} className="flex gap-3">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ background: colors[i % colors.length] }}
                    >
                      {getInitials(name)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[var(--text-primary)]">{name}</span>
                        <span className="text-[11px] text-[var(--text-muted)]">{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                        {c.text.split(/(@\w[\w\s.]*?)(?=\s|$)/g).map((part, pi) =>
                          part.startsWith('@') ? <span key={pi} className="font-semibold text-[var(--indigo)]">{part}</span> : part
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="border-t p-4" style={{ borderColor: 'var(--border)' }}>
          <div className="relative">
            {showMentions && (
              <div className="absolute bottom-full left-0 mb-1 w-full rounded-lg border shadow-lg" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', zIndex: 10 }}>
                {MENTION_USERS.filter((u) => u.name.toLowerCase().includes(mentionFilter.toLowerCase())).map((u) => (
                  <button
                    key={u.email}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--bg-hover)]"
                    onClick={() => {
                      const atIdx = newComment.lastIndexOf('@');
                      setNewComment(newComment.slice(0, atIdx) + `@${u.name} `);
                      setShowMentions(false);
                    }}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: 'var(--indigo)' }}>{u.name.split(' ').map((w) => w[0]).join('')}</span>
                    <span className="text-[var(--text-primary)]">{u.name}</span>
                    <span className="text-[11px] text-[var(--text-muted)]">{u.email}</span>
                  </button>
                ))}
                {MENTION_USERS.filter((u) => u.name.toLowerCase().includes(mentionFilter.toLowerCase())).length === 0 && (
                  <div className="px-3 py-2 text-[12px] text-[var(--text-muted)]">No users found</div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-[9px] border px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none transition-all focus:border-[var(--indigo)] focus:shadow-[0_0_0_3px_var(--indigo-dim)]"
                style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}
                placeholder="Add a comment… (type @ to mention)"
                value={newComment}
                onChange={(e) => {
                  setNewComment(e.target.value);
                  const val = e.target.value;
                  const atIdx = val.lastIndexOf('@');
                  if (atIdx >= 0 && !val.slice(atIdx).includes(' ')) {
                    setMentionFilter(val.slice(atIdx + 1));
                    setShowMentions(true);
                  } else {
                    setShowMentions(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowMentions(false);
                  if (e.key === 'Enter' && !e.shiftKey && !showMentions) { e.preventDefault(); void addComment(); }
                }}
              />
              <button
                type="button"
                className="shrink-0 rounded-lg px-3 py-2 text-[13px] font-medium text-white"
                style={{ background: 'var(--indigo)' }}
                onClick={() => void addComment()}
              >
                Send
              </button>
            </div>
          </div>
          <p className="mt-1.5 text-[10.5px] text-[var(--text-muted)]">Tip: Type @ to mention a team member</p>
        </div>
      </div>
    </div>
  );
}
