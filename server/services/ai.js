import OpenAI from 'openai';
import { fromJson } from '../lib/json.js';

/**
 * Resolve active LLM config for user — respects preferredAiProvider from user settings.
 */
export async function getActiveAiConfig(prisma, userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { settings: true } });
  const userSettings = fromJson(user?.settings, {});
  const preferred = String(userSettings.preferredAiProvider || '').toUpperCase();

  const defaultOrder = ['OPENAI', 'CLAUDE', 'GEMINI', 'CUSTOM'];
  const providers = preferred && defaultOrder.includes(preferred)
    ? [preferred, ...defaultOrder.filter(p => p !== preferred)]
    : defaultOrder;

  for (const p of providers) {
    const row = await prisma.integrationConfig.findUnique({
      where: { userId_provider: { userId, provider: p } }
    });
    if (!row) continue;
    const c = fromJson(row.configEncrypted, {});
    if (p === 'CUSTOM' && c.baseUrl) return { provider: row.provider, configEncrypted: row.configEncrypted };
    if (c.apiKey) return { provider: row.provider, configEncrypted: row.configEncrypted };
  }
  return null;
}

export async function callLLM(aiConfig, systemPrompt, userPrompt) {
  if (!aiConfig) throw new Error('No AI provider configured');
  const c = fromJson(aiConfig.configEncrypted, {});
  const provider = String(aiConfig.provider || '').toUpperCase();

  if (provider === 'OPENAI') {
    const client = new OpenAI({ apiKey: c.apiKey });
    const model = c.model || 'gpt-4o';
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4
    });
    return completion.choices[0]?.message?.content || '';
  }

  if (provider === 'CLAUDE') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': c.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: c.model || 'claude-sonnet-4-20250514',
        max_tokens: 16384,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Claude API error ${response.status}: ${body.slice(0, 200)}`);
    }
    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  if (provider === 'GEMINI') {
    const rawModel = String(c.model || '').trim();
    const model = rawModel || 'gemini-2.5-flash';
    const encodedModel = encodeURIComponent(model);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodedModel}:generateContent?key=${encodeURIComponent(c.apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 65536 }
      })
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Gemini API error ${response.status} (model: ${model}): ${body.slice(0, 300)}`);
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  if (provider === 'CUSTOM') {
    const baseUrl = String(c.baseUrl || '').replace(/\/$/, '');
    if (!baseUrl) throw new Error('Custom LLM base URL missing');
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.apiKey || ''}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: c.model || 'default',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });
    if (!response.ok) throw new Error('Custom LLM error ' + response.status);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  throw new Error('Unsupported AI provider');
}
