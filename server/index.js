import './load-env.js';
import http from 'http';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import passport from 'passport';
import { prisma } from './lib/prisma.js';
import { assertProductionJwtSecret } from './lib/env.js';
import { authMiddleware } from './middleware/auth.js';
import { requestLog } from './middleware/requestLog.js';

assertProductionJwtSecret();
import { apiLimiter } from './middleware/rateLimit.js';
import { attachCollabWss } from './collab.js';
import authRoutes from './routes/auth.js';
import settingsRoutes from './routes/settings.js';
import prdsRoutes from './routes/prds.js';
import wireframesRoutes from './routes/wireframes.js';
import ticketRoutes from './routes/tickets.js';
import jiraIntegrationsRoutes from './routes/jiraIntegrations.js';
import figmaIntegrationsRoutes from './routes/figmaIntegrations.js';
import slackIntegrationsRoutes from './routes/slackIntegrations.js';
import googleIntegrationsRoutes from './routes/googleIntegrations.js';
import kpiRoutes from './routes/kpi.js';
import ssoRoutes from './routes/sso.js';
import pdfExportRoutes from './routes/pdfExport.js';
import auditLogRoutes from './routes/auditLogs.js';
import gdprRoutes from './routes/gdpr.js';
import eventsSchemaRoutes from './routes/eventsSchema.js';
import integrationsPublishRoutes from './routes/integrationsPublish.js';
import learningRoutes from './routes/learning.js';
import billingRoutes from './routes/billing.js';
import templateRoutes from './routes/templates.js';
import uploadsRoutes from './routes/uploads.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: [FRONTEND_ORIGIN, /^http:\/\/localhost:\d+$/],
    credentials: true
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(passport.initialize());
app.use(requestLog);
app.use('/api/v1', apiLimiter);

app.get('/health', async (_req, res) => {
  let db = 'ok';
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
  } catch {
    db = 'error';
  }
  const ok = db === 'ok';
  res.status(ok ? 200 : 503).json({
    ok,
    service: 'pm-ai-tool-api',
    time: new Date().toISOString(),
    db
  });
});

/** Jira Cloud webhook — set JIRA_WEBHOOK_SECRET and send it as header X-Jira-Webhook-Token. */
app.post('/api/v1/webhooks/jira', async (req, res) => {
  try {
    const secret = process.env.JIRA_WEBHOOK_SECRET;
    if (process.env.NODE_ENV === 'production' && !secret) {
      return res.status(503).json({ error: 'JIRA_WEBHOOK_SECRET is not configured' });
    }
    if (secret) {
      const got = req.get('x-jira-webhook-token') || req.get('x-webhook-token');
      if (got !== secret) {
        return res.status(401).json({ error: 'Invalid webhook token' });
      }
    }
    const issue = req.body?.issue;
    const key = issue?.key ?? null;
    res.json({ received: true, issueKey: key, eventType: req.body?.webhookEvent ?? null });
  } catch (err) {
    console.error('[webhook/jira]', err);
    res.status(500).json({ error: err.message || 'Webhook failed' });
  }
});

app.use('/api/v1/auth', authRoutes);

app.get('/api/v1/auth/google', (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({
        configured: false,
        error: 'Google OAuth is not configured',
        hint: 'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI in server/.env.'
      });
    }
    const redirect = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/google/callback';
    const scope = encodeURIComponent('openid email profile');
    const url =
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirect)}` +
      `&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
    res.json({ configured: true, authorizationUrl: url });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Google auth failed' });
  }
});

