import { api, getToken, setToken, clearAuth } from './api.js';
import { store } from './store.js';

export async function refreshSidebarUser() {
  const nameEl = document.querySelector('.user-name');
  const roleEl = document.querySelector('.user-role');
  const avatarEl = document.getElementById('sidebarUserAvatar') || document.querySelector('.user-avatar');
  const logoutBtn = document.getElementById('sidebarLogout');
  if (!getToken()) {
    if (nameEl) nameEl.textContent = 'Guest';
    if (roleEl) roleEl.textContent = 'Sign in to sync';
    if (logoutBtn) logoutBtn.hidden = true;
    return;
  }
  if (logoutBtn) logoutBtn.hidden = false;
  try {
    const { user } = await api.me();
    const name = user?.name || user?.email?.split('@')[0] || 'User';
    const email = user?.email || '';
    if (nameEl) nameEl.textContent = name;
    if (roleEl) roleEl.textContent = email || 'Product Manager';
    if (avatarEl) {
      const initials = String(name)
        .split(/\s+/)
        .map(w => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'U';
      avatarEl.textContent = initials;
    }
  } catch {
    if (nameEl) nameEl.textContent = '…';
  }
}

export function logout() {
  clearAuth();
  window.location.reload();
}

function showAuthGate() {
  const existing = document.getElementById('authGate');
  if (existing) return;

  const el = document.createElement('div');
  el.id = 'authGate';
  el.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px">
      <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:14px;padding:24px;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5)">
        <h2 style="font-family:Syne,sans-serif;font-size:20px;margin-bottom:8px">Sign in</h2>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Use the API (PostgreSQL). Default demo: demo@pm-ai-tool.local / demo12345 after <code style="font-size:11px">npm run seed:user</code> in server.</p>
        <label style="font-size:11px;color:var(--text-muted)">Email</label>
        <input type="email" id="authEmail" class="input-field" style="width:100%;margin-bottom:10px;font-size:13px;padding:8px" value="demo@pm-ai-tool.local">
        <label style="font-size:11px;color:var(--text-muted)">Password</label>
        <input type="password" id="authPassword" class="input-field" style="width:100%;margin-bottom:14px;font-size:13px;padding:8px" value="demo12345">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn btn-primary" id="authLoginBtn" style="font-size:12px">Log in</button>
          <button type="button" class="btn btn-secondary" id="authRegisterBtn" style="font-size:12px">Register</button>
        </div>
        <p id="authErr" style="color:var(--red);font-size:12px;margin-top:12px;display:none"></p>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  const err = () => document.getElementById('authErr');
  document.getElementById('authLoginBtn').onclick = async () => {
    err().style.display = 'none';
    try {
      const email = document.getElementById('authEmail').value.trim();
      const password = document.getElementById('authPassword').value;
      const { token } = await api.login({ email, password });
      setToken(token);
      el.remove();
      await store.hydrateFromApi();
      window.dispatchEvent(new Event('pm-ai-auth-changed'));
    } catch (e) {
      err().textContent = e.message || 'Login failed';
      err().style.display = 'block';
    }
  };
  document.getElementById('authRegisterBtn').onclick = async () => {
    err().style.display = 'none';
    try {
      const email = document.getElementById('authEmail').value.trim();
      const password = document.getElementById('authPassword').value;
      const { token } = await api.register({ email, password, name: 'User' });
      setToken(token);
      el.remove();
      await store.hydrateFromApi();
      window.dispatchEvent(new Event('pm-ai-auth-changed'));
    } catch (e) {
      err().textContent = e.message || 'Register failed';
      err().style.display = 'block';
    }
  };
}

export async function initAuth() {
  if (!getToken()) {
    showAuthGate();
    return;
  }
  try {
    await api.me();
    await store.hydrateFromApi();
  } catch {
    clearAuth();
    showAuthGate();
  }
}

export { clearAuth };
