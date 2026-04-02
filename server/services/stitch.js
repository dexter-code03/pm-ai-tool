import { prisma } from '../lib/prisma.js';
import { fromJson } from '../lib/json.js';
import { callLLM, getActiveAiConfig } from './ai.js';

const NON_UI_SCREEN_TYPES = new Set(['DOCUMENT', 'PROTOTYPE', 'PROTOTYPE_V2']);
const NON_UI_DISPLAY_MODES = new Set(['MARKDOWN', 'STICKY_NOTE', 'CODE']);

function buildFullPrdContent(prd) {
  const sections = Array.isArray(prd.content) ? prd.content : [];
  const lines = [`Product: ${prd.title || 'Untitled'}`];
  for (const s of sections) {
    if (!s.title) continue;
    lines.push(`\n## ${s.title}`);
    if (typeof s.content === 'string' && s.content.trim()) {
      lines.push(s.content.trim());
    }
    if (Array.isArray(s.items)) {
      for (const item of s.items) {
        if (typeof item === 'string') lines.push(`- ${item}`);
        else if (item?.label) lines.push(`- ${item.label}: ${item.description || ''}`);
        else if (item?.text) lines.push(`- ${item.text}`);
      }
    }
  }
  return lines.join('\n');
}

function mergeFullPrdContent(prds) {
  if (prds.length === 1) return buildFullPrdContent(prds[0]);
  return prds.map((p, i) =>
    `--- PRD ${i + 1}: ${p.title || 'Untitled'} ---\n${buildFullPrdContent(p)}`
  ).join('\n\n');
}

function integrationCanRunLlm(aiConfig) {
  if (!aiConfig) return false;
  const c = fromJson(aiConfig.configEncrypted, {});
  const p = String(aiConfig.provider || '').toUpperCase();
  if (p === 'CUSTOM') return !!String(c.baseUrl || '').trim();
  return !!c.apiKey;
}

async function getStitchClient(apiKey) {
  const { Stitch, StitchToolClient } = await import('@google/stitch-sdk');
  const client = new StitchToolClient({ apiKey });
  const stitch = new Stitch(client);
  return { stitch, client };
}

function isUiScreen(screen) {
  if (NON_UI_SCREEN_TYPES.has(screen.screenType)) return false;
  const dm = screen.screenMetadata?.displayMode;
  if (dm && NON_UI_DISPLAY_MODES.has(dm)) return false;
  return true;
}

function extractScreenFromRaw(raw) {
  const results = [];
  const components = raw?.outputComponents || raw?.output_components || [];
  for (const comp of components) {
    if (comp?.design?.screens) {
      for (const s of comp.design.screens) {
        if (!isUiScreen(s)) {
          console.log(`[Stitch] Filtered non-UI screen: type=${s.screenType}, displayMode=${s.screenMetadata?.displayMode}, title="${s.title}"`);
          continue;
        }

        const screenId = typeof s.name === 'string' && s.name.includes('/screens/')
          ? s.name.split('/screens/')[1]
          : s.id || null;

        results.push({
          stitchScreenId: screenId,
          title: s.title || 'Untitled Screen',
          screenshotUrl: s.screenshot?.downloadUrl || null,
          htmlUrl: s.htmlCode?.downloadUrl || null,
          deviceType: s.deviceType || null,
          figmaExportUrl: s.figmaExport?.downloadUrl || null,
          prototypeData: s.screenMetadata?.prototypeSpec || null,
        });
      }
    }
  }
  return results;
}

const generationProgress = new Map();

export function getGenerationProgress(wireframeId) {
  return generationProgress.get(wireframeId) || null;
}

function setProgress(wireframeId, step, total, detail) {
  generationProgress.set(wireframeId, { step, total, detail, ts: Date.now() });
}

function clearProgress(wireframeId) {
  generationProgress.delete(wireframeId);
}

