import { prisma } from '../lib/prisma.js';
import { fromJson } from '../lib/json.js';

const TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
const RESOURCE_URL = 'https://api.atlassian.com/oauth/token/accessible-resources';

/**
 * @param {object} params
 * @param {string} params.code
 * @param {string} params.redirectUri
 */
export async function exchangeAuthorizationCode({ code, redirectUri }) {
  const clientId = process.env.JIRA_CLIENT_ID;
  const clientSecret = process.env.JIRA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('JIRA_CLIENT_ID and JIRA_CLIENT_SECRET must be set');
  }
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.error || `oauth token ${res.status}`);
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in ?? 3600
  };
}

/**
 * @param {string} refreshToken
 */
export async function refreshAccessToken(refreshToken) {
  const clientId = process.env.JIRA_CLIENT_ID;
  const clientSecret = process.env.JIRA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('JIRA_CLIENT_ID and JIRA_CLIENT_SECRET must be set');
  }
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.error || `oauth refresh ${res.status}`);
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in ?? 3600
  };
}

/**
 * @param {string} accessToken
 */
export async function fetchAccessibleResources(accessToken) {
  const res = await fetch(RESOURCE_URL, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
  });
  const data = await res.json().catch(() => []);
  if (!res.ok) {
    throw new Error(`accessible-resources ${res.status}`);
  }
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No Atlassian Cloud sites accessible for this token');
  }
  return data;
}

/**
 * @param {object} cfg
 * @param {string} cfg.accessToken
 * @param {string} cfg.cloudId
 * @param {string} issueKey
 */
export async function fetchJiraIssue({ accessToken, cloudId }, issueKey) {
  const key = encodeURIComponent(issueKey);
  const url = `https://api.atlassian.com/ex/jira/${encodeURIComponent(
    cloudId
  )}/rest/api/3/issue/${key}?fields=summary,description`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.errorMessages?.join('; ') || data.message || `Jira ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/**
 * @param {string} userId
 */
export async function getJiraConfigForUser(userId) {
  const row = await prisma.integrationConfig.findUnique({
    where: {
      userId_provider: { userId, provider: 'JIRA' }
    }
  });
  if (!row) return null;
  const cfg = fromJson(row.configEncrypted, {});
  if (!cfg.accessToken) return null;
  return { row, cfg };
}

/**
 * Persist refreshed tokens + return updated config.
 * @param {string} userId
 * @param {object} cfg
 */
export async function persistJiraTokens(userId, cfg) {
  const data = {
    configEncrypted: cfg,
    isConnected: true,
    updatedAt: new Date()
  };
  await prisma.integrationConfig.upsert({
    where: { userId_provider: { userId, provider: 'JIRA' } },
    create: {
      userId,
      provider: 'JIRA',
      ...data
    },
    update: data
  });
  return cfg;
}

/**
 * Ensures access token is valid; refreshes if expired.
 * @param {string} userId
 * @returns {Promise<{ accessToken: string, cloudId: string } | null>}
 */
export async function getValidJiraAccess(userId) {
  const got = await getJiraConfigForUser(userId);
  if (!got) return null;
  let { cfg } = got;
  const expiresAt = cfg.expiresAt ? Number(cfg.expiresAt) : 0;
  const now = Date.now() / 1000;
  if (expiresAt && expiresAt < now + 120 && cfg.refreshToken) {
    const t = await refreshAccessToken(cfg.refreshToken);
    cfg = {
      ...cfg,
      accessToken: t.accessToken,
      refreshToken: t.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + Number(t.expiresIn)
    };
    await persistJiraTokens(userId, cfg);
  }
  if (!cfg.accessToken || !cfg.cloudId) return null;
  return { accessToken: cfg.accessToken, cloudId: cfg.cloudId };
}

/**
 * @param {string} userId
 * @param {object} tokenSet
 * @param {string} tokenSet.accessToken
 * @param {string} tokenSet.refreshToken
 * @param {number} tokenSet.expiresIn
 */
export async function saveJiraOAuthTokens(userId, tokenSet) {
  const resources = await fetchAccessibleResources(tokenSet.accessToken);
  const first = resources[0];
  const cfg = {
    accessToken: tokenSet.accessToken,
    refreshToken: tokenSet.refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + Number(tokenSet.expiresIn),
    cloudId: first.id,
    siteUrl: first.url ?? null,
    name: first.name ?? null
  };
  await prisma.integrationConfig.upsert({
    where: { userId_provider: { userId, provider: 'JIRA' } },
    create: {
      userId,
      provider: 'JIRA',
      configEncrypted: cfg,
      isConnected: true
    },
    update: {
      configEncrypted: cfg,
      isConnected: true
    }
  });
}

/** Dev-only: fetch using JIRA_ACCESS_TOKEN + JIRA_CLOUD_ID without DB row. */
export async function getDevJiraCredentials() {
  const access = process.env.JIRA_ACCESS_TOKEN;
  const cloudId = process.env.JIRA_CLOUD_ID;
  if (!access || !cloudId) return null;
  return { accessToken: access, cloudId };
}
