import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { signToken } from '../middleware/auth.js';
import { getJwtSecret } from '../lib/env.js';
import { prisma } from '../lib/prisma.js';

const router = Router();
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';

/** GET /api/v1/integrations/google/auth */
router.get('/auth', (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({
        configured: false,
        error: 'Google OAuth is not configured',
        hint: 'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI.'
      });
    }
    const redirect = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/v1/integrations/google/callback';
    const state = signToken(
      { purpose: 'google_oauth', userId: req.user.userId },
      { expiresIn: '10m' }
    );
    const scope = encodeURIComponent('openid email profile');
    const url =
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirect)}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${encodeURIComponent(state)}`;
    res.json({ configured: true, authorizationUrl: url });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Google auth failed' });
  }
});

/** GET /api/v1/integrations/google/callback */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) {
      return res.redirect(
        `${FRONTEND}/settings?google=error&message=${encodeURIComponent(String(error))}`
      );
    }
    if (!code || !state) return res.status(400).send('Missing code or state');
    const decoded = jwt.verify(String(state), getJwtSecret());
    if (decoded.purpose !== 'google_oauth' || !decoded.userId) {
      return res.status(400).send('Invalid OAuth state');
    }
    const redirect = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/v1/integrations/google/callback';
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing');
    }
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirect,
      code: String(code),
      grant_type: 'authorization_code'
    });
    const tr = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const tok = await tr.json().catch(() => ({}));
    if (!tr.ok) {
      throw new Error(tok.error_description || tok.error || `Google token ${tr.status}`);
    }
    const expiresIn = Number(tok.expires_in || 3600);
    const cfg = {
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token || null,
      expiresAt: Math.floor(Date.now() / 1000) + expiresIn
    };
    await prisma.integrationConfig.upsert({
      where: { userId_provider: { userId: decoded.userId, provider: 'GOOGLE' } },
      create: {
        userId: decoded.userId,
        provider: 'GOOGLE',
        configEncrypted: cfg,
        isConnected: true
      },
      update: { configEncrypted: cfg, isConnected: true }
    });
    return res.redirect(`${FRONTEND}/settings?google=connected`);
  } catch (err) {
    console.error('[google/oauth]', err);
    return res.redirect(
      `${FRONTEND}/settings?google=error&message=${encodeURIComponent(err.message || 'oauth failed')}`
    );
  }
});

export default router;
