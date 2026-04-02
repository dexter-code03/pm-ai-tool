import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

/** POST /api/v1/gdpr/export-request — bundle user-owned records (JSON). */
router.post('/export-request', async (req, res) => {
  try {
    const userId = req.user.userId;
    const [user, configs, prds, wireframes, notifications, auditLogs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          orgId: true,
          settings: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.integrationConfig.findMany({ where: { userId } }),
      prisma.prd.findMany({ where: { userId } }),
      prisma.wireframe.findMany({ where: { userId } }),
      prisma.notification.findMany({ where: { userId } }),
      prisma.auditLog.findMany({ where: { userId } })
    ]);
    res.json({
      generatedAt: new Date().toISOString(),
      user,
      integrationConfigs: configs.map((c) => ({
        id: c.id,
        provider: c.provider,
        isConnected: c.isConnected,
        updatedAt: c.updatedAt
      })),
      prds,
      wireframes,
      notifications,
      auditLogs
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Export failed' });
  }
});

/** POST /api/v1/gdpr/delete-request — delete the authenticated user and owned data. */
router.post('/delete-request', async (req, res) => {
  try {
    const userId = req.user.userId;
    const confirm = String(req.body?.confirmEmail || '');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (confirm.toLowerCase() !== user.email.toLowerCase()) {
      return res.status(400).json({ error: 'confirmEmail must match your account email' });
    }
    await prisma.user.delete({ where: { id: userId } });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Delete failed' });
  }
});

export default router;
