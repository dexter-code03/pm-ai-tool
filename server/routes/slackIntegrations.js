import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { fromJson } from '../lib/json.js';

const router = Router();

router.post('/notify', async (req, res) => {
  try {
    const row = await prisma.integrationConfig.findUnique({
      where: { userId_provider: { userId: req.user.userId, provider: 'SLACK' } }
    });
    const webhookUrl = fromJson(row?.configEncrypted, {}).webhookUrl;
    if (!webhookUrl) {
      return res.status(503).json({
        error: 'Slack is not connected',
        configured: false,
        hint: 'Add an Incoming Webhook URL in Settings → Integrations.'
      });
    }
    const text = String(req.body?.text || req.body?.message || 'Notification from PM AI Tool');
    const r = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ error: `Slack returned ${r.status}`, detail: t.slice(0, 500) });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Slack notify failed' });
  }
});

export default router;
