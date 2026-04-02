import { prisma } from './prisma.js';
import { fromJson } from './json.js';

export async function notifySlackForUser(userId, text) {
  try {
    const row = await prisma.integrationConfig.findUnique({
      where: { userId_provider: { userId, provider: 'SLACK' } }
    });
    const conf = fromJson(row?.configEncrypted, {});
    const url = String(conf.webhookUrl || '').trim();
    if (!url) return;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
  } catch {
    /* optional */
  }
}
