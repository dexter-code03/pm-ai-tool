import type { PrdSection } from './prdSection';

const TOKEN_KEY = 'pm_ai_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function baseUrl() {
  return import.meta.env.VITE_API_URL || '';
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${baseUrl()}${path}`, { ...options, headers });
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const d = data as { error?: string; detail?: string };
    const base = d.error || res.statusText || 'Request failed';
    const msg = d.detail ? `${base} — ${d.detail}` : base;
    throw new Error(msg);
  }
  return data as T;
}

/** Same as apiRequest but returns status + parsed body for non-2xx handling (e.g. OAuth 503). */
export async function apiRequestRaw(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${baseUrl()}${path}`, { ...options, headers });
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

export type PrdRow = {
  id: string;
  title: string;
  status: string;
  content?: unknown;
  updatedAt?: string;
};

export type WireframeScreen = {
  id: string;
  title?: string | null;
  order: number;
  screenshotUrl?: string | null;
  htmlUrl?: string | null;
  prompt?: string | null;
  figmaExportUrl?: string | null;
  prototypeData?: string | null;
};

export type WireframeLink = {
  prd: { id: string; title: string; status: string };
};

export type WireframeListItem = {
  id: string;
  title: string;
  status: string;
  deviceType: string;
  updatedAt: string;
  stitchProjectId?: string | null;
  flowGraph?: string | null;
  screens: WireframeScreen[];
  links: { prd: { id: string; title: string; status: string } }[];
};

export type IntegrationSummary = {
  id?: string;
  provider: string;
  isConnected: boolean;
  hasKey?: boolean;
  model?: string | null;
  deviceType?: string | null;
  webhookUrl?: string | null;
  updatedAt?: string;
};

export type IntegrationPutBody = {
  apiKey?: string;
  model?: string;
  deviceType?: string;
  webhookUrl?: string;
  accessToken?: string;
  sendgridKey?: string;
  fromEmail?: string;
  smtpHost?: string;
  baseUrl?: string;
  spaceKey?: string;
  parentPageId?: string;
  databaseId?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
  publicAppUrl?: string;
};

export type UserPreferences = Record<string, unknown>;

export type OAuthAuthResponse = {
  configured?: boolean;
  authorizationUrl?: string;
  error?: string;
  hint?: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  body?: string;
  read: boolean;
  createdAt: string;
  type?: string;
};

export type VersionItem = {
  id: string;
  label?: string;
  createdAt: string;
  userId?: string;
  user?: { name: string };
  snapshot?: unknown;
};

export type CommentItem = {
  id: string;
  text: string;
  sectionId?: string;
  createdAt: string;
  userId: string;
  user?: { name: string; email: string };
  resolved?: boolean;
};

/** POST /api/v1/prds/generate — OpenAI streams SSE; other providers return JSON `{ prd }`. */
export async function generatePrd(body: {
  brief?: string;
  templateHint?: string;
  jiraContext?: unknown;
}): Promise<{ prd: PrdRow }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${baseUrl()}/api/v1/prds/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const ct = res.headers.get('Content-Type') || '';
  if (ct.includes('text/event-stream')) {
    const text = await res.text();
    if (!res.ok) {
      try {
        const j = JSON.parse(text) as { error?: string };
        throw new Error(j.error || 'Generation failed');
      } catch (e) {
        if (e instanceof Error && e.message !== 'Generation failed') throw e;
        throw new Error('Generation failed');
      }
    }
    const lines = text.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line.startsWith('data: ')) continue;
      try {
        const payload = JSON.parse(line.slice(6)) as { type?: string; prd?: PrdRow };
        if (payload.type === 'done' && payload.prd) return { prd: payload.prd };
      } catch {
        /* next */
      }
    }
    throw new Error('Generation completed without PRD payload');
  }
  const data = (await res.json().catch(() => ({}))) as { prd?: PrdRow; error?: string };
  if (!res.ok) throw new Error(data.error || 'Generation failed');
  if (!data.prd) throw new Error('Invalid response');
  return { prd: data.prd };
}

