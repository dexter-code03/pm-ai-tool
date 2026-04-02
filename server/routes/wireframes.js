import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { fromJson } from '../lib/json.js';
import { getActiveAiConfig } from '../services/ai.js';
import {
  generateWireframesFromPrd,
  generateStandaloneWireframe,
  editWireframeScreen,
  getStitchApiKey,
  syncStitchScreens,
  getGenerationProgress
} from '../services/stitch.js';
import { recordGenerationMetric } from '../lib/generationMetrics.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const wireframes = await prisma.wireframe.findMany({
      where: { userId: req.user.userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        screens: { orderBy: { order: 'asc' } },
        links: { where: { unlinkedAt: null }, include: { prd: { select: { id: true, title: true, status: true } } } }
      }
    });
    res.json({ wireframes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list wireframes' });
  }
});

router.post('/generate-from-prd', async (req, res) => {
  const t0 = Date.now();
  try {
    const { prdId, prdIds, deviceType } = req.body;
    const ids = Array.isArray(prdIds) && prdIds.length > 0 ? prdIds : (prdId ? [prdId] : []);
    if (ids.length === 0) return res.status(400).json({ error: 'At least one PRD is required' });

    const prds = await prisma.prd.findMany({
      where: { id: { in: ids }, userId: req.user.userId }
    });
    if (prds.length === 0) return res.status(404).json({ error: 'No PRDs found' });

    const config = await getActiveAiConfig(prisma, req.user.userId);
    if (!config) return res.status(400).json({ error: 'Configure an AI provider in Settings' });

    const stitchApiKey = await getStitchApiKey(prisma, req.user.userId);

    const prdsForGen = prds.map(p => ({ ...p, content: fromJson(p.content, []) }));
    const wireframe = await generateWireframesFromPrd({
      prds: prdsForGen,
      userId: req.user.userId,
      deviceType: deviceType || 'DESKTOP',
      aiConfig: config,
      stitchApiKey: stitchApiKey || ''
    });

    for (const prd of prds) {
      await prisma.prdWireframeLink.create({
        data: { prdId: prd.id, wireframeId: wireframe.id }
      }).catch(() => {});
    }

    void recordGenerationMetric(prisma, req.user.userId, 'wireframe_from_prd', Date.now() - t0);
    res.json({ wireframe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Wireframe generation failed' });
  }
});

router.post('/generate-standalone', async (req, res) => {
  const t0 = Date.now();
  try {
    const { title, brief, deviceType } = req.body;
    if (!brief) return res.status(400).json({ error: 'Brief is required' });

    const config = await getActiveAiConfig(prisma, req.user.userId);
    if (!config) return res.status(400).json({ error: 'Configure an AI provider in Settings' });

    const stitchApiKey = await getStitchApiKey(prisma, req.user.userId);

    const wireframe = await generateStandaloneWireframe({
      title: title || 'Untitled Wireframe',
      brief,
      userId: req.user.userId,
      deviceType: deviceType || 'DESKTOP',
      aiConfig: config,
      stitchApiKey: stitchApiKey || ''
    });

    void recordGenerationMetric(prisma, req.user.userId, 'wireframe_standalone', Date.now() - t0);
    res.json({ wireframe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Wireframe generation failed' });
  }
});

router.get('/:id/progress', async (req, res) => {
  const progress = getGenerationProgress(req.params.id);
  if (progress) {
    res.json({ generating: true, ...progress });
  } else {
    const wf = await prisma.wireframe.findFirst({
      where: { id: req.params.id, userId: req.user.userId },
      select: { status: true }
    });
    res.json({ generating: wf?.status === 'generating', step: 0, total: 0, detail: wf?.status || 'unknown' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const wireframe = await prisma.wireframe.findFirst({
      where: { id: req.params.id, userId: req.user.userId },
      include: {
        screens: { orderBy: { order: 'asc' } },
        links: { where: { unlinkedAt: null }, include: { prd: { select: { id: true, title: true, status: true } } } }
      }
    });
    if (!wireframe) return res.status(404).json({ error: 'Wireframe not found' });
    res.json({ wireframe });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get wireframe' });
  }
});

router.post('/:id/edit-screen', async (req, res) => {
  try {
    const { screenId, instruction } = req.body;
    const wireframe = await prisma.wireframe.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!wireframe) return res.status(404).json({ error: 'Wireframe not found' });

    const stitchApiKey = await getStitchApiKey(prisma, req.user.userId);
    const screen = await editWireframeScreen({
      wireframe,
      screenId,
      instruction,
      stitchApiKey
    });
    res.json({ screen });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Edit failed' });
  }
});

router.post('/:id/sync-stitch', async (req, res) => {
  try {
    const wireframe = await prisma.wireframe.findFirst({
      where: { id: req.params.id, userId: req.user.userId },
      include: { screens: { orderBy: { order: 'asc' } } }
    });
    if (!wireframe) return res.status(404).json({ error: 'Wireframe not found' });
    if (!wireframe.stitchProjectId) return res.status(400).json({ error: 'No Stitch project linked to this wireframe' });

    const stitchApiKey = await getStitchApiKey(prisma, req.user.userId);
    if (!stitchApiKey) return res.status(400).json({ error: 'Configure Stitch API key in Settings' });

    const updated = await syncStitchScreens({ wireframe, stitchApiKey });
    res.json({ wireframe: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Stitch sync failed' });
  }
});

router.put('/:id/flow-graph', async (req, res) => {
  try {
    const { flowGraph } = req.body;
    const wireframe = await prisma.wireframe.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!wireframe) return res.status(404).json({ error: 'Wireframe not found' });
    const updated = await prisma.wireframe.update({
      where: { id: wireframe.id },
      data: { flowGraph: typeof flowGraph === 'string' ? flowGraph : JSON.stringify(flowGraph) }
    });
    res.json({ wireframe: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to update flow graph' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const wf = await prisma.wireframe.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!wf) return res.status(404).json({ error: 'Not found' });
    await prisma.wireframe.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

export default router;
