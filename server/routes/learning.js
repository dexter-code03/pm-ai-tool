import { Router } from 'express';

const router = Router();

router.get('/status', (_req, res) => {
  res.json({
    diffStorageEnabled: false,
    patternDetectionThreshold: 0.8,
    note: 'Phase 2/4 — opt-in AI diff storage and few-shot tuning.'
  });
});

export default router;
