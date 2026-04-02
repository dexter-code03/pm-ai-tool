import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { signToken } from '../middleware/auth.js';
import { getJwtSecret } from '../lib/env.js';
import {
  exchangeAuthorizationCode,
  saveJiraOAuthTokens
} from '../services/jiraAtlassian.js';

const router = Router();

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';

/** GET /api/v1/integrations/jira/auth — OAuth start (state binds signed user id). */
router.get('/auth', (req, res) => {
  try {
    const clientId = process.env.JIRA_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({
        configured: false,
        error: 'Jira OAuth is not configured',
        hint: 'Set JIRA_CLIENT_ID, JIRA_CLIENT_SECRET, and JIRA_REDIRECT_URI.'
      });
    }
    const redirect = process.env.JIRA_REDIRECT_URI || 'http://localhost:3001/api/v1/integrations/jira/callback';
    const state = signToken(
      { purpose: 'jira_oauth', userId: req.user.userId },
      { expiresIn: '10m' }
    );
    const url = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${encodeURIComponent(
      clientId
    )}&scope=${encodeURIComponent('read:jira-work read:jira-user offline_access')}&redirect_uri=${encodeURIComponent(
      redirect
    )}&response_type=code&prompt=consent&state=${encodeURIComponent(state)}`;
    res.json({ configured: true, authorizationUrl: url });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Jira auth URL failed' });
  }
});

/** GET /api/v1/integrations/jira/callback — public; exchanges code and persists tokens. */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;
    if (oauthError) {
      return res.redirect(
        `${FRONTEND}/settings?jira=error&message=${encodeURIComponent(String(oauthError))}`
      );
    }
    if (!code || !state) {
      return res.status(400).send('Missing code or state');
    }
    const decoded = jwt.verify(String(state), getJwtSecret());
    if (decoded.purpose !== 'jira_oauth' || !decoded.userId) {
      return res.status(400).send('Invalid OAuth state');
    }
    const redirectUri =
      process.env.JIRA_REDIRECT_URI || 'http://localhost:3001/api/v1/integrations/jira/callback';
    const tokens = await exchangeAuthorizationCode({
      code: String(code),
      redirectUri: redirectUri
    });
    await saveJiraOAuthTokens(decoded.userId, tokens);
    return res.redirect(`${FRONTEND}/settings?jira=connected`);
  } catch (err) {
    console.error('[jira/oauth/callback]', err);
    return res.redirect(
      `${FRONTEND}/settings?jira=error&message=${encodeURIComponent(err.message || 'oauth failed')}`
    );
  }
});

export default router;