async function generateWithStitch(apiKey, title, prdContent, deviceType, wireframeId) {
  const { stitch, client } = await getStitchClient(apiKey);
  const stitchDevice = deviceType === 'MOBILE' ? 'MOBILE' : deviceType === 'TABLET' ? 'TABLET' : 'DESKTOP';
  const deviceLabel = deviceType === 'MOBILE' ? 'mobile app' : deviceType === 'TABLET' ? 'tablet app' : 'web application';

  try {
    setProgress(wireframeId, 0, 3, 'Creating Stitch project...');
    console.log(`[Stitch] Creating project: "${title}"`);
    const project = await stitch.createProject(title);
    const projectId = project.id;
    console.log(`[Stitch] Project created: ${projectId}`);

    setProgress(wireframeId, 1, 3, 'Generating screens via Stitch AI (this may take 1-2 min)...');

    const fullPrompt = `Design all the key UI screens for a ${deviceLabel} based on this PRD. Generate actual visual UI screens with real components, navigation, forms, cards, buttons — NOT text documents or summaries.\n\nPRD:\n${prdContent}`;

    console.log(`[Stitch] Sending full PRD to Stitch (${fullPrompt.length} chars, device: ${stitchDevice})`);
    const result = await client.callTool('generate_screen_from_text', {
      projectId,
      prompt: fullPrompt,
      deviceType: stitchDevice,
    });

    setProgress(wireframeId, 2, 3, 'Processing generated screens...');
    const allScreens = extractScreenFromRaw(result);
    console.log(`[Stitch] Extracted ${allScreens.length} UI screens from Stitch response`);

    if (allScreens.length === 0) {
      console.warn('[Stitch] No UI screens from first call, retrying with simpler prompt...');
      const retryPrompt = `Design the main screens for: ${title}. Include home, key feature screens, and any authentication flows. Product type: ${deviceLabel}.`;
      const retryResult = await client.callTool('generate_screen_from_text', {
        projectId,
        prompt: retryPrompt,
        deviceType: stitchDevice,
      });
      const retryScreens = extractScreenFromRaw(retryResult);
      console.log(`[Stitch] Retry got ${retryScreens.length} screens`);
      allScreens.push(...retryScreens);
    }

    setProgress(wireframeId, 3, 3, 'Done!');
    return { projectId, screens: allScreens };
  } finally {
    await client.close().catch(() => {});
  }
}

export async function getStitchApiKey(prismaClient, userId) {
  const row = await prismaClient.integrationConfig.findUnique({
    where: { userId_provider: { userId, provider: 'STITCH' } }
  });
  const c = fromJson(row?.configEncrypted, {});
  const fromUser = String(c.apiKey || '').trim();
  if (fromUser) return fromUser;
  return process.env.STITCH_API_KEY ? String(process.env.STITCH_API_KEY).trim() : '';
}

async function generateFlowGraph(aiConfig, prds, screens) {
  if (!aiConfig || !integrationCanRunLlm(aiConfig)) return null;
  if (screens.length < 2) return null;

  try {
    const screenList = screens.map((s, i) => `${i}: "${s.title}"`).join(', ');
    const prdTitles = prds.map(p => p.title).join(', ');

    const prompt = `Analyze these generated screens and create a simple, clean user flow.
Screens: [${screenList}]

Rules:
- Each screen should have AT MOST 2 outgoing edges (keep it clean)
- Only add branching where truly necessary (e.g., login success/failure)
- Prefer a mostly linear main flow with occasional branches
- Every screen should be reachable from screen 0
- Do NOT create back-edges (no loops) — only forward flow

Output ONLY a JSON object (no markdown, no explanation):
{"edges":[{"from":0,"to":1,"label":"Next"},{"from":1,"to":2,"label":"Success"}]}`;

    const raw = await callLLM(aiConfig, prompt, `Product: ${prdTitles}`);
    let text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const nodes = screens.map((_, i) => i);
    const edges = Array.isArray(parsed.edges) ? parsed.edges.filter(e =>
      typeof e.from === 'number' && typeof e.to === 'number' &&
      e.from >= 0 && e.from < screens.length &&
      e.to >= 0 && e.to < screens.length &&
      e.from !== e.to &&
      e.to > e.from
    ) : [];
    if (edges.length === 0) return null;
    return { nodes, edges };
  } catch (err) {
    console.warn(`[FlowGraph] AI flow generation failed: ${err.message}`);
    return null;
  }
}

