import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type NotificationItem } from '../lib/api';
import { useToast } from '../hooks/useToast';

type Props = { open: boolean; onClose: () => void; onCountChange?: (count: number) => void };

export function NotificationPanel({ open, onClose, onCountChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      onCountChange?.((data.notifications || []).filter((n) => !n.read).length);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    const t = setTimeout(() => document.addEventListener('click', handleClick), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', handleClick);
    };
  }, [open, onClose]);

  async function handleMarkRead(id: string) {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
      onCountChange?.(notifications.filter((n) => !n.read && n.id !== id).length);
    } catch { /* best effort */ }
  }

  async function handleMarkAllRead() {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      onCountChange?.(0);
      showToast('All notifications marked as read', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      ref={ref}
      className="fixed right-0 top-14 flex h-[calc(100vh-56px)] w-[340px] flex-col border-l transition-transform duration-200"
      style={{
        background: 'var(--bg-elevated)',
        borderColor: 'var(--border)',
        zIndex: 50,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
      }}
    >
      <div className="flex items-center gap-2.5 border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
        <h3 className="font-heading text-[15px] font-bold text-[var(--text-primary)]">Notifications</h3>
        {unreadCount > 0 && (
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--indigo)] px-1 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
        {unreadCount > 0 && (
          <button
            type="button"
            className="text-[11px] text-[var(--indigo)] hover:underline"
            onClick={() => void handleMarkAllRead()}
          >
            Mark all read
          </button>
        )}
        <button
          type="button"
          className="ml-auto text-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && <p className="px-5 py-6 text-center text-xs text-[var(--text-muted)]">Loading…</p>}
        {!loading && notifications.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-[var(--text-muted)]">No notifications yet.</p>
        )}
        {notifications.map((n) => (
          <div
            key={n.id}
            className="cursor-pointer border-b px-5 py-3.5 transition-colors hover:bg-[var(--bg-hover)]"
            style={{ borderColor: 'var(--border)', opacity: n.read ? 0.5 : 1 }}
            onClick={() => { if (!n.read) void handleMarkRead(n.id); }}
          >
            <div className="flex gap-2.5">
              <span
                className="mt-1 h-[7px] w-[7px] shrink-0 rounded-full"
                style={{ background: n.read ? 'var(--bg-active)' : 'var(--indigo)' }}
              />
              <div>
                <div className="text-[13px] font-medium text-[var(--text-primary)]">{n.title}</div>
                {n.body && <div className="mt-0.5 text-xs text-[var(--text-muted)]">{n.body}</div>}
                <div className="mt-1 text-[11px] text-[var(--text-muted)]">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
