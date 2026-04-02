import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

function percentile95(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil(0.95 * s.length) - 1));
  return s[idx];
}

/** KPI aggregates: counts, p95 generation latency (rolling 30d), optional MAU for admins. */
router.get('/summary', async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [prdCount, wfCount, commentCount, notifUnread, metrics] = await Promise.all([
      prisma.prd.count({ where: { userId: req.user.userId } }),
      prisma.wireframe.count({ where: { userId: req.user.userId } }),
      prisma.comment.count({
        where: { userId: req.user.userId }
      }),
      prisma.notification.count({
        where: { userId: req.user.userId, read: false }
      }),
      prisma.generationMetric.findMany({
        where: { userId: req.user.userId, createdAt: { gte: since } },
        select: { durationMs: true }
      })
    ]);

    const durs = metrics.map((m) => m.durationMs);
    const p95GenerationMs = percentile95(durs);

    let mau = null;
    if (req.user.role === 'ADMIN') {
      mau = await prisma.user.count({
        where: {
          prds: { some: { updatedAt: { gte: since } } }
        }
      });
    }

    res.json({
      prds: prdCount,
      wireframes: wfCount,
      comments: commentCount,
      notificationsUnread: notifUnread,
      p95GenerationMs,
      mau,
      metricsWindowDays: 30
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