function buildLinearFlowGraph(screenCount) {
  const nodes = Array.from({ length: screenCount }, (_, i) => i);
  const edges = [];
  for (let i = 0; i < screenCount - 1; i++) {
    edges.push({ from: i, to: i + 1, label: '' });
  }
  return { nodes, edges };
}

export async function generateWireframesFromPrd({ prds, userId, deviceType, aiConfig, stitchApiKey }) {
  const dt = deviceType || 'DESKTOP';
  const fullPrdContent = mergeFullPrdContent(prds);
  const wireframeTitle = prds.length === 1
    ? `${prds[0].title} — Wireframes`
    : `${prds.map(p => p.title).join(' + ')} — Wireframes`;

  const wireframe = await prisma.wireframe.create({
    data: { userId, title: wireframeTitle, deviceType: dt, status: 'generating' }
  });

  try {
    const stitchKey = String(stitchApiKey || '').trim();

    if (stitchKey) {
      console.log(`[Stitch] Generating wireframes from ${prds.length} PRD(s) via Stitch (${dt})`);
      const result = await generateWithStitch(stitchKey, wireframeTitle, fullPrdContent, dt, wireframe.id);

      await prisma.wireframe.update({
        where: { id: wireframe.id },
        data: { stitchProjectId: result.projectId }
      });

      for (let i = 0; i < result.screens.length; i++) {
        const s = result.screens[i];
        await prisma.wireframeScreen.create({
          data: {
            wireframeId: wireframe.id,
            title: s.title,
            prompt: 'Generated by Stitch',
            order: i,
            screenshotUrl: s.screenshotUrl || null,
            htmlUrl: s.htmlUrl || null,
            stitchScreenId: s.stitchScreenId || null,
            figmaExportUrl: s.figmaExportUrl || null,
            prototypeData: s.prototypeData ? JSON.stringify(s.prototypeData) : null,
          }
        });
      }

      if (result.screens.length === 0) {
        throw new Error('Stitch did not return any UI screens. Try again or check your API key.');
      }

      const flowGraph = await generateFlowGraph(aiConfig, prds, result.screens)
        || buildLinearFlowGraph(result.screens.length);
      await prisma.wireframe.update({
        where: { id: wireframe.id },
        data: { flowGraph: JSON.stringify(flowGraph) }
      });

    } else if (integrationCanRunLlm(aiConfig)) {
      console.log(`[Wireframe] AI-only specs for "${wireframeTitle}" (no Stitch key)`);
      setProgress(wireframe.id, 1, 3, 'Generating screen specs via AI...');
      const screens = await generateAiFallback(aiConfig, prds, dt);
      setProgress(wireframe.id, 2, 3, 'Saving screens...');

      for (let i = 0; i < screens.length; i++) {
        const s = screens[i];
        await prisma.wireframeScreen.create({
          data: {
            wireframeId: wireframe.id,
            title: s.title || `Screen ${i + 1}`,
            prompt: s.description || '',
            order: i,
            htmlUrl: JSON.stringify({
              elements: s.elements || [],
              flow: screens[i + 1]?.title || null,
              device: dt,
            }),
          }
        });
      }

      setProgress(wireframe.id, 3, 3, 'Generating flow graph...');
      const flowGraph = await generateFlowGraph(aiConfig, prds, screens)
        || buildLinearFlowGraph(screens.length);
      await prisma.wireframe.update({
        where: { id: wireframe.id },
        data: { flowGraph: JSON.stringify(flowGraph) }
      });
    } else {
      throw new Error('Configure either a Stitch API key or an AI provider in Settings.');
    }

    await prisma.wireframe.update({ where: { id: wireframe.id }, data: { status: 'ready' } });
    clearProgress(wireframe.id);
    return prisma.wireframe.findUnique({
      where: { id: wireframe.id },
      include: { screens: { orderBy: { order: 'asc' } } }
    });
  } catch (err) {
    clearProgress(wireframe.id);
    await prisma.wireframe.update({ where: { id: wireframe.id }, data: { status: 'error' } }).catch(() => {});
    throw err;
  }
}