export const api = {
  login: (body: { email: string; password: string }) =>
    apiRequest<{ token: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  me: () => apiRequest<{ user: import('@pm-ai-tool/shared').UserDto }>('/api/v1/me'),
  getPrds: () => apiRequest<{ prds: PrdRow[] }>('/api/v1/prds'),
  getPrd: (id: string) => apiRequest<{ prd: PrdRow }>(`/api/v1/prds/${id}`),
  createPrd: (body: { title?: string; content?: PrdSection[]; status?: string }) =>
    apiRequest<{ prd: PrdRow }>('/api/v1/prds', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  patchPrd: (
    id: string,
    body: { title?: string; content?: PrdSection[]; status?: string }
  ) =>
    apiRequest<{ prd: PrdRow }>(`/api/v1/prds/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    }),
  health: () => apiRequest<{ ok: boolean }>('/health'),
  presignUpload: (body: { contentType?: string; prefix?: string }) =>
    apiRequest<{ uploadUrl: string; key: string; publicUrl: string | null }>('/api/v1/uploads/presign', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  listWireframes: () => apiRequest<{ wireframes: WireframeListItem[] }>('/api/v1/wireframes'),
  getWireframe: (id: string) => apiRequest<{ wireframe: WireframeListItem }>(`/api/v1/wireframes/${id}`),
  generateWireframeFromPrd: (body: { prdId?: string; prdIds?: string[]; deviceType?: string }) =>
    apiRequest<{ wireframe: WireframeListItem }>('/api/v1/wireframes/generate-from-prd', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  generateWireframeStandalone: (body: {
    title?: string;
    brief: string;
    deviceType?: string;
  }) =>
    apiRequest<{ wireframe: WireframeListItem }>('/api/v1/wireframes/generate-standalone', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  deleteWireframe: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/v1/wireframes/${id}`, { method: 'DELETE' }),
  editWireframeScreen: (wireframeId: string, body: { screenId: string; instruction: string }) =>
    apiRequest<{ screen: WireframeScreen }>(`/api/v1/wireframes/${wireframeId}/edit-screen`, {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  syncStitchScreens: (wireframeId: string) =>
    apiRequest<{ wireframe: WireframeListItem }>(`/api/v1/wireframes/${wireframeId}/sync-stitch`, {
      method: 'POST'
    }),
  getWireframeProgress: (wireframeId: string) =>
    apiRequest<{ generating: boolean; step: number; total: number; detail: string }>(`/api/v1/wireframes/${wireframeId}/progress`),
  updateFlowGraph: (wireframeId: string, flowGraph: unknown) =>
    apiRequest<{ wireframe: WireframeListItem }>(`/api/v1/wireframes/${wireframeId}/flow-graph`, {
      method: 'PUT',
      body: JSON.stringify({ flowGraph })
    }),

  getIntegrations: () =>
    apiRequest<{ integrations: Record<string, IntegrationSummary> }>('/api/v1/settings/integrations'),
  putIntegration: (provider: string, body: IntegrationPutBody) =>
    apiRequest<{ integration: Partial<IntegrationSummary> & { provider: string; isConnected: boolean } }>(
      `/api/v1/settings/integrations/${encodeURIComponent(provider)}`,
      { method: 'PUT', body: JSON.stringify(body) }
    ),
  deleteIntegration: (provider: string) =>
    apiRequest<{ success: boolean }>(`/api/v1/settings/integrations/${encodeURIComponent(provider)}`, {
      method: 'DELETE'
    }),
  testIntegration: (provider: string) =>
    apiRequest<{ success: boolean; message?: string }>(
      `/api/v1/settings/integrations/${encodeURIComponent(provider)}/test`,
      { method: 'POST' }
    ),
  getPreferences: () => apiRequest<{ preferences: UserPreferences }>('/api/v1/settings/preferences'),
  putPreferences: (body: UserPreferences) =>
    apiRequest<{ preferences: UserPreferences }>('/api/v1/settings/preferences', {
      method: 'PUT',
      body: JSON.stringify(body)
    }),

  getJiraAuth: () => apiRequestRaw('/api/v1/integrations/jira/auth', { method: 'GET' }),
  getFigmaAuth: () => apiRequestRaw('/api/v1/integrations/figma/auth', { method: 'GET' }),
  getGoogleAuth: () => apiRequestRaw('/api/v1/integrations/google/auth', { method: 'GET' }),

  getPrdWireframes: (prdId: string) =>
    apiRequest<{ wireframes: WireframeListItem[] }>(`/api/v1/prds/${encodeURIComponent(prdId)}/wireframes`),

  getNotifications: async () => {
    const data = await apiRequest<{ notifications: Array<{ id: string; title: string; message: string; read: boolean; createdAt: string; type?: string }> }>('/api/v1/notifications');
    return { notifications: (data.notifications || []).map((n) => ({ ...n, body: n.message })) as NotificationItem[] };
  },
  markNotificationRead: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    apiRequest<{ success: boolean }>('/api/v1/notifications/read-all', { method: 'POST' }),

  regenerateSection: (prdId: string, body: { sectionId: string; hint?: string }) =>
    apiRequest<{ section: unknown }>(`/api/v1/prds/${encodeURIComponent(prdId)}/regenerate-section`, {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  aiAssist: (prdId: string, body: { action: string; sectionId?: string; text?: string }) =>
    apiRequest<{ result: string; section?: unknown }>(`/api/v1/prds/${encodeURIComponent(prdId)}/ai-assist`, {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  getVersions: (prdId: string) =>
    apiRequest<{ versions: VersionItem[] }>(`/api/v1/prds/${encodeURIComponent(prdId)}/versions`),
  createVersion: (prdId: string, body: { label?: string }) =>
    apiRequest<{ version: VersionItem }>(`/api/v1/prds/${encodeURIComponent(prdId)}/versions`, {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  restoreVersion: (prdId: string, vid: string) =>
    apiRequest<{ prd: PrdRow }>(`/api/v1/prds/${encodeURIComponent(prdId)}/versions/${encodeURIComponent(vid)}/restore`, {
      method: 'POST'
    }),

  getComments: async (prdId: string) => {
    const data = await apiRequest<{ comments: Array<{ id: string; content: string; sectionId?: string; createdAt: string; userId: string; user?: { name: string; email: string }; status?: string }> }>(`/api/v1/prds/${encodeURIComponent(prdId)}/comments`);
    return { comments: (data.comments || []).map((c) => ({ ...c, text: c.content, resolved: c.status === 'resolved' })) as CommentItem[] };
  },
  createComment: (prdId: string, body: { text: string; sectionId?: string }) =>
    apiRequest<{ comment: CommentItem }>(`/api/v1/prds/${encodeURIComponent(prdId)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: body.text, sectionId: body.sectionId })
    }),

  exportPrd: (prdId: string, format: string) =>
    apiRequest<{ url?: string; content?: string; html?: string }>(`/api/v1/prds/${encodeURIComponent(prdId)}/export/${encodeURIComponent(format)}`)
};
