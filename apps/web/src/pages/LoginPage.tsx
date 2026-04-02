import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { login, user, loading } = useAuth();
  const [email, setEmail] = useState('demo@pm-ai-tool.local');
  const [password, setPassword] = useState('demo12345');
  const [err, setErr] = useState('');

  if (!loading && user) return <Navigate to="/" replace />;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-md rounded-2xl border p-8 shadow-xl" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="mb-6 flex justify-center">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-base font-extrabold text-white"
            style={{ background: 'linear-gradient(135deg, var(--indigo) 0%, #7C5BF8 100%)', boxShadow: '0 4px 14px rgba(91,126,248,0.4)', fontFamily: "'Syne', sans-serif" }}
          >
            PM
          </div>
        </div>
        <h1 className="mb-2 text-center font-heading text-xl font-bold text-[var(--text-primary)]">Sign in to PM AI Tool</h1>
        <p className="mb-6 text-center text-sm text-[var(--text-muted)]">
          Sign in with your account. Ask an admin to create an account if you do not have one.
        </p>
        <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Email</label>
        <input
          id="login-email"
          className="mb-4 w-full rounded-[9px] border px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all focus:border-[var(--indigo)] focus:shadow-[0_0_0_3px_var(--indigo-dim)]"
          style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
        />
        <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]">Password</label>
        <input
          id="login-password"
          className="mb-4 w-full rounded-[9px] border px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all focus:border-[var(--indigo)] focus:shadow-[0_0_0_3px_var(--indigo-dim)]"
          style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
        />
        {err && <p role="alert" className="mb-4 text-sm text-[var(--red)]">{err}</p>}
        <button
          type="button"
          className="w-full rounded-lg py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5"
          style={{ background: 'var(--indigo)', boxShadow: '0 2px 8px rgba(91,126,248,0.35)' }}
          onClick={async () => {
            setErr('');
            try {
              await login(email.trim(), password);
            } catch (e) {
              setErr(e instanceof Error ? e.message : 'Login failed');
            }
          }}
        >
          Log in
        </button>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t" style={{ borderColor: 'var(--border)' }} /></div>
          <div className="relative flex justify-center"><span className="px-3 text-xs" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>or continue with</span></div>
        </div>

        <button
          type="button"
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border py-2.5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-[var(--border-light)]"
          style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          onClick={async () => {
            setErr('');
            try {
              const base = import.meta.env.VITE_API_URL || '';
              const res = await fetch(`${base}/api/v1/auth/google`);
              const d = await res.json();
              if (res.ok && d.configured && d.authorizationUrl) {
                window.location.href = d.authorizationUrl;
              } else {
                setErr(d.hint || d.error || 'Google SSO is not configured on the server. Ask your admin to set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
              }
            } catch (e) {
              setErr(e instanceof Error ? e.message : 'Google SSO failed');
            }
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
