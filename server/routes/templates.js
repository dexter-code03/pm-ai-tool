import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const or = [{ ownerId: req.user.userId }];
    if (req.user.orgId) or.push({ orgId: req.user.orgId });
    const templates = await prisma.template.findMany({
      where: { OR: or },
      take: 100
    });
    res.json({ templates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, promptRecipe, visibility, orgId } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const t = await prisma.template.create({
      data: {
        name: String(name),
        description: description || '',
        ownerId: req.user.userId,
        orgId: orgId || req.user.orgId || null,
        visibility: visibility || 'personal',
        promptRecipe: promptRecipe || {}
      }
    });
    res.status(201).json({ template: t });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const existing = await prisma.template.findFirst({
      where: { id: req.params.id, ownerId: req.user.userId }
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const t = await prisma.template.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.name !== undefined ? { name: String(req.body.name) } : {}),
        ...(req.body.description !== undefined ? { description: req.body.description } : {}),
        ...(req.body.promptRecipe !== undefined ? { promptRecipe: req.body.promptRecipe } : {}),
        version: { increment: 1 }
      }
    });
    res.json({ template: t });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.template.findFirst({
      where: { id: req.params.id, ownerId: req.user.userId }
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await prisma.template.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
