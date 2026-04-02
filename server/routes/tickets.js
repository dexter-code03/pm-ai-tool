import { Router } from 'express';
import { adfToPlainText, adfToMarkdown } from '../lib/adf.js';
import {
  fetchJiraIssue,
  getDevJiraCredentials,
  getValidJiraAccess
} from '../services/jiraAtlassian.js';

const router = Router();

/** POST /api/v1/ticket/fetch — Jira REST v3 via stored OAuth tokens. */
router.post('/fetch', async (req, res) => {
  try {
    const { issueKey } = req.body || {};
    if (!issueKey) {
      return res.status(400).json({ error: 'issueKey required' });
    }
    const access =
      (await getValidJiraAccess(req.user.userId)) || (await getDevJiraCredentials());
    if (!access) {
      return res.status(503).json({
        error: 'Jira is not connected',
        configured: false,
        hint:
          'Complete Jira OAuth in Settings, or set JIRA_ACCESS_TOKEN and JIRA_CLOUD_ID for development-only access.'
      });
    }
    const issue = await fetchJiraIssue(access, String(issueKey).trim());
    const summary = issue.fields?.summary ?? '';
    const description = issue.fields?.description;
    let descriptionText = '';
    let descriptionPlain = '';
    if (typeof description === 'string') {
      descriptionText = description;
      descriptionPlain = description;
    } else if (description && typeof description === 'object') {
      descriptionText = adfToMarkdown(description);
      descriptionPlain = adfToPlainText(description);
    }
    res.json({
      issueKey: issue.key,
      id: issue.id,
      title: summary,
      description: descriptionText,
      descriptionPlain,
      self: issue.self
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Ticket fetch failed' });
  }
});

/** POST /api/v1/ticket/parse — pasted ADF or text. */
router.post('/parse', async (req, res) => {
  try {
    const { text, adf } = req.body || {};
    if (adf) {
      const plain = adfToPlainText(adf);
      const md = adfToMarkdown(adf);
      return res.json({ title: 'Parsed ticket', body: md || plain, plain, source: 'adf' });
    }
    return res.json({
      title: 'Pasted content',
      body: String(text || ''),
      source: 'text'
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Parse failed' });
  }
});

export default router;
