import { Router } from 'express';
import bcrypt from 'bcryptjs';
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError
} from '@prisma/client/runtime/library';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../middleware/auth.js';

const router = Router();

function isConnectionError(err) {
  return (
    err instanceof PrismaClientInitializationError ||
    (err instanceof PrismaClientKnownRequestError &&
      ['P1001', 'P1002', 'P1017'].includes(err.code))
  );
}

function sendAuthCatch(res, err, fallbackMessage) {
  console.error('[auth]', err);
  const dev = process.env.NODE_ENV !== 'production';
  if (isConnectionError(err)) {
    return res.status(503).json({
      error:
        'Database is not configured or unreachable. Set DATABASE_URL in server/.env, ensure Postgres is running, and run: npx prisma db push',
      ...(dev && { detail: err.message })
    });
  }
  return res.status(500).json({
    error: fallbackMessage,
    ...(dev && { detail: err.message })
  });
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const existing = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await prisma.user.create({
      data: {
        email: String(email).toLowerCase(),
        passwordHash,
        name: name || 'User'
      }
    });
    const token = signToken({ userId: user.id, role: user.role, email: user.email });
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (err) {
    sendAuthCatch(res, err, 'Registration failed');
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
    let passwordOk = false;
    if (user?.passwordHash) {
      try {
        passwordOk = await bcrypt.compare(String(password), user.passwordHash);
      } catch {
        passwordOk = false;
      }
    }
    if (!user || !passwordOk) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signToken({ userId: user.id, role: user.role, email: user.email });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (err) {
    sendAuthCatch(res, err, 'Login failed');
  }
});

export default router;
