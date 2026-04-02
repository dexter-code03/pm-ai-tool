const TOKEN_KEY = 'pm_ai_token';

function baseUrl() {
  return import.meta.env.VITE_API_URL || '';
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
}

async function parseGenerateSSE(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lastPrd;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split(/\n\n/);
    buffer = chunks.pop() || '';
    for (const chunk of chunks) {
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'done' && data.prd) lastPrd = data.prd;
        } catch {
          /* ignore */
        }
      }
    }
  }
  return lastPrd;
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const url = `${baseUrl()}${path}`;
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data.error || res.statusText || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  register: (body) => request('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/api/v1/me'),

  getPrds: () => request('/api/v1/prds'),
  getPrd: (id) => request(`/api/v1/prds/${id}`),
  createPrd: (body) => request('/api/v1/prds', { method: 'POST', body: JSON.stringify(body) }),
  updatePrd: (id, body) => request(`/api/v1/prds/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deletePrd: (id) => request(`/api/v1/prds/${id}`, { method: 'DELETE' }),

  generatePrd: async (body) => {
    const t = getToken();
    const res = await fetch(`${baseUrl()}/api/v1/prds/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || 'Generate failed');
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/event-stream')) {
      const prd = await parseGenerateSSE(res);
      if (!prd) throw new Error('Generation finished without PRD payload');
      return prd;
    }
    const j = await res.json();
    return j.prd || j;
  },

  regenerateSection: (id, body) =>
    request(`/api/v1/prds/${id}/regenerate-section`, { method: 'POST', body: JSON.stringify(body) }),
  aiAssist: (id, body) =>
    request(`/api/v1/prds/${id}/ai-assist`, { method: 'POST', body: JSON.stringify(body) }),

  prdVersions: (id) => request(`/api/v1/prds/${id}/versions`),
  savePrdVersion: (id, label) =>
    request(`/api/v1/prds/${id}/versions`, { method: 'POST', body: JSON.stringify({ label }) }),
  restorePrdVersion: (id, vid) =>
    request(`/api/v1/prds/${id}/versions/${vid}/restore`, { method: 'POST' }),

  getPrdComments: (id) => request(`/api/v1/prds/${id}/comments`),
  postPrdComment: (id, body) =>
    request(`/api/v1/prds/${id}/comments`, { method: 'POST', body: JSON.stringify(body) }),
  patchPrdComment: (id, commentId, body) =>
    request(`/api/v1/prds/${id}/comments/${commentId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  duplicatePrd: (id) => request(`/api/v1/prds/${id}/duplicate`, { method: 'POST' }),

  exportPrd: (id, format) => {
    const t = getToken();
    return fetch(`${baseUrl()}/api/v1/prds/${id}/export/${format}`, {
      headers: { Authorization: t ? `Bearer ${t}` : '' }
    });
  },

  getIntegrations: () => request('/api/v1/settings/integrations'),
  updateIntegration: (provider, body) =>
    request(`/api/v1/settings/integrations/${provider}`, { method: 'PUT', body: JSON.stringify(body) }),
  testIntegration: (provider) =>
    request(`/api/v1/settings/integrations/${provider}/test`, { method: 'POST' }),
  getPreferences: () => request('/api/v1/settings/preferences'),
  updatePreferences: (body) =>
    request('/api/v1/settings/preferences', { method: 'PUT', body: JSON.stringify(body) }),

  getWireframes: () => request('/api/v1/wireframes'),
  getWireframe: (id) => request(`/api/v1/wireframes/${id}`),
  generateWireframeFromPrd: (body) =>
    request('/api/v1/wireframes/generate-from-prd', { method: 'POST', body: JSON.stringify(body) }),
  generateWireframeStandalone: (body) =>
    request('/api/v1/wireframes/generate-standalone', { method: 'POST', body: JSON.stringify(body) }),
  editWireframeScreen: (id, body) =>
    request(`/api/v1/wireframes/${id}/edit-screen`, { method: 'POST', body: JSON.stringify(body) }),
  deleteWireframe: (id) => request(`/api/v1/wireframes/${id}`, { method: 'DELETE' }),

  getNotifications: () => request('/api/v1/notifications'),
  markNotificationRead: (id) => request(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/api/v1/notifications/read-all', { method: 'POST' })
};
