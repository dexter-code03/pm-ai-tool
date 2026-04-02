import { Router } from 'express';

const router = Router();

/** Phase 4 — Zapier / Make published event schema. */
router.get('/schema', (_req, res) => {
  res.json({
    version: 1,
    events: [
      { name: 'prd.created', payload: { prdId: 'uuid', title: 'string' } },
      { name: 'prd.status_changed', payload: { prdId: 'uuid', from: 'string', to: 'string' } },
      { name: 'prd.exported', payload: { prdId: 'uuid', format: 'string' } },
      { name: 'wireframe.generated', payload: { wireframeId: 'uuid' } }
    ]
  });
});

export default router;
