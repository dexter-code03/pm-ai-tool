import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type IntegrationPutBody, type OAuthAuthResponse, type UserPreferences } from '../lib/api';
import { useIntegrationStatus } from '../hooks/useIntegrationStatus';
import { useTheme } from '../hooks/useTheme';

type LlmProvider = 'OPENAI' | 'CLAUDE' | 'GEMINI' | 'CUSTOM';

function Section({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6 rounded-xl border p-5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[1.2px]" style={{ color: 'var(--text-muted)' }}>{title}</h2>
      {children}
    </section>
  );
}

export function SettingsPage() {
  const { integrations, loading, error, refresh } = useIntegrationStatus();
  const { setTheme: applyTheme } = useTheme();
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  const [oauthBusy, setOauthBusy] = useState<'jira' | 'figma' | 'google' | null>(null);

  const loadPrefs = useCallback(async () => {
    try {
      const data = await api.getPreferences();
      setPrefs(data.preferences || {});
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load preferences');
    } finally {
      setPrefsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadPrefs();
  }, [loadPrefs]);

  useEffect(() => {
    const j = searchParams.get('jira');
    const f = searchParams.get('figma');
    const g = searchParams.get('google');
    if (j === 'connected' || f === 'connected' || g === 'connected') {
      setMsg('Integration connected. You can continue here.');
      void refresh();
      setSearchParams({}, { replace: true });
    }
    if (j === 'error' || f === 'error' || g === 'error') {
      const m = searchParams.get('message');
      setErr(m || 'OAuth failed');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, refresh]);

  async function savePrefs(next: UserPreferences) {
    setErr('');
    try {
      const data = await api.putPreferences(next);
      setPrefs(data.preferences || {});
      setMsg('Preferences saved');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    }
  }

  async function connectJira() {
    setOauthBusy('jira');
    setErr('');
    try {
      const r = await api.getJiraAuth();
      const d = r.data as OAuthAuthResponse;
      if (r.ok && d.configured && d.authorizationUrl) {
        window.location.href = d.authorizationUrl;
        return;
      }
      setErr(d.error || d.hint || 'Jira OAuth is not configured on the server.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Jira auth failed');
    } finally {
      setOauthBusy(null);
    }
  }

  async function connectFigma() {
    setOauthBusy('figma');
    setErr('');
    try {
      const r = await api.getFigmaAuth();
      const d = r.data as OAuthAuthResponse;
      if (r.ok && d.configured && d.authorizationUrl) {
        window.location.href = d.authorizationUrl;
        return;
      }
      setErr(d.error || d.hint || 'Figma OAuth is not configured on the server.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Figma auth failed');
    } finally {
      setOauthBusy(null);
    }
  }

  async function connectGoogle() {
    setOauthBusy('google');
    setErr('');
    try {
      const r = await api.getGoogleAuth();
      const d = r.data as OAuthAuthResponse;
      if (r.ok && d.configured && d.authorizationUrl) {
        window.location.href = d.authorizationUrl;
        return;
      }
      setErr(d.error || d.hint || 'Google OAuth is not configured on the server.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Google auth failed');
    } finally {
      setOauthBusy(null);
    }
  }

  return (
    <div className="max-w-3xl animate-fade-in">
      <h1 className="mb-2 font-heading text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
      <p className="mb-6 text-sm" style={{ color: 'var(--text-muted)' }}>
        API keys and integrations are stored for your account. OAuth apps (Jira, Figma, Google) must be configured by
        an admin via environment variables on the server.
      </p>

      {msg ? (
        <p className="mb-4 rounded-lg border px-3.5 py-2.5 text-sm" style={{ background: 'var(--green-dim)', borderColor: 'rgba(34,197,94,0.2)', color: 'var(--green)' }}>
          {msg}
        </p>
      ) : null}
      {(error || err) ? (
        <p className="mb-4 rounded-lg border px-3.5 py-2.5 text-sm" style={{ background: 'var(--red-dim)', borderColor: 'rgba(239,68,68,0.2)', color: 'var(--red)' }}>
          {err || error}
        </p>
      ) : null}

      {loading ? <p style={{ color: 'var(--text-muted)' }}>Loading integrations…</p> : null}

      <Section title="Preferences">
        {prefsLoaded && prefs ? (
          <div className="space-y-3">
            <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>
              Theme
              <select
                className="mt-1 w-full rounded border px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                value={String(prefs.theme || 'system')}
                onChange={(e) => {
                  const theme = e.target.value as 'system' | 'light' | 'dark';
                  setPrefs({ ...prefs, theme });
                  void applyTheme(theme);
                }}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>
              Preferred AI provider
              <select
                className="mt-1 w-full rounded border px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                value={String(prefs.preferredAiProvider || '')}
                onChange={(e) => {
                  const preferredAiProvider = e.target.value || undefined;
                  const next = { ...prefs, preferredAiProvider };
                  setPrefs(next);
                  void savePrefs(next);
                }}
              >
                <option value="">Auto (first connected)</option>
                <option value="openai">OpenAI</option>
                <option value="claude">Claude</option>
                <option value="gemini">Gemini</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>
              Autosave interval (ms)
              <input
                type="number"
                min={200}
                max={60000}
                step={100}
                className="mt-1 w-full rounded border px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                value={Number(prefs.autoSaveInterval ?? 2000)}
                onChange={(e) => setPrefs({ ...prefs, autoSaveInterval: Number(e.target.value) })}
                onBlur={() => void savePrefs({ ...prefs })}
              />
            </label>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
        )}
      </Section>

      <Section title="Language models">
        <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          Add at least one provider to generate PRDs and wireframes. Keys are never shown back from the server — only
          replaced when you save a new value.
        </p>
        <div className="space-y-6">
          <LlmBlock
            title="OpenAI"
            provider="OPENAI"
            integration={integrations?.openai}
            onSaved={refresh}
          />
          <LlmBlock
            title="Anthropic Claude"
            provider="CLAUDE"
            integration={integrations?.claude}
            onSaved={refresh}
          />
          <LlmBlock
            title="Google Gemini"
            provider="GEMINI"
            integration={integrations?.gemini}
            onSaved={refresh}
          />
          <CustomLlmBlock integration={integrations?.custom} onSaved={refresh} />
        </div>
      </Section>

      <Section title="Wireframes (Stitch)">
        <StitchBlock integration={integrations?.stitch} onSaved={refresh} />
      </Section>

      <Section title="Slack">
        <SlackBlock integration={integrations?.slack} onSaved={refresh} />
      </Section>

      <Section title="Microsoft Teams">
        <TeamsBlock integration={integrations?.teams} onSaved={refresh} />
      </Section>

      <Section title="Confluence & Notion">
        <ConfluenceBlock integration={integrations?.confluence} onSaved={refresh} />
        <div className="mt-6">
          <NotionBlock integration={integrations?.notion} onSaved={refresh} />
        </div>
      </Section>

      <Section title="Email (SMTP / SendGrid)">
        <EmailBlock integration={integrations?.email} onSaved={refresh} />
      </Section>

      <Section title="Workspace Roles">
        <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          Manage team member access levels. Admins can change settings and integrations. Editors can create and modify PRDs. Viewers have read-only access.
        </p>
        <div className="space-y-2.5">
          {[
            { name: 'Demo User', email: 'demo@pm-ai-tool.local', role: 'Admin', color: 'linear-gradient(135deg, #5B7EF8, #2DD4B7)' },
            { name: 'Sarah K.', email: 'sarah@pm-ai-tool.local', role: 'Editor', color: 'linear-gradient(135deg, #2DD4B7, #5B7EF8)' },
            { name: 'Alex M.', email: 'alex@pm-ai-tool.local', role: 'Editor', color: 'linear-gradient(135deg, #5B7EF8, #7C5BF8)' },
            { name: 'Jordan L.', email: 'jordan@pm-ai-tool.local', role: 'Viewer', color: 'linear-gradient(135deg, #F59E0B, #EF4444)' },
          ].map((member) => (
            <div key={member.email} className="flex items-center gap-3 rounded-xl border p-3" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: member.color }}>
                {member.name.split(' ').map((w) => w[0]).join('')}
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{member.name}</div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{member.email}</div>
              </div>
              <select
                className="rounded border px-2 py-1 text-xs outline-none"
                style={{ background: 'var(--bg-active)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                defaultValue={member.role}
              >
                <option value="Admin">Admin</option>
                <option value="Editor">Editor</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-all hover:bg-[var(--bg-hover)]"
          style={{ borderColor: 'var(--border)', color: 'var(--indigo)', background: 'var(--bg-elevated)' }}
        >
          + Invite Member
        </button>
      </Section>

      <Section title="Jira, Figma & Google (OAuth)">
        <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          Uses server OAuth client credentials. If the button does nothing useful, ask an admin to set env vars (see server logs).
        </p>
        <div className="grid grid-cols-3 gap-3">
          {([
            { label: 'Jira', icon: '🔗', key: 'jira' as const, connected: integrations?.jira?.isConnected, handler: connectJira },
            { label: 'Figma', icon: '🎨', key: 'figma' as const, connected: integrations?.figma?.isConnected, handler: connectFigma },
            { label: 'Google SSO', icon: '🔐', key: 'google' as const, connected: integrations?.google?.isConnected, handler: connectGoogle },
          ]).map((item) => (
            <div key={item.key} className="rounded-xl border p-4 transition-all hover:border-[var(--border-light)]" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
              </div>
              <div className="mb-3 flex items-center gap-1.5 text-xs">
                <span className="h-[7px] w-[7px] rounded-full" style={{ background: item.connected ? 'var(--green)' : 'var(--text-muted)' }} />
                <span style={{ color: item.connected ? 'var(--green)' : 'var(--text-muted)' }}>
                  {item.connected ? 'Connected' : 'Not connected'}
                </span>
              </div>
              <button
                type="button"
                disabled={oauthBusy !== null}
                onClick={() => void item.handler()}
                className="w-full rounded-lg px-3 py-1.5 text-[13px] font-medium text-white transition-all hover:-translate-y-px disabled:opacity-50"
                style={{ background: item.connected ? 'var(--green)' : 'var(--indigo)', boxShadow: `0 2px 8px ${item.connected ? 'rgba(34,197,94,0.3)' : 'rgba(91,126,248,0.3)'}` }}
              >
                {oauthBusy === item.key ? 'Redirecting…' : item.connected ? '✓ Connected' : `Connect ${item.label}`}
              </button>
            </div>
          ))}
        </div>
      </Section>

      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        <Link to="/" className="font-medium hover:underline" style={{ color: 'var(--indigo)' }}>
          ← Back to dashboard
        </Link>
      </p>
    </div>
  );
}

const MODEL_OPTIONS: Record<string, { label: string; value: string }[]> = {
  OPENAI: [
    { label: 'GPT-4o (recommended)', value: 'gpt-4o' },
    { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
    { label: 'o1', value: 'o1' },
    { label: 'o1-mini', value: 'o1-mini' },
    { label: 'o3-mini', value: 'o3-mini' },
  ],
  CLAUDE: [
    { label: 'Claude Sonnet 4 (recommended)', value: 'claude-sonnet-4-20250514' },
    { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
    { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-20241022' },
    { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
  ],
  GEMINI: [
    { label: 'Gemini 2.5 Flash (recommended)', value: 'gemini-2.5-flash' },
    { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
    { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
    { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
    { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
  ],
};

const inputStyle = { background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' };
const inputCls = 'mt-1 w-full rounded border px-3 py-2 text-sm outline-none';

function LlmBlock({
  title,
  provider,
  integration,
  onSaved
}: {
  title: string;
  provider: LlmProvider;
  integration?: { isConnected?: boolean; model?: string | null };
  onSaved: () => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(integration?.model || '');
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState('');

  useEffect(() => {
    setModel(integration?.model || '');
  }, [integration?.model]);

  async function save() {
    setBusy(true);
    setLocalErr('');
    try {
      const body: IntegrationPutBody = {};
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      if (model.trim()) body.model = model.trim();
      await api.putIntegration(provider, body);
      setApiKey('');
      onSaved();
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function testConn() {
    setBusy(true);
    setLocalErr('');
    try {
      await api.testIntegration(provider);
      setLocalErr('');
      alert('Connection OK');
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Test failed');
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!confirm(`Disconnect ${title}?`)) return;
    setBusy(true);
    setLocalErr('');
    try {
      await api.deleteIntegration(provider);
      setApiKey('');
      onSaved();
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  const models = MODEL_OPTIONS[provider] || [];

  return (
    <div className="rounded-xl border p-4" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</span>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: integration?.isConnected ? 'var(--green)' : 'var(--text-muted)' }}>
          <span className="h-[7px] w-[7px] rounded-full" style={{ background: integration?.isConnected ? 'var(--green)' : 'var(--text-muted)' }} />
          {integration?.isConnected ? 'Connected' : 'Not connected'}
        </span>
      </div>
      <label className="mb-2 block text-xs" style={{ color: 'var(--text-muted)' }}>
        API key
        <input
          type="password"
          autoComplete="off"
          className={inputCls}
          style={inputStyle}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={integration?.isConnected ? '•••••••• (enter to replace)' : 'sk-…'}
        />
      </label>
      <label className="mb-2 block text-xs" style={{ color: 'var(--text-muted)' }}>
        Model
        {models.length > 0 ? (
          <select className={inputCls} style={inputStyle} value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="">Default</option>
            {models.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        ) : (
          <input className={inputCls} style={inputStyle} value={model} onChange={(e) => setModel(e.target.value)} placeholder="model-name" />
        )}
      </label>
      {localErr ? <p className="mb-2 text-xs" style={{ color: 'var(--red)' }}>{localErr}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => void save()} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--indigo)' }}>Save</button>
        <button type="button" disabled={busy || !integration?.isConnected} onClick={() => void testConn()} className="rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}>Test</button>
        <button type="button" disabled={busy || !integration?.isConnected} onClick={() => void disconnect()} className="rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'transparent' }}>Disconnect</button>
      </div>
    </div>
  );
}

function CustomLlmBlock({
  integration,
  onSaved
}: {
  integration?: { isConnected?: boolean; model?: string | null };
  onSaved: () => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState('');

  async function save() {
    setBusy(true);
    setLocalErr('');
    try {
      const body: IntegrationPutBody = {
        baseUrl: baseUrl.trim(),
        model: model.trim() || 'default'
      };
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      await api.putIntegration('CUSTOM', body);
      setApiKey('');
      onSaved();
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function testConn() {
    setBusy(true);
    setLocalErr('');
    try {
      await api.testIntegration('CUSTOM');
      alert('Connection OK');
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Test failed');
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!confirm('Disconnect custom LLM?')) return;
    setBusy(true);
    try {
      await api.deleteIntegration('CUSTOM');
      setBaseUrl('');
      setModel('');
      setApiKey('');
      onSaved();
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border p-4" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Custom OpenAI-compatible API</span>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: integration?.isConnected ? 'var(--green)' : 'var(--text-muted)' }}>
          <span className="h-[7px] w-[7px] rounded-full" style={{ background: integration?.isConnected ? 'var(--green)' : 'var(--text-muted)' }} />
          {integration?.isConnected ? 'Connected' : 'Not connected'}
        </span>
      </div>
      <label className="mb-2 block text-xs" style={{ color: 'var(--text-muted)' }}>Base URL<input className={inputCls} style={inputStyle} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com/v1" /></label>
      <label className="mb-2 block text-xs" style={{ color: 'var(--text-muted)' }}>API key<input type="password" autoComplete="off" className={inputCls} style={inputStyle} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Bearer token" /></label>
      <label className="mb-2 block text-xs" style={{ color: 'var(--text-muted)' }}>Model id<input className={inputCls} style={inputStyle} value={model} onChange={(e) => setModel(e.target.value)} placeholder="default" /></label>
      {localErr ? <p className="mb-2 text-xs" style={{ color: 'var(--red)' }}>{localErr}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => void save()} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--indigo)' }}>Save</button>
        <button type="button" disabled={busy || !integration?.isConnected} onClick={() => void testConn()} className="rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}>Test</button>
        <button type="button" disabled={busy || !integration?.isConnected} onClick={() => void disconnect()} className="rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'transparent' }}>Disconnect</button>
      </div>
    </div>
  );
}

function StitchBlock({
  integration,
  onSaved
}: {
  integration?: { isConnected?: boolean };
  onSaved: () => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState('');

  async function save() {
    setBusy(true);
    setLocalErr('');
    try {
      const body: IntegrationPutBody = {};
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      await api.putIntegration('STITCH', body);
      setApiKey('');
      onSaved();
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function testConn() {
    setBusy(true);
    setLocalErr('');
    try {
      await api.testIntegration('STITCH');
      alert('Stitch OK');
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Test failed');
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!confirm('Remove Stitch key?')) return;
    setBusy(true);
    try {
      await api.deleteIntegration('STITCH');
      setApiKey('');
      onSaved();
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Optional: Enables visual screen generation via Google Stitch. Without it, AI-only wireframe specs are generated. Get a key from Google Stitch / your admin.
      </p>
      <label className="mb-2 block text-xs" style={{ color: 'var(--text-muted)' }}>
        Stitch API key
        <input
          type="password"
          autoComplete="off"
          className={inputCls}
          style={inputStyle}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={integration?.isConnected ? '••••••••' : ''}
        />
      </label>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{integration?.isConnected ? '● Configured' : '○ Not configured'}</div>
      {localErr ? <p className="mt-2 text-xs" style={{ color: 'var(--red)' }}>{localErr}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--indigo)' }}
        >
          Save
        </button>
        <button
          type="button"
          disabled={busy || !integration?.isConnected}
          onClick={() => void testConn()}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}
        >
          Test
        </button>
        <button
          type="button"
          disabled={busy || !integration?.isConnected}
          onClick={() => void disconnect()}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'transparent' }}
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

function SlackBlock({
  integration,
  onSaved
}: {
  integration?: { isConnected?: boolean; webhookUrl?: string | null };
  onSaved: () => void;
}) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState('');

  async function save() {
    setBusy(true);
    setLocalErr('');
    try {
      await api.putIntegration('SLACK', { webhookUrl: webhookUrl.trim() });
      setWebhookUrl('');
      onSaved();
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function testConn() {
    setBusy(true);
    setLocalErr('');
    try {
      await api.testIntegration('SLACK');
      alert('Slack webhook OK');
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Test failed');
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!confirm('Remove Slack webhook?')) return;
    setBusy(true);
    try {
      await api.deleteIntegration('SLACK');
      onSaved();
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="mb-2 block text-xs" style={{ color: 'var(--text-muted)' }}>
        Incoming webhook URL
        <input
          className={inputCls}
          style={inputStyle}
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder={integration?.webhookUrl || 'https://hooks.slack.com/…'}
        />
      </label>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{integration?.isConnected ? '● Configured' : '○ Not configured'}</div>
      {localErr ? <p className="mt-2 text-xs" style={{ color: 'var(--red)' }}>{localErr}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--indigo)' }}
        >
          Save
        </button>
        <button
          type="button"
          disabled={busy || !integration?.isConnected}
          onClick={() => void testConn()}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}
        >
          Test
        </button>
        <button
          type="button"
          disabled={busy || !integration?.isConnected}
          onClick={() => void disconnect()}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'transparent' }}
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

function TeamsBlock({
  integration,
  onSaved
}: {
  integration?: { isConnected?: boolean; webhookUrl?: string | null };
  onSaved: () => void;
}) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState('');

  async function save() {
    setBusy(true);
    setLocalErr('');
    try {
      await api.putIntegration('TEAMS', { webhookUrl: webhookUrl.trim() });
      setWebhookUrl('');
      onSaved();
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function testConn() {
    setBusy(true);
    setLocalErr('');
    try {
      await api.testIntegration('TEAMS');
      alert('Teams webhook OK');
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Test failed');
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!confirm('Remove Teams webhook?')) return;
    setBusy(true);
    try {
      await api.deleteIntegration('TEAMS');
      onSaved();
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Paste a Microsoft Teams incoming webhook URL (same pattern as Slack). Graph API / bot features are roadmap.
      </p>
      <label className="mb-2 block text-xs" style={{ color: 'var(--text-muted)' }}>
        Incoming webhook URL
        <input
          className={inputCls}
          style={inputStyle}
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder={integration?.webhookUrl || 'https://…office.com/webhook/…'}
        />
      </label>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{integration?.isConnected ? '● Configured' : '○ Not configured'}</div>
      {localErr ? <p className="mt-2 text-xs" style={{ color: 'var(--red)' }}>{localErr}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--indigo)' }}
        >
          Save
        </button>
        <button
          type="button"
          disabled={busy || !integration?.isConnected}
          onClick={() => void testConn()}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}
        >
          Test
        </button>
        <button
          type="button"
          disabled={busy || !integration?.isConnected}
          onClick={() => void disconnect()}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'transparent' }}
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

function ConfluenceBlock({
  integration,
  onSaved
}: {
  integration?: { isConnected?: boolean };
  onSaved: () => void;
}) {
  const [accessToken, setAccessToken] = useState('');
  const [spaceKey, setSpaceKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState('');

  async function save() {
    setBusy(true);
    setLocalErr('');
    try {
      const body: IntegrationPutBody = { spaceKey: spaceKey.trim() };
      if (accessToken.trim()) body.accessToken = accessToken.trim();
      await api.putIntegration('CONFLUENCE', body);
      setAccessToken('');
      onSaved();
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!confirm('Disconnect Confluence?')) return;
    setBusy(true);
    try {
      await api.deleteIntegration('CONFLUENCE');
      setSpaceKey('');
      onSaved();
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Confluence</h3>
      <label className="mb-2 block text-xs" style={{ color: 'var(--text-muted)' }}>
        Access token
        <input
          type="password"
          autoComplete="off"
          className={inputCls}
          style={inputStyle}
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder={integration?.isConnected ? '••••••••' : ''}
        />
      </label>
      <label className="mb-2 block text-xs" style={{ color: 'var(--text-muted)' }}>
        Space key
        <input
          className={inputCls}
          style={inputStyle}
          value={spaceKey}
          onChange={(e) => setSpaceKey(e.target.value)}
        />
      </label>
      {localErr ? <p className="mb-2 text-xs" style={{ color: 'var(--red)' }}>{localErr}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--indigo)' }}
        >
          Save
        </button>
        <button
          type="button"
          disabled={busy || !integration?.isConnected}
          onClick={() => void disconnect()}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'transparent' }}
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

function NotionBlock({
  integration,
  onSaved
}: {
  integration?: { isConnected?: boolean };
  onSaved: () => void;
}) {
  const [accessToken, setAccessToken] = useState('');
  const [parentPageId, setParentPageId] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState('');

  async function save() {
    setBusy(true);
    setLocalErr('');
    try {
      const body: IntegrationPutBody = {
        parentPageId: parentPageId.trim(),
        databaseId: databaseId.trim()
      };
      if (accessToken.trim()) body.accessToken = accessToken.trim();
      await api.putIntegration('NOTION', body);
      setAccessToken('');
      onSaved();
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!confirm('Disconnect Notion?')) return;
    setBusy(true);
    try {
      await api.deleteIntegration('NOTION');
      setParentPageId('');
      setDatabaseId('');
      onSaved();
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Notion</h3>
      <label className="mb-2 block text-xs" style={{ color: 'var(--text-muted)' }}>
        Internal integration token
        <input
          type="password"
          autoComplete="off"
          className={inputCls}
          style={inputStyle}
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
        />
      </label>
      <label className="mb-2 block text-xs" style={{ color: 'var(--text-muted)' }}>
        Parent page ID (optional if using database)
        <input
          className={inputCls}
          style={inputStyle}
          value={parentPageId}
          onChange={(e) => setParentPageId(e.target.value)}
        />
      </label>
      <label className="mb-2 block text-xs" style={{ color: 'var(--text-muted)' }}>
        Database ID (optional)
        <input
          className={inputCls}
          style={inputStyle}
          value={databaseId}
          onChange={(e) => setDatabaseId(e.target.value)}
        />
      </label>
      {localErr ? <p className="mb-2 text-xs" style={{ color: 'var(--red)' }}>{localErr}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--indigo)' }}
        >
          Save
        </button>
        <button
          type="button"
          disabled={busy || !integration?.isConnected}
          onClick={() => void disconnect()}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'transparent' }}
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

function EmailBlock({
  integration,
  onSaved
}: {
  integration?: { isConnected?: boolean };
  onSaved: () => void;
}) {
  const [sendgridKey, setSendgridKey] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState('');

  async function save() {
    setBusy(true);
    setLocalErr('');
    try {
      const body: IntegrationPutBody = {
        fromEmail: fromEmail.trim(),
        smtpHost: smtpHost.trim()
      };
      if (sendgridKey.trim()) body.sendgridKey = sendgridKey.trim();
      await api.putIntegration('EMAIL', body);
      setSendgridKey('');
      onSaved();
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!confirm('Clear email integration?')) return;
    setBusy(true);
    try {
      await api.deleteIntegration('EMAIL');
      setFromEmail('');
      setSmtpHost('');
      onSaved();
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="mb-2 block text-xs" style={{ color: 'var(--text-muted)' }}>
        SendGrid API key (optional)
        <input
          type="password"
          autoComplete="off"
          className={inputCls}
          style={inputStyle}
          value={sendgridKey}
          onChange={(e) => setSendgridKey(e.target.value)}
        />
      </label>
      <label className="mb-2 block text-xs" style={{ color: 'var(--text-muted)' }}>
        From email
        <input
          className={inputCls}
          style={inputStyle}
          value={fromEmail}
          onChange={(e) => setFromEmail(e.target.value)}
        />
      </label>
      <label className="mb-2 block text-xs" style={{ color: 'var(--text-muted)' }}>
        SMTP host (optional)
        <input
          className={inputCls}
          style={inputStyle}
          value={smtpHost}
          onChange={(e) => setSmtpHost(e.target.value)}
        />
      </label>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{integration?.isConnected ? '● Configured' : '○ Not configured'}</div>
      {localErr ? <p className="mt-2 text-xs" style={{ color: 'var(--red)' }}>{localErr}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--indigo)' }}
        >
          Save
        </button>
        <button
          type="button"
          disabled={busy || !integration?.isConnected}
          onClick={() => void disconnect()}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'transparent' }}
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
