import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { fromJson } from '../lib/json.js';

const router = Router();

router.post('/confluence', async (req, res) => {
  try {
    const row = await prisma.integrationConfig.findUnique({
      where: { userId_provider: { userId: req.user.userId, provider: 'CONFLUENCE' } }
    });
    const cfg = fromJson(row?.configEncrypted, {});
    if (!cfg.accessToken || !cfg.cloudId || !cfg.spaceKey) {
      return res.status(503).json({
        error: 'Confluence is not connected',
        configured: false,
        hint: 'Connect Confluence in Settings with cloudId, spaceKey, and OAuth token.'
      });
    }
    const title = String(req.body?.title || 'PRD export');
    const html = String(req.body?.html || '<p></p>');
    const url = `https://api.atlassian.com/ex/confluence/${encodeURIComponent(
      cfg.cloudId
    )}/wiki/rest/api/content`;
    const body = {
      type: 'page',
      title,
      space: { key: cfg.spaceKey },
      body: {
        storage: {
          value: html,
          representation: 'storage'
        }
      }
    };
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(502).json({
        error: data.message || data.data?.message || `Confluence ${r.status}`,
        details: data
      });
    }
    res.json({ id: data.id, links: data._links, title: data.title });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Confluence publish failed' });
  }
});

router.post('/notion', async (req, res) => {
  try {
    const row = await prisma.integrationConfig.findUnique({
      where: { userId_provider: { userId: req.user.userId, provider: 'NOTION' } }
    });
    const cfg = fromJson(row?.configEncrypted, {});
    if (!cfg.accessToken) {
      return res.status(503).json({
        error: 'Notion is not connected',
        configured: false,
        hint: 'Add a Notion integration token and parent page or database id in Settings.'
      });
    }
    const parentPageId = cfg.parentPageId || cfg.databaseId;
    if (!parentPageId) {
      return res.status(400).json({ error: 'Notion parentPageId or databaseId is required in integration config' });
    }
    const title = String(req.body?.title || 'PRD export');
    const titleProp = String(cfg.titlePropertyName || 'Name');
    const properties = cfg.databaseId
      ? {
          [titleProp]: {
            title: [{ text: { content: title } }]
          }
        }
      : {
          title: {
            title: [{ text: { content: title } }]
          }
        };
    const notionUrl = 'https://api.notion.com/v1/pages';
    const notionBody = cfg.databaseId
      ? {
          parent: { database_id: cfg.databaseId },
          properties
        }
      : {
          parent: { page_id: parentPageId },
          properties
        };
    const r = await fetch(notionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notionBody)
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(502).json({ error: data.message || `Notion ${r.status}`, details: data });
    }
    res.json({ id: data.id, url: data.url });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Notion publish failed' });
  }
});

export default router;
