import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { signToken } from '../middleware/auth.js';
import { getJwtSecret } from '../lib/env.js';
import { prisma } from '../lib/prisma.js';
import { fromJson } from '../lib/json.js';

const router = Router();
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';

router.get('/auth', (req, res) => {
  try {
    const id = process.env.FIGMA_CLIENT_ID;
    if (!id) {
      return res.status(503).json({
        configured: false,
        error: 'Figma OAuth is not configured',
        hint: 'Set FIGMA_CLIENT_ID, FIGMA_CLIENT_SECRET, FIGMA_REDIRECT_URI.'
      });
    }
    const redirect = process.env.FIGMA_REDIRECT_URI || 'http://localhost:3001/api/v1/integrations/figma/callback';
    const state = signToken(
      { purpose: 'figma_oauth', userId: req.user.userId },
      { expiresIn: '10m' }
    );
    const url =
      `https://www.figma.com/oauth?client_id=${encodeURIComponent(id)}` +
      `&redirect_uri=${encodeURIComponent(redirect)}` +
      `&scope=file_read` +
      `&response_type=code` +
      `&state=${encodeURIComponent(state)}`;
    res.json({ configured: true, authorizationUrl: url });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Figma auth failed' });
  }
});

router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) {
      return res.redirect(
        `${FRONTEND}/settings?figma=error&message=${encodeURIComponent(String(error))}`
      );
    }
    if (!code || !state) return res.status(400).send('Missing code or state');
    const decoded = jwt.verify(String(state), getJwtSecret());
    if (decoded.purpose !== 'figma_oauth' || !decoded.userId) {
      return res.status(400).send('Invalid OAuth state');
    }
    const redirect = process.env.FIGMA_REDIRECT_URI || 'http://localhost:3001/api/v1/integrations/figma/callback';
    const clientId = process.env.FIGMA_CLIENT_ID;
    const clientSecret = process.env.FIGMA_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('FIGMA_CLIENT_ID / FIGMA_CLIENT_SECRET missing');
    }
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirect,
      code: String(code),
      grant_type: 'authorization_code'
    });
    const tr = await fetch('https://api.figma.com/v1/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const tok = await tr.json().catch(() => ({}));
    if (!tr.ok) {
      throw new Error(tok.err || tok.message || `figma token ${tr.status}`);
    }
    const cfg = {
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + Number(tok.expires_in || 3600)
    };
    await prisma.integrationConfig.upsert({
      where: { userId_provider: { userId: decoded.userId, provider: 'FIGMA' } },
      create: {
        userId: decoded.userId,
        provider: 'FIGMA',
        configEncrypted: cfg,
        isConnected: true
      },
      update: { configEncrypted: cfg, isConnected: true }
    });
    return res.redirect(`${FRONTEND}/settings?figma=connected`);
  } catch (err) {
    console.error('[figma/oauth]', err);
    return res.redirect(
      `${FRONTEND}/settings?figma=error&message=${encodeURIComponent(err.message || 'oauth failed')}`
    );
  }
});

/** Figma webhooks v2 — optional FIGMA_WEBHOOK_SECRET for passcode verification. */
router.post('/webhook', (req, res) => {
  try {
    const secret = process.env.FIGMA_WEBHOOK_SECRET;
    if (process.env.NODE_ENV === 'production' && !secret) {
      return res.status(503).json({ error: 'FIGMA_WEBHOOK_SECRET is not configured' });
    }
    if (secret) {
      const passcode = req.body?.passcode;
      const a = typeof passcode === 'string' ? Buffer.from(passcode) : Buffer.alloc(0);
      const b = Buffer.from(secret);
      const ok = a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
      if (!ok) {
        return res.status(401).json({ error: 'Invalid webhook passcode' });
      }
    }
    const fileKey = req.body?.file_key || req.body?.fileKey || null;
    const eventType = req.body?.event_type || req.body?.type || null;
    res.json({ received: true, fileKey, eventType });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Webhook failed' });
  }
});

router.get('/file/:key', async (req, res) => {
  try {
    const row = await prisma.integrationConfig.findUnique({
      where: { userId_provider: { userId: req.user.userId, provider: 'FIGMA' } }
    });
    const token = fromJson(row?.configEncrypted, {}).accessToken;
    if (!token) {
      return res.status(503).json({ error: 'Figma not connected', configured: false });
    }
    const key = encodeURIComponent(req.params.key);
    const r = await fetch(`https://api.figma.com/v1/files/${key}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(502).json({ error: data.err || data.message || `Figma ${r.status}` });
    }
    res.json({ name: data.name, lastModified: data.lastModified, document: data.document });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Figma fetch failed' });
  }
});

export default router;
