import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getPresignedPutUrl, s3Ready } from '../lib/s3.js';

const router = Router();

/** POST /api/v1/uploads/presign — S3-compatible presigned PUT for editor images. */
router.post('/presign', async (req, res) => {
  try {
    if (!s3Ready()) {
      return res.status(503).json({
        error: 'Object storage is not configured',
        configured: false,
        hint: 'Set S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY (or AWS_* equivalents).'
      });
    }
    const { contentType = 'image/png', prefix = 'uploads' } = req.body || {};
    const safePrefix = String(prefix).replace(/[^a-zA-Z0-9/_-]/g, '') || 'uploads';
    const key = `${safePrefix}/${req.user.userId}/${randomUUID()}`;
    const out = await getPresignedPutUrl({ key, contentType: String(contentType) });
    res.json({
      uploadUrl: out.url,
      key: out.key,
      publicUrl: out.publicBaseUrl ? `${out.publicBaseUrl.replace(/\/$/, '')}/${out.key}` : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Presign failed' });
  }
});

export default router;