app.get('/api/v1/auth/google/callback', async (req, res) => {
  const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
  try {
    const { code } = req.query;
    if (!code) return res.redirect(`${FRONTEND}/login?error=missing_code`);

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/google/callback';
    if (!clientId || !clientSecret) return res.redirect(`${FRONTEND}/login?error=google_not_configured`);

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });
    if (!tokenRes.ok) return res.redirect(`${FRONTEND}/login?error=token_exchange_failed`);
    const tokens = await tokenRes.json();

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    if (!profileRes.ok) return res.redirect(`${FRONTEND}/login?error=profile_fetch_failed`);
    const profile = await profileRes.json();

    const email = String(profile.email || '').toLowerCase();
    if (!email) return res.redirect(`${FRONTEND}/login?error=no_email`);

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: profile.name || email.split('@')[0],
          passwordHash: '',
          role: 'EDITOR'
        }
      });
    }

    const { signToken } = await import('./middleware/auth.js');
    const jwt = signToken({ userId: user.id, role: user.role, email: user.email });
    res.redirect(`${FRONTEND}/?token=${encodeURIComponent(jwt)}`);
  } catch (err) {
    console.error('[google-callback]', err);
    res.redirect(`${FRONTEND}/login?error=google_sso_failed`);
  }
});

app.get('/api/v1/enterprise/status', authMiddleware, (_req, res) => {
  res.json({
    saml: { enabled: false },
    scim: { enabled: false },
    auditLog: { enabled: true, note: 'Audit entries stored in audit_log; enterprise UI is roadmap.' }
  });
});

app.get('/api/v1/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, name: true, role: true, orgId: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load user' });
  }
});

app.use('/api/v1/settings', authMiddleware, settingsRoutes);
app.use('/api/v1/ticket', authMiddleware, ticketRoutes);
app.use(
  '/api/v1/integrations/jira',
  (req, res, next) => {
    if (req.path === '/callback' || req.path.startsWith('/callback')) return next();
    return authMiddleware(req, res, next);
  },
  jiraIntegrationsRoutes
);
app.use(
  '/api/v1/integrations/figma',
  (req, res, next) => {
    if (req.path === '/callback' || req.path.startsWith('/callback')) return next();
    if (req.path === '/webhook' || req.path.startsWith('/webhook')) return next();
    return authMiddleware(req, res, next);
  },
  figmaIntegrationsRoutes
);
app.use('/api/v1/integrations/slack', authMiddleware, slackIntegrationsRoutes);
app.use(
  '/api/v1/integrations/google',
  (req, res, next) => {
    if (req.path === '/callback' || req.path.startsWith('/callback')) return next();
    return authMiddleware(req, res, next);
  },
  googleIntegrationsRoutes
);
app.use('/api/v1/kpi', authMiddleware, kpiRoutes);
app.use('/api/v1/sso', authMiddleware, ssoRoutes);
app.use('/api/v1/export', authMiddleware, pdfExportRoutes);
app.use('/api/v1/audit', authMiddleware, auditLogRoutes);
app.use('/api/v1/gdpr', authMiddleware, gdprRoutes);
app.use('/api/v1/events', authMiddleware, eventsSchemaRoutes);
app.use('/api/v1/integrations/publish', authMiddleware, integrationsPublishRoutes);
app.use('/api/v1/learning', authMiddleware, learningRoutes);
app.use('/api/v1/billing', authMiddleware, billingRoutes);
app.use('/api/v1/uploads', authMiddleware, uploadsRoutes);
app.use('/api/v1/templates', authMiddleware, templateRoutes);
app.use('/api/v1/prds', authMiddleware, prdsRoutes);
app.use('/api/v1/wireframes', authMiddleware, wireframesRoutes);

app.get('/api/v1/notifications', authMiddleware, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.patch('/api/v1/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.userId },
      data: { read: true }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/v1/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.userId, read: false },
      data: { read: true }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

// Serve frontend in production
app.use(express.static(path.join(__dirname, '../apps/web/dist')));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../apps/web/dist/index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

const server = http.createServer(app);
attachCollabWss(server);

server.listen(PORT, () => {
  console.log(`PM AI Tool API listening on http://localhost:${PORT}`);
  console.log(`WebSocket Yjs collab at ws://localhost:${PORT}/collab/<room>`);
});
