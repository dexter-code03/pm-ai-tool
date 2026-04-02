import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { buildHtmlDocument } from '../services/export.js';

const router = Router();

/**
 * GET /api/v1/export/prd/:id/pdf-puppeteer — Phase 1 PDF via headless Chrome when Puppeteer is installed.
 */
router.get('/prd/:id/pdf-puppeteer', async (req, res) => {
  try {
    const prd = await prisma.prd.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!prd) return res.status(404).json({ error: 'PRD not found' });
    let puppeteer;
    try {
      ({ default: puppeteer } = await import('puppeteer'));
    } catch {
      return res.status(503).json({
        error: 'Puppeteer/Chromium is not available in this runtime',
        configured: false,
        hint: 'Install puppeteer in the server image, or use GET /api/v1/prds/:id/export/html'
      });
    }
    const sections = Array.isArray(prd.content) ? prd.content : [];
    const html = buildHtmlDocument(prd, sections);
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(pdf));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'PDF render failed' });
  }
});

export default router;