export async function generateStandaloneWireframe({ title, brief, userId, deviceType, aiConfig, stitchApiKey }) {
  const dt = deviceType || 'DESKTOP';

  const wireframe = await prisma.wireframe.create({
    data: { userId, title: title || 'Untitled Wireframe', deviceType: dt, status: 'generating' }
  });

  try {
    const stitchKey = String(stitchApiKey || '').trim();

    if (stitchKey) {
      const result = await generateWithStitch(stitchKey, title, brief, dt, wireframe.id);
      await prisma.wireframe.update({
        where: { id: wireframe.id },
        data: { stitchProjectId: result.projectId }
      });
      for (let i = 0; i < result.screens.length; i++) {
        const s = result.screens[i];
        await prisma.wireframeScreen.create({
          data: {
            wireframeId: wireframe.id, title: s.title, prompt: brief, order: i,
            screenshotUrl: s.screenshotUrl || null, htmlUrl: s.htmlUrl || null,
            stitchScreenId: s.stitchScreenId || null,
            figmaExportUrl: s.figmaExportUrl || null,
            prototypeData: s.prototypeData ? JSON.stringify(s.prototypeData) : null,
          }
        });
      }
      if (result.screens.length === 0) throw new Error('Stitch did not return any UI screens.');

      const flowGraph = buildLinearFlowGraph(result.screens.length);
      await prisma.wireframe.update({
        where: { id: wireframe.id },
        data: { flowGraph: JSON.stringify(flowGraph) }
      });
    } else if (integrationCanRunLlm(aiConfig)) {
      setProgress(wireframe.id, 1, 2, 'Generating via AI...');
      const raw = await callLLM(aiConfig,
        `You are a UX designer. Create 4-6 screen specs for a ${dt.toLowerCase()} app.
Output ONLY a JSON array (no fences): [{"title":"Screen Name","description":"Brief","elements":["el1","el2"]}]`,
        `Product: ${title}\nBrief: ${brief}`);
      let text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      const match = text.match(/\[[\s\S]*\]/);
      const screens = match ? JSON.parse(match[0]) : [{ title: 'Main', description: brief, elements: ['Content'] }];
      setProgress(wireframe.id, 2, 2, 'Saving...');
      for (let i = 0; i < screens.length; i++) {
        const s = screens[i];
        await prisma.wireframeScreen.create({
          data: {
            wireframeId: wireframe.id, title: s.title || `Screen ${i + 1}`,
            prompt: s.description || brief, order: i,
            htmlUrl: JSON.stringify({ elements: s.elements || [], flow: screens[i + 1]?.title || null, device: dt }),
          }
        });
      }
      const flowGraph = buildLinearFlowGraph(screens.length);
      await prisma.wireframe.update({
        where: { id: wireframe.id },
        data: { flowGraph: JSON.stringify(flowGraph) }
      });
    } else {
      throw new Error('Configure a Stitch API key or AI provider in Settings.');
    }

    await prisma.wireframe.update({ where: { id: wireframe.id }, data: { status: 'ready' } });
    clearProgress(wireframe.id);
    return prisma.wireframe.findUnique({
      where: { id: wireframe.id },
      include: { screens: { orderBy: { order: 'asc' } } }
    });
  } catch (err) {
    clearProgress(wireframe.id);
    await prisma.wireframe.update({ where: { id: wireframe.id }, data: { status: 'error' } }).catch(() => {});
    throw err;
  }
}

async function generateAiFallback(aiConfig, prds, deviceType) {
  const fullContent = mergeFullPrdContent(prds);
  const titles = prds.map(p => p.title).join(', ');
  const raw = await callLLM(aiConfig,
    `You are a UX designer. Extract all the key screens from this PRD for a ${deviceType.toLowerCase()} app.
Output ONLY a JSON array: [{"title":"Screen","description":"Brief","elements":["el1"]}]`,
    `Products: ${titles}\n\n${fullContent.slice(0, 8000)}`);
  let text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array in AI response');
  return JSON.parse(match[0]);
}

