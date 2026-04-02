import { Router } from 'express';
import passport from 'passport';
import { Strategy as SamlStrategy } from 'passport-saml';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../middleware/auth.js';

const router = Router();

const samlOptions =
  process.env.SAML_ENTRY_POINT &&
  process.env.SAML_ISSUER &&
  process.env.SAML_CERT
    ? {
        entryPoint: process.env.SAML_ENTRY_POINT,
        issuer: process.env.SAML_ISSUER,
        cert: process.env.SAML_CERT,
        callbackUrl:
          process.env.SAML_CALLBACK_URL || 'http://localhost:3001/api/v1/sso/saml/callback'
      }
    : null;

if (samlOptions) {
  passport.use(
    new SamlStrategy(samlOptions, (profile, done) => {
      done(null, profile);
    })
  );
}

router.get('/status', (_req, res) => {
  res.json({
    saml: { enabled: !!samlOptions },
    scim: { enabled: !!process.env.SCIM_BEARER_TOKEN },
    googleWorkspace: { enabled: false }
  });
});

router.get('/saml/login', (req, res, next) => {
  if (!samlOptions) {
    return res.status(503).json({ error: 'SAML is not configured', configured: false });
  }
  passport.authenticate('saml', { session: false })(req, res, next);
});

router.post('/saml/callback', (req, res, next) => {
  if (!samlOptions) {
    return res.status(503).json({ error: 'SAML is not configured' });
  }
  passport.authenticate('saml', { session: false }, (err, user, info) => {
    if (err) {
      return res.status(401).json({ error: err.message || 'SAML error' });
    }
    if (!user) {
      return res.status(401).json({ error: 'SAML authentication failed', info });
    }
    const email =
      user.email ||
      user.mail ||
      user['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
    const token = signToken(
      {
        userId: 'saml-session',
        email: email || null,
        saml: true,
        nameID: user.nameID
      },
      { expiresIn: '1h' }
    );
    res.json({
      token,
      email: email || null,
      note: 'Map SAML email to a User and issue a normal session token in production.'
    });
  })(req, res, next);
});

router.get('/scim/v2/Users', async (req, res) => {
  try {
    const tok = process.env.SCIM_BEARER_TOKEN;
    if (!tok) {
      return res.status(503).json({ error: 'SCIM is not configured', configured: false });
    }
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${tok}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true }
    });
    res.json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: users.length,
      Resources: users.map((u) => ({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        id: u.id,
        userName: u.email,
        name: { formatted: u.name },
        active: true,
        emails: [{ value: u.email, primary: true }]
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'SCIM failed' });
  }
});

export default router;
