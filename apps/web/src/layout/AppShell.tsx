import { useCallback, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useIntegrationStatus } from '../hooks/useIntegrationStatus';
import { NotificationPanel } from '../components/NotificationPanel';

function NavItem({
  to,
  end,
  label,
  icon,
  badge,
  statusDot,
}: {
  to: string;
  end?: boolean;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  statusDot?: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-all ${
          isActive
            ? 'border border-[rgba(91,126,248,0.18)] bg-[var(--indigo-dim)] text-[var(--indigo)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
        }`
      }
    >
      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center opacity-80">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className="ml-auto rounded-full bg-[var(--indigo-dim)] px-1.5 py-px text-[10px] font-semibold text-[var(--indigo)]">
          {badge}
        </span>
      )}
      {statusDot && (
        <span
          className="ml-auto h-[7px] w-[7px] shrink-0 rounded-full"
          style={{ background: statusDot }}
        />
      )}
    </NavLink>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-1.5 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-[1.2px] text-[var(--text-muted)]">
      {children}
    </div>
  );
}

export function AppShell() {
  const { user, logout, loading } = useAuth();
  const { hasJira, hasFigma } = useIntegrationStatus();
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const handleNotifCount = useCallback((count: number) => setUnreadCount(count), []);
  const location = useLocation();

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    );
  }

  const initials = user.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isEditor = location.pathname.startsWith('/prd/');
  const isWireframes = location.pathname.startsWith('/wireframes');
  const isSettings = location.pathname === '/settings';
  let breadcrumb: React.ReactNode;
  if (isEditor) {
    breadcrumb = (
      <>
        <NavLink to="/" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">PRD Documents</NavLink>
        <span className="text-[var(--border-light)]">›</span>
        <span className="font-medium text-[var(--text-primary)]">Editor</span>
      </>
    );
  } else if (isWireframes) {
    breadcrumb = (
      <>
        <span className="text-[var(--text-muted)]">Workspace</span>
        <span className="text-[var(--border-light)]">›</span>
        <span className="font-medium text-[var(--text-primary)]">Wireframes</span>
      </>
    );
  } else if (isSettings) {
    breadcrumb = <span className="font-medium text-[var(--text-primary)]">Settings</span>;
  } else {
    breadcrumb = <span className="font-medium text-[var(--text-primary)]">PRD Documents</span>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <aside
        className="flex h-full w-[240px] min-w-[240px] flex-col border-r"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b px-[18px] py-5" style={{ borderColor: 'var(--border)' }}>
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-sm font-extrabold text-white"
            style={{
              background: 'linear-gradient(135deg, var(--indigo) 0%, #7C5BF8 100%)',
              boxShadow: '0 4px 14px rgba(91,126,248,0.4)',
              fontFamily: "'Syne', sans-serif",
            }}
          >
            PM
          </div>
          <div>
            <div className="font-heading text-[15px] font-bold leading-tight text-[var(--text-primary)]">PM AI Tool</div>
          </div>
          <span className="ml-auto rounded border px-1.5 py-px text-[9px] font-semibold text-[var(--indigo)]" style={{ background: 'var(--indigo-dim)', borderColor: 'rgba(91,126,248,0.25)' }}>
            v1.0
          </span>
        </div>

        {/* Nav sections */}
        <div className="flex-1 overflow-y-auto px-3">
          <SectionLabel>Workspace</SectionLabel>
          <nav className="flex flex-col gap-0.5">
            <NavItem
              to="/"
              end
              label="PRD Documents"
              icon={<svg viewBox="0 0 20 20" fill="currentColor" className="h-[18px] w-[18px]"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/></svg>}
            />
            <NavItem
              to="/wireframes"
              label="Wireframes"
              icon={<svg viewBox="0 0 20 20" fill="currentColor" className="h-[18px] w-[18px]"><rect x="2" y="3" width="7" height="10" rx="1.5"/><rect x="11" y="3" width="7" height="5" rx="1.5"/><rect x="11" y="10" width="7" height="6" rx="1.5"/></svg>}
            />
          </nav>

          <div className="mx-1 my-3 h-px" style={{ background: 'var(--border)' }} />

          <SectionLabel>Integrations</SectionLabel>
          <nav className="flex flex-col gap-0.5">
            <NavItem
              to="/settings#jira"
              label="Jira"
              icon={<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-[18px] w-[18px]"><circle cx="10" cy="10" r="7"/><path d="M10 7v3l2 2"/></svg>}
              statusDot={hasJira ? 'var(--green)' : undefined}
            />
            <NavItem
              to="/settings#figma"
              label="Figma"
              icon={<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-[18px] w-[18px]"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="10" y="3" width="7" height="7" rx="2"/><rect x="3" y="10" width="7" height="7" rx="2"/><circle cx="13.5" cy="13.5" r="3.5"/></svg>}
              statusDot={hasFigma ? 'var(--green)' : undefined}
            />
            <NavItem
              to="/settings"
              label="Settings"
              icon={<svg viewBox="0 0 20 20" fill="currentColor" className="h-[18px] w-[18px]"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/></svg>}
            />
          </nav>
        </div>

        {/* User card */}
        <div className="border-t px-3 py-3.5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 transition-colors hover:bg-[var(--bg-hover)]">
            <div
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #5B7EF8, #2DD4B7)' }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-[var(--text-primary)]">{user.name}</div>
              <div className="truncate text-[11px] text-[var(--text-muted)]">Product Manager</div>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-2 w-full rounded-lg border px-3 py-1.5 text-xs transition-colors"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden" style={{ minWidth: 0 }}>
        {/* Topbar */}
        <div
          className="flex h-14 min-h-14 items-center gap-3 border-b px-6"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center gap-1.5 text-[13px]">
            {breadcrumb}
          </div>
          <div className="flex-1" />
          <div
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border)',
              width: 220,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--text-muted)]">
              <circle cx="9" cy="9" r="6"/>
              <path d="M15 15l4 4" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search PRDs, tickets…"
              className="w-full border-none bg-transparent text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>
          <button
            type="button"
            className="relative flex h-[34px] w-[34px] items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => setNotifOpen((v) => !v)}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z"/>
            </svg>
            {unreadCount > 0 && (
              <span
                className="absolute right-[5px] top-[5px] h-[7px] w-[7px] rounded-full border-2"
                style={{ background: 'var(--indigo)', borderColor: 'var(--bg-surface)' }}
              />
            )}
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto" style={{ padding: '28px 32px' }}>
          <Outlet />
        </main>
      </div>

      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} onCountChange={handleNotifCount} />
    </div>
  );
}
