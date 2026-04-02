import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

router.get('/', requireRole('ADMIN'), async (req, res) => {
  try {
    const where = {};
    if (req.query.orgId) where.orgId = String(req.query.orgId);
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