export async function syncStitchScreens({ wireframe, stitchApiKey }) {
  const key = String(stitchApiKey || '').trim();
  if (!key) throw new Error('Stitch API key required');
  if (!wireframe.stitchProjectId) throw new Error('No Stitch project linked');
  const { stitch, client } = await getStitchClient(key);
  try {
    const project = stitch.project(wireframe.stitchProjectId);
    const stitchScreens = await project.screens();
    const dbScreens = wireframe.screens || [];
    let synced = 0;
    for (const dbScreen of dbScreens) {
      if (!dbScreen.stitchScreenId) continue;
      const match = stitchScreens.find(s => s.id === dbScreen.stitchScreenId);
      if (!match) continue;
      try {
        const screenshotUrl = await match.getImage();
        const htmlUrl = await match.getHtml();
        const updates = {};
        if (screenshotUrl && screenshotUrl !== dbScreen.screenshotUrl) updates.screenshotUrl = screenshotUrl;
        if (htmlUrl && htmlUrl !== dbScreen.htmlUrl) updates.htmlUrl = htmlUrl;
        const title = match.data?.title;
        if (title && title !== dbScreen.title) updates.title = title;
        if (Object.keys(updates).length > 0) {
          await prisma.wireframeScreen.update({ where: { id: dbScreen.id }, data: updates });
          synced++;
        }
      } catch (err) { console.warn(`[Sync] ${dbScreen.title}: ${err.message}`); }
    }
    const existingIds = new Set(dbScreens.map(s => s.stitchScreenId).filter(Boolean));
    for (const ns of stitchScreens.filter(s => !existingIds.has(s.id))) {
      try {
        const screenshotUrl = await ns.getImage().catch(() => null);
        const htmlUrl = await ns.getHtml().catch(() => null);
        await prisma.wireframeScreen.create({
          data: { wireframeId: wireframe.id, title: ns.data?.title || 'New Screen',
            prompt: 'From Stitch', order: dbScreens.length + synced,
            screenshotUrl, htmlUrl, stitchScreenId: ns.id }
        });
        synced++;
      } catch (err) { console.warn(`[Sync] New: ${err.message}`); }
    }
    return prisma.wireframe.findUnique({ where: { id: wireframe.id }, include: { screens: { orderBy: { order: 'asc' } } } });
  } finally { await client.close().catch(() => {}); }
}

export async function editWireframeScreen({ wireframe, screenId, instruction, stitchApiKey }) {
  const screen = await prisma.wireframeScreen.findUnique({ where: { id: screenId } });
  if (!screen) throw new Error('Screen not found');
  let newScreenshot;
  if (wireframe.stitchProjectId && screen.stitchScreenId) {
    const key = String(stitchApiKey || '').trim();
    if (key) {
      try {
        const { stitch, client } = await getStitchClient(key);
        try {
          const project = stitch.project(wireframe.stitchProjectId);
          const screenObj = await project.getScreen(screen.stitchScreenId);
          const stitchDevice = wireframe.deviceType === 'MOBILE' ? 'MOBILE' : wireframe.deviceType === 'TABLET' ? 'TABLET' : 'DESKTOP';
          const edited = await screenObj.edit(instruction, stitchDevice);
          newScreenshot = edited.data?.screenshot?.downloadUrl;
        } finally { await client.close().catch(() => {}); }
      } catch (err) { console.warn('[Stitch] Edit failed:', err.message); }
    }
  }
  const editHistory = fromJson(screen.editHistory, []);
  editHistory.push({ instruction, timestamp: new Date().toISOString() });
  return prisma.wireframeScreen.update({
    where: { id: screenId },
    data: { prompt: `${screen.prompt}\nEdit: ${instruction}`, editHistory, ...(newScreenshot ? { screenshotUrl: newScreenshot } : {}) }
  });
}
