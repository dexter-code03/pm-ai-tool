import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { toJson, fromJson } from '../lib/json.js';
import OpenAI from 'openai';

const router = Router();

function integrationIsConnected(provider, mergedConfig) {
  if (provider === 'CONFLUENCE') {
    return !!(mergedConfig.accessToken && String(mergedConfig.spaceKey || '').trim());
  }
  if (provider === 'NOTION') {
    const p = String(mergedConfig.parentPageId || '').trim();
    const d = String(mergedConfig.databaseId || '').trim();
    return !!mergedConfig.accessToken && !!(p || d);
  }
  if (provider === 'CUSTOM') {
    return !!String(mergedConfig.baseUrl || '').trim();
  }
  if (provider === 'JIRA') {
    return !!mergedConfig.accessToken;
  }
  if (provider === 'FIGMA') {
    return !!mergedConfig.accessToken;
  }
  if (provider === 'GOOGLE') {
    return !!mergedConfig.accessToken;
  }
  if (provider === 'TEAMS') {
    return !!(String(mergedConfig.webhookUrl || '').trim());
  }
  if (provider === 'STITCH') {
    return !!(String(mergedConfig.apiKey || '').trim());
  }
  return !!(
    mergedConfig.apiKey ||
    mergedConfig.accessToken ||
    mergedConfig.webhookUrl ||
    mergedConfig.sendgridKey ||
    mergedConfig.smtpHost
  );
}

router.get('/integrations', async (req, res) => {
  try {
    const configs = await prisma.integrationConfig.findMany({
      where: { userId: req.user.userId }
    });

    const integrations = {};
    for (const c of configs) {
      const config = fromJson(c.configEncrypted, {});
      const key = c.provider.toLowerCase();
      integrations[key] = {
        id: c.id,
        provider: c.provider,
        isConnected: c.isConnected,
        hasKey: !!config.apiKey,
        model: config.model || null,
        deviceType: config.deviceType || null,
        webhookUrl: config.webhookUrl ? '••••' + config.webhookUrl.slice(-8) : null,
        updatedAt: c.updatedAt
      };
    }

    res.json({ integrations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

router.put('/integrations/:provider', async (req, res) => {
  try {
    const provider = req.params.provider.toUpperCase();
    const {
      apiKey,
      model,
      deviceType,
      webhookUrl,
      accessToken,
      sendgridKey,
      fromEmail,
      smtpHost,
      baseUrl,
      spaceKey,
      parentPageId,
      databaseId,
      oauthClientId,
      oauthClientSecret,
      publicAppUrl
    } = req.body;

    const configData = {};
    if (apiKey !== undefined) configData.apiKey = apiKey;
    if (model !== undefined) configData.model = model;
    if (deviceType !== undefined) configData.deviceType = deviceType;
    if (webhookUrl !== undefined) configData.webhookUrl = webhookUrl;
    if (accessToken !== undefined) configData.accessToken = accessToken;
    if (sendgridKey !== undefined) configData.sendgridKey = sendgridKey;
    if (fromEmail !== undefined) configData.fromEmail = fromEmail;
    if (smtpHost !== undefined) configData.smtpHost = smtpHost;
    if (baseUrl !== undefined) configData.baseUrl = baseUrl;
    if (spaceKey !== undefined) configData.spaceKey = spaceKey;
    if (parentPageId !== undefined) configData.parentPageId = parentPageId;
    if (databaseId !== undefined) configData.databaseId = databaseId;
    if (oauthClientId !== undefined) configData.oauthClientId = oauthClientId;
    if (oauthClientSecret !== undefined) configData.oauthClientSecret = oauthClientSecret;
    if (publicAppUrl !== undefined) configData.publicAppUrl = publicAppUrl;

    const existing = await prisma.integrationConfig.findUnique({
      where: { userId_provider: { userId: req.user.userId, provider } }
    });
    const mergedConfig = { ...fromJson(existing?.configEncrypted, {}), ...configData };
    const connected = integrationIsConnected(provider, mergedConfig);

    const config = await prisma.integrationConfig.upsert({
      where: { userId_provider: { userId: req.user.userId, provider } },
      update: {
        configEncrypted: mergedConfig,
        isConnected: connected
      },
      create: {
        userId: req.user.userId,
        provider,
        configEncrypted: mergedConfig,
        isConnected: connected
      }
    });

    res.json({
      integration: {
        provider: config.provider,
        isConnected: config.isConnected,
        hasKey: !!configData.apiKey,
        model: configData.model || null
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update integration' });
  }
});

router.delete('/integrations/:provider', async (req, res) => {
  try {
    const provider = req.params.provider.toUpperCase();
    await prisma.integrationConfig.deleteMany({
      where: { userId: req.user.userId, provider }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect integration' });
  }
});

router.get('/preferences', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { settings: true }
    });
    const settings = fromJson(user?.settings, {});
    const { passwordHash, ...prefs } = settings;
    res.json({ preferences: prefs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

router.put('/preferences', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const currentSettings = fromJson(user?.settings, {});
    const { theme, autoSaveInterval, editorFontSize, language, defaultTemplate, sidebarWidth, preferredAiProvider } =
      req.body;

    const updatedSettings = { ...currentSettings };
    if (theme !== undefined) updatedSettings.theme = theme;
    if (autoSaveInterval !== undefined) updatedSettings.autoSaveInterval = autoSaveInterval;
    if (editorFontSize !== undefined) updatedSettings.editorFontSize = editorFontSize;
    if (language !== undefined) updatedSettings.language = language;
    if (defaultTemplate !== undefined) updatedSettings.defaultTemplate = defaultTemplate;
    if (sidebarWidth !== undefined) updatedSettings.sidebarWidth = sidebarWidth;
    if (preferredAiProvider !== undefined) {
      if (preferredAiProvider == null || preferredAiProvider === '') {
        delete updatedSettings.preferredAiProvider;
      } else {
        updatedSettings.preferredAiProvider = String(preferredAiProvider).toLowerCase();
      }
    }

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { settings: updatedSettings }
    });

    res.json({ preferences: updatedSettings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

router.post('/integrations/:provider/test', async (req, res) => {
  try {
    const provider = req.params.provider.toUpperCase();
    const config = await prisma.integrationConfig.findUnique({
      where: { userId_provider: { userId: req.user.userId, provider } }
    });

    const conf = fromJson(config?.configEncrypted, {});

    if (provider === 'CUSTOM') {
      const baseUrl = String(conf.baseUrl || '').replace(/\/$/, '');
      if (!baseUrl) return res.status(400).json({ error: 'No base URL configured for custom LLM' });
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${conf.apiKey || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: conf.model || 'default',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 8
        })
      });
      if (!response.ok) throw new Error('Custom LLM returned ' + response.status);
      return res.json({ success: true, message: 'Custom LLM connection successful' });
    }

    if (provider === 'SLACK') {
      const url = String(conf.webhookUrl || '').trim();
      if (!url) return res.status(400).json({ error: 'No Slack webhook URL configured' });
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'PM AI Tool: Slack test ping' })
      });
      if (!r.ok) throw new Error('Slack returned ' + r.status);
      return res.json({ success: true, message: 'Slack webhook OK' });
    }

    if (provider === 'TEAMS') {
      const url = String(conf.webhookUrl || '').trim();
      if (!url) return res.status(400).json({ error: 'No Teams webhook URL configured' });
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'PM AI Tool: Microsoft Teams test ping' })
      });
      if (!r.ok) throw new Error('Teams returned ' + r.status);
      return res.json({ success: true, message: 'Teams webhook OK' });
    }

    if (provider === 'GOOGLE') {
      const tok = String(conf.accessToken || '').trim();
      if (!tok) return res.status(400).json({ error: 'Google not connected' });
      const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tok}` }
      });
      if (!r.ok) throw new Error('Google userinfo ' + r.status);
      return res.json({ success: true, message: 'Google connection OK' });
    }

    if (!conf.apiKey && provider !== 'JIRA') {
      return res.status(400).json({ error: 'No API key configured for ' + provider });
    }

    if (provider === 'OPENAI') {
      const client = new OpenAI({ apiKey: conf.apiKey });
      await client.models.list();
      return res.json({ success: true, message: 'OpenAI connection successful' });
    }

    if (provider === 'CLAUDE') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': conf.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      });
      if (!response.ok) throw new Error('Claude API returned ' + response.status);
      return res.json({ success: true, message: 'Claude connection successful' });
    }

    if (provider === 'GEMINI') {
      const rawModel = String(conf.model || '').trim();
      const gemModel = encodeURIComponent(rawModel || 'gemini-2.5-flash');
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${gemModel}:generateContent?key=${encodeURIComponent(conf.apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hi' }] }],
            generationConfig: { maxOutputTokens: 10 }
          })
        }
      );
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Gemini API returned ${response.status} (model: ${rawModel || 'gemini-2.5-flash'}): ${body.slice(0, 200)}`);
      }
      return res.json({ success: true, message: `Gemini connection successful (model: ${rawModel || 'gemini-2.5-flash'})` });
    }

    if (provider === 'STITCH') {
      const stitchKey = String(conf.apiKey || '').trim();
      if (!stitchKey) return res.status(400).json({ error: 'No Stitch API key configured' });
      const { StitchToolClient } = await import('@google/stitch-sdk');
      const client = new StitchToolClient({ apiKey: stitchKey });
      try {
        await client.listTools();
        return res.json({ success: true, message: 'Stitch connection successful' });
      } finally {
        await client.close().catch(() => {});
      }
    }

    res.json({ success: true, message: `${provider} config saved` });
  } catch (err) {
    res.status(400).json({ error: `Connection test failed: ${err.message}` });
  }
});

export default router;
