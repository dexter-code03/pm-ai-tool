import { Router } from 'express';
import OpenAI from 'openai';
import { prisma } from '../lib/prisma.js';
import { fromJson } from '../lib/json.js';
import { getActiveAiConfig, callLLM } from '../services/ai.js';
import { buildDocxBuffer, buildMarkdown, buildJsonExport, buildHtmlDocument } from '../services/export.js';
import { notifySlackForUser } from '../lib/slackNotify.js';
import { recordGenerationMetric } from '../lib/generationMetrics.js';

const router = Router();

function parseAiJson(raw) {
  let cleaned = raw;
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)(?:```|$)/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  const jsonStart = cleaned.indexOf('{');
  if (jsonStart >= 0) cleaned = cleaned.slice(jsonStart);

  try {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* try repair */ }

  let repaired = cleaned;
  let braceDepth = 0, bracketDepth = 0, inString = false, escape = false;
  for (let i = 0; i < repaired.length; i++) {
    const ch = repaired[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braceDepth++;
    if (ch === '}') braceDepth--;
    if (ch === '[') bracketDepth++;
    if (ch === ']') bracketDepth--;
  }

  if (braceDepth > 0 || bracketDepth > 0) {
    const trailing = repaired.search(/,\s*$/);
    if (trailing >= 0) repaired = repaired.slice(0, trailing);
    while (bracketDepth > 0) { repaired += ']'; bracketDepth--; }
    while (braceDepth > 0) { repaired += '}'; braceDepth--; }
    console.log('[parseAiJson] Repaired truncated JSON');
  }

  return JSON.parse(repaired);
}

async function createPrdNotification(userId, prdId, title) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: 'prd',
        title: 'PRD created',
        message: title || 'New PRD',
        prdId
      }
    });
  } catch {
    /* optional */
  }
}

const LAYER_ROLE = `You are a world-class product manager who has shipped products at companies like Google, Stripe, and Notion. You write PRDs that are immediately actionable by engineering, design, and QA teams. Every sentence adds value — no filler, no placeholders, no generic text. You think in systems, user journeys, edge cases, and measurable outcomes.`;

const LAYER_QUALITY = `Output valid JSON only — no markdown fences, no commentary.
Return: { "title": string, "sections": [...] }

Each section object MUST have:
- "id": unique string (e.g. "sec_01", "sec_02")
- "num": section number as string (e.g. "01", "02")
- "title": section heading
- "type": one of "text" | "list" | "table"
- "confidence": "high" (from user input) | "mid" (AI inferred) | "low" (speculative)
- For "text" type: include "content" (string with rich markdown: **bold**, *italic*, \`code\`, ### sub-headings, - bullets, > callouts)
- For "list" type: include "items" (string[]) — each item should be a complete sentence or specification
- For "table" type: include "headers" (string[]) and "rows" (string[][]) — tables MUST have 3+ rows of real data

QUALITY RULES:
- Use **bold** for key terms, metrics, and important values throughout
- Include specific numbers, percentages, and timeframes (e.g. "reduce load time by **40%** to under **200ms**" not just "improve performance")
- User stories must follow "As a [persona], I want [goal], so that [benefit]" format
- Acceptance criteria must be testable (Given/When/Then or checkbox format)
- Tables must contain realistic data, not placeholder rows
- Cross-reference between sections (e.g. "See §04 User Stories" or "References metric M-01 from §03")`;

const TEMPLATE_SCHEMAS = {
  standard: `Generate exactly these 15 sections with the specified types:
1) "Executive Summary" (text) — 2-3 paragraphs covering problem, solution, key metrics, and strategic alignment. Include a **TL;DR** line.
2) "Problem Statement" (text) — Current state, pain points with data, impact on users/business. Include "**Problem Hypothesis**" and "**Evidence**" sub-sections.
3) "Goals & Success Metrics" (table) — Headers: Metric ID, Metric Name, Current Baseline, Target, Measurement Method, Timeline. At least 5 rows of KPIs.
4) "Target Users & Personas" (text) — 2-3 detailed personas with name, role, demographics, goals, frustrations, tech proficiency, and a day-in-the-life scenario.
5) "User Stories & Acceptance Criteria" (list) — 8-15 user stories in "As a [persona], I want [goal], so that [benefit]" format. Include priority (P0/P1/P2) and acceptance criteria for each.
6) "Functional Requirements" (table) — Headers: Req ID, Feature, Description, Priority, Acceptance Criteria, Dependencies. At least 10 rows.
7) "Non-Functional Requirements" (table) — Headers: Category, Requirement, Target, Measurement. Cover: Performance, Security, Scalability, Accessibility, Reliability, Compliance.
8) "User Flow & Information Architecture" (text) — Describe the primary and secondary user journeys step-by-step with decision points. Use numbered steps and **bold** for screen names.
9) "Technical Architecture" (text) — System components, data flow, tech stack recommendations, integration points. Include a text-based architecture diagram description.
10) "Data Model & API Surface" (table) — Headers: Entity/Endpoint, Type, Fields/Parameters, Relationships/Response, Notes. Cover key data entities and API endpoints.
11) "UI/UX Requirements" (list) — Detailed design requirements: layout, interaction patterns, responsive behavior, accessibility standards (WCAG level), animation/transition specs.
12) "Dependencies & Integration Points" (table) — Headers: Dependency, Type (Internal/External/Third-party), Status, Risk Level, Mitigation. Include all system and team dependencies.
13) "Release Plan & Timeline" (table) — Headers: Phase, Milestone, Deliverables, Owner, Start Date, End Date, Status. Cover MVP through full launch.
14) "Risks & Mitigations" (table) — Headers: Risk ID, Risk Description, Probability (H/M/L), Impact (H/M/L), Mitigation Strategy, Owner, Contingency.
15) "Open Questions & Decisions Needed" (list) — Unresolved questions grouped by category (Technical, Business, Design, Legal) with proposed owners and deadlines.`,

  mobile: `Generate exactly these 14 sections:
1) "Executive Summary" (text) — Problem, solution, target platforms, key metrics, strategic alignment.
2) "Problem Statement & Market Context" (text) — Pain points, competitive landscape, market size data.
3) "Target Users & Personas" (text) — 2-3 mobile-specific personas with device preferences, usage patterns.
4) "Platform & Device Requirements" (table) — Headers: Platform, Min Version, Screen Sizes, Specific Constraints, Priority.
5) "Screen Flow & Navigation Map" (text) — Detailed screen-by-screen flow with navigation patterns, gesture support, deep linking.
6) "Core Features & Requirements" (table) — Headers: Feature ID, Feature, Description, Platform (iOS/Android/Both), Priority, Sprint.
7) "Offline & Sync Strategy" (text) — Offline capabilities, data sync approach, conflict resolution, storage limits.
8) "Push Notifications & Engagement" (table) — Headers: Trigger, Content Template, Channel, Frequency Cap, Opt-in Required.
9) "Performance & Quality Targets" (table) — Headers: Metric, Target, Measurement Tool. Cover: startup time, frame rate, memory, battery, crash rate.
10) "App Store & Distribution" (list) — Store listing requirements, review guidelines compliance, A/B test plans, ASO strategy.
11) "Security, Privacy & Compliance" (list) — Data handling, encryption, biometric auth, GDPR/CCPA, permissions model.
12) "Analytics & Instrumentation" (table) — Headers: Event Name, Trigger, Properties, Dashboard.
13) "Timeline & Sprint Plan" (table) — Headers: Sprint, Duration, Deliverables, Dependencies, Risk.
14) "Risks & Mitigations" (table) — Headers: Risk, Probability, Impact, Mitigation, Owner.`,

  api: `Generate exactly these 13 sections:
1) "Executive Summary" (text) — API purpose, target consumers, key capabilities.
2) "API Overview" (text) — Base URL, versioning strategy, content types, rate limits overview.
3) "Authentication & Authorization" (text) — Auth methods (OAuth2/API Key/JWT), scopes, token lifecycle.
4) "Rate Limiting & Throttling" (table) — Headers: Tier, Requests/min, Burst Limit, Retry-After, Cost.
5) "Endpoint Specifications" (table) — Headers: Method, Path, Description, Auth Required, Request Body, Response, Status Codes. At least 8 endpoints.
6) "Data Models" (table) — Headers: Model, Field, Type, Required, Description, Constraints.
7) "Error Handling" (table) — Headers: HTTP Status, Error Code, Message Template, Resolution.
8) "Pagination, Filtering & Sorting" (text) — Cursor vs offset, filter syntax, sort parameters, max page size.
9) "Webhooks & Events" (table) — Headers: Event, Trigger, Payload Schema, Retry Policy.
10) "SDK & Client Libraries" (list) — Supported languages, installation, quick start code snippets.
11) "Testing & Sandbox" (text) — Sandbox environment, test credentials, mock data, CI integration.
12) "Migration & Versioning" (text) — Breaking vs non-breaking changes, deprecation timeline, sunset policy.
13) "SLA & Support" (table) — Headers: Tier, Uptime SLA, Response Time, Support Channel, Escalation.`,

  growth: `Generate exactly these 12 sections:
1) "Executive Summary" (text) — Experiment hypothesis, expected impact, strategic context.
2) "Hypothesis & Theory of Change" (text) — Formal hypothesis statement, behavioral model, leading indicators.
3) "Current Baseline Metrics" (table) — Headers: Metric, Current Value, Source, Measurement Period, Confidence Level.
4) "Experiment Design" (text) — Type (A/B/multivariate), allocation method, duration calculation, statistical power.
5) "Variants & Control" (table) — Headers: Variant, Description, Key Differences, Expected Lift, Implementation Effort.
6) "Success Metrics & Guardrails" (table) — Headers: Metric Type (Primary/Secondary/Guardrail), Metric, MDE, Current, Target.
7) "Target Audience & Segmentation" (text) — Inclusion/exclusion criteria, segment sizes, geographic/demographic filters.
8) "Implementation Requirements" (list) — Feature flags, tracking events, QA checklist, rollback triggers.
9) "Sample Size & Duration" (table) — Headers: Metric, MDE, Power, Required N per Variant, Duration at Current Traffic.
10) "Rollout Plan" (text) — Phased rollout percentages, monitoring checkpoints, go/no-go criteria.
11) "Rollback & Safety" (list) — Automated rollback triggers, manual escalation path, data cleanup.
12) "Post-Experiment Analysis Plan" (text) — Analysis timeline, segmentation deep dives, follow-up experiments, documentation.`
};

const LAYER_DEPTH = `DEPTH REQUIREMENTS:
- Every "text" section must be 150-400 words with sub-sections using ### markdown headings
- Every "list" section must have 8-15 substantive items (not one-word entries)
- Every "table" must have 5-12 rows of realistic, specific data (no placeholder/example rows)
- Use cross-references between sections (e.g. "Aligns with Goal M-03 in §03")
- Include edge cases, error states, and failure scenarios where relevant
- Mention specific technologies, tools, or standards by name when applicable`;

const LAYER_FORMAT = `FORMAT RULES:
- Use rich markdown in text content: **bold** for emphasis, \`code\` for technical terms, ### for sub-headings, - for bullet points, > for callout blocks
- Tables must have properly aligned data — no empty cells
- Section numbers must be zero-padded: "01", "02", ... "15"
- Title should follow format: "[Product/Feature Name] — PRD v1.0"
- Do NOT wrap output in markdown code fences
- Return raw JSON only`;

router.get('/', async (req, res) => {
  try {
    const prds = await prisma.prd.findMany({
      where: { userId: req.user.userId },
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ prds });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list PRDs' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, content, status } = req.body;
    const prd = await prisma.prd.create({
      data: {
        userId: req.user.userId,
        title: title || 'Untitled PRD',
        content: content || [],
        status: status || 'draft'
      }
    });
    await createPrdNotification(req.user.userId, prd.id, prd.title);
    res.status(201).json({ prd });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create PRD' });
  }
});

/** SSE: 5-layer prompt → streamed tokens, then final JSON parse for sections */
router.post('/generate', async (req, res) => {
  const t0 = Date.now();
  try {
    const aiConfig = await getActiveAiConfig(prisma, req.user.userId);
    if (!aiConfig) {
      return res.status(400).json({ error: 'Configure an AI provider in Settings' });
    }

    const { brief, templateHint, jiraContext } = req.body;
    const c = fromJson(aiConfig.configEncrypted, {});
    const provider = String(aiConfig.provider).toUpperCase();

    const templateKey = String(templateHint || 'standard').toLowerCase();
    const templateSchema = TEMPLATE_SCHEMAS[templateKey] || TEMPLATE_SCHEMAS.standard;

    const contextBlock = [
      jiraContext ? `Jira / ticket context:\n${JSON.stringify(jiraContext)}` : '',
      brief ? `Product brief:\n${brief}` : ''
    ]
      .filter(Boolean)
      .join('\n\n');

    const userPrompt = `${LAYER_QUALITY}\n\n${LAYER_DEPTH}\n\n${LAYER_FORMAT}\n\nTemplate: ${templateKey}\n${templateSchema}\n\n${contextBlock}\n\nProduce a complete, detailed PRD as a JSON object.`;

    if (provider === 'OPENAI') {
      const client = new OpenAI({ apiKey: c.apiKey });
      const model = c.model || 'gpt-4o';
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const stream = await client.chat.completions.create({
        model,
        stream: true,
        messages: [
          { role: 'system', content: LAYER_ROLE },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.35
      });

      let full = '';
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) {
          full += text;
          res.write(`data: ${JSON.stringify({ type: 'token', text })}\n\n`);
        }
      }

      let parsed;
      try {
        parsed = parseAiJson(full);
      } catch (parseErr) {
        console.error('[PRD Generate OpenAI] JSON parse failed:', parseErr.message);
        parsed = { title: 'Generated PRD', sections: [] };
      }

      const prd = await prisma.prd.create({
        data: {
          userId: req.user.userId,
          title: parsed.title || 'Generated PRD',
          content: parsed.sections || parsed.content || [],
          status: 'draft'
        }
      });

      notifySlackForUser(req.user.userId, `New PRD generated: ${prd.title}`).catch(() => {});
      await createPrdNotification(req.user.userId, prd.id, prd.title);

      void recordGenerationMetric(prisma, req.user.userId, 'prd_generate_openai', Date.now() - t0);
      res.write(`data: ${JSON.stringify({ type: 'done', prd })}\n\n`);
      res.end();
      return;
    }

    const text = await callLLM(aiConfig, LAYER_ROLE, userPrompt);
    let parsed;
    try {
      parsed = parseAiJson(text);
    } catch (parseErr) {
      console.error('[PRD Generate] JSON parse failed:', parseErr.message);
      console.error('[PRD Generate] Raw response (first 500):', text.slice(0, 500));
      parsed = { title: 'Generated PRD', sections: [] };
    }

    const sections = parsed.sections || parsed.content || [];
    if (!Array.isArray(sections) || sections.length === 0) {
      console.warn('[PRD Generate] No sections found. Keys in parsed:', Object.keys(parsed));
    }

    const prd = await prisma.prd.create({
      data: {
        userId: req.user.userId,
        title: parsed.title || 'Generated PRD',
        content: sections,
        status: 'draft'
      }
    });

    notifySlackForUser(req.user.userId, `New PRD generated: ${prd.title}`).catch(() => {});
    await createPrdNotification(req.user.userId, prd.id, prd.title);

    void recordGenerationMetric(prisma, req.user.userId, 'prd_generate_llm', Date.now() - t0);
    res.json({ prd });
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Generation failed' });
  }
});

router.post('/:id/regenerate-section', async (req, res) => {
  try {
    const aiConfig = await getActiveAiConfig(prisma, req.user.userId);
    if (!aiConfig) return res.status(400).json({ error: 'No AI provider configured' });

    const prd = await prisma.prd.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!prd) return res.status(404).json({ error: 'PRD not found' });

    const { sectionId, hint } = req.body;
    const content = fromJson(prd.content, []);
    const section = content.find(s => s.id === sectionId);
    if (!section) return res.status(404).json({ error: 'Section not found' });

    const out = await callLLM(
      aiConfig,
      'Regenerate a single PRD section with improved clarity. Return JSON { "section": { ...full section object } } only.',
      `Section to regenerate:\n${JSON.stringify(section)}\n\nHint: ${hint || 'improve detail and clarity'}`
    );
    let parsed;
    try {
      const jsonMatch = out.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : out);
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }
    const newSection = parsed.section || parsed;
    const next = content.map(s => (s.id === sectionId ? { ...s, ...newSection, id: sectionId } : s));
    const updated = await prisma.prd.update({
      where: { id: prd.id },
      data: { content: next }
    });
    res.json({ prd: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/ai-assist', async (req, res) => {
  try {
    const aiConfig = await getActiveAiConfig(prisma, req.user.userId);
    if (!aiConfig) return res.status(400).json({ error: 'No AI provider configured' });

    const prd = await prisma.prd.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!prd) return res.status(404).json({ error: 'PRD not found' });

    const { action, selectedText, sectionContext } = req.body;
    const prompt = `Action: ${action}\n\nSelected text:\n${selectedText || ''}\n\nContext:\n${sectionContext || ''}\n\nReturn JSON { "suggestion": "..." }`;
    const out = await callLLM(aiConfig, 'You assist inline in a PRD editor.', prompt);
    let suggestion = out;
    try {
      const j = JSON.parse(out.match(/\{[\s\S]*\}/)?.[0] || '{}');
      suggestion = j.suggestion || out;
    } catch {
      /* use raw */
    }
    res.json({ suggestion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/versions', async (req, res) => {
  try {
    const prd = await prisma.prd.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!prd) return res.status(404).json({ error: 'PRD not found' });
    const versions = await prisma.prdVersion.findMany({
      where: { prdId: prd.id },
      orderBy: { versionNumber: 'desc' },
      include: { createdBy: { select: { name: true, email: true } } }
    });
    res.json({ versions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list versions' });
  }
});

router.post('/:id/versions', async (req, res) => {
  try {
    const prd = await prisma.prd.findFirst({
      where: { id: req.params.id, userId: req.user.userId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
    });
    if (!prd) return res.status(404).json({ error: 'PRD not found' });
    const { label } = req.body;
    const last = prd.versions?.[0];
    const version = await prisma.prdVersion.create({
      data: {
        prdId: prd.id,
        versionNumber: (last?.versionNumber || 0) + 1,
        label: label || null,
        contentSnapshot: prd.content,
        createdById: req.user.userId
      }
    });
    res.status(201).json({ version });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save version' });
  }
});

router.post('/:id/versions/:vid/restore', async (req, res) => {
  try {
    const prd = await prisma.prd.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!prd) return res.status(404).json({ error: 'PRD not found' });
    const ver = await prisma.prdVersion.findFirst({
      where: { id: req.params.vid, prdId: prd.id }
    });
    if (!ver) return res.status(404).json({ error: 'Version not found' });
    const snap = fromJson(ver.contentSnapshot, []);
    const updated = await prisma.prd.update({
      where: { id: prd.id },
      data: { content: snap }
    });
    res.json({ prd: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore' });
  }
});

router.get('/:id/comments', async (req, res) => {
  try {
    const prd = await prisma.prd.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!prd) return res.status(404).json({ error: 'PRD not found' });
    const comments = await prisma.comment.findMany({
      where: { prdId: prd.id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } }
    });
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list comments' });
  }
});

router.post('/:id/comments', async (req, res) => {
  try {
    const prd = await prisma.prd.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!prd) return res.status(404).json({ error: 'PRD not found' });
    const { sectionId, content } = req.body;
    if (!sectionId || !String(content || '').trim()) {
      return res.status(400).json({ error: 'sectionId and content required' });
    }
    const comment = await prisma.comment.create({
      data: {
        prdId: prd.id,
        userId: req.user.userId,
        sectionId: String(sectionId),
        content: String(content).trim()
      },
      include: { user: { select: { name: true } } }
    });
    res.status(201).json({ comment });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to add comment' });
  }
});

router.patch('/:id/comments/:commentId', async (req, res) => {
  try {
    const prd = await prisma.prd.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!prd) return res.status(404).json({ error: 'PRD not found' });
    const existing = await prisma.comment.findFirst({
      where: { id: req.params.commentId, prdId: prd.id }
    });
    if (!existing) return res.status(404).json({ error: 'Comment not found' });
    const { status } = req.body;
    const next = status === 'resolved' ? 'resolved' : 'open';
    const comment = await prisma.comment.update({
      where: { id: existing.id },
      data: { status: next }
    });
    res.json({ comment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

router.post('/:id/duplicate', async (req, res) => {
  try {
    const src = await prisma.prd.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!src) return res.status(404).json({ error: 'PRD not found' });
    const copy = await prisma.prd.create({
      data: {
        userId: req.user.userId,
        title: `${src.title} (Copy)`,
        content: fromJson(src.content, []),
        status: 'draft',
        jiraKey: src.jiraKey
      }
    });
    await createPrdNotification(req.user.userId, copy.id, copy.title);
    res.status(201).json({ prd: copy });
  } catch (err) {
    res.status(500).json({ error: 'Failed to duplicate' });
  }
});

router.get('/:id/export/:format', async (req, res) => {
  try {
    const prd = await prisma.prd.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!prd) return res.status(404).json({ error: 'PRD not found' });

    const format = String(req.params.format || '').toLowerCase();
    const sections = fromJson(prd.content, []);

    if (format === 'json') {
      const payload = buildJsonExport(prd, sections);
      return res.json({ content: JSON.stringify(payload, null, 2), filename: `${prd.title.replace(/[^a-z0-9]/gi, '_').slice(0, 50)}.json` });
    }

    if (format === 'md' || format === 'markdown') {
      const md = buildMarkdown(prd.title, sections);
      return res.json({ content: md, filename: `${prd.title.replace(/[^a-z0-9]/gi, '_').slice(0, 50)}.md` });
    }

    if (format === 'docx') {
      const buf = await buildDocxBuffer(prd.title, sections);
      const b64 = Buffer.from(buf).toString('base64');
      return res.json({ content: b64, encoding: 'base64', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename: `${prd.title.replace(/[^a-z0-9]/gi, '_').slice(0, 50)}.docx` });
    }

    if (format === 'html' || format === 'pdf') {
      const html = buildHtmlDocument(prd, sections);
      return res.json({ html, filename: `${prd.title.replace(/[^a-z0-9]/gi, '_').slice(0, 50)}.html` });
    }

    if (format === 'confluence') {
      const html = buildHtmlDocument(prd, sections);
      return res.json({ content: html, format: 'confluence_html', filename: `${prd.title.replace(/[^a-z0-9]/gi, '_').slice(0, 50)}.html`, hint: 'Copy this HTML into Confluence using the Confluence editor insert HTML macro, or use the API.' });
    }

    if (format === 'notion') {
      const md = buildMarkdown(prd.title, sections);
      return res.json({ content: md, format: 'notion_markdown', filename: `${prd.title.replace(/[^a-z0-9]/gi, '_').slice(0, 50)}.md`, hint: 'Paste this markdown into Notion. Notion will auto-convert headings, lists, and tables.' });
    }

    res.status(400).json({ error: 'Unknown format' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export failed' });
  }
});

/** Wireframes linked to this PRD (for editor “linked wireframes” list). */
router.get('/:id/wireframes', async (req, res) => {
  try {
    const prd = await prisma.prd.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!prd) return res.status(404).json({ error: 'PRD not found' });

    const links = await prisma.prdWireframeLink.findMany({
      where: { prdId: req.params.id, unlinkedAt: null },
      include: {
        wireframe: {
          include: {
            screens: { orderBy: { order: 'asc' } },
            links: {
              where: { unlinkedAt: null },
              include: { prd: { select: { id: true, title: true, status: true } } }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    const wireframes = links.map((l) => l.wireframe);
    res.json({ wireframes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list wireframes for PRD' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const prd = await prisma.prd.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!prd) return res.status(404).json({ error: 'PRD not found' });
    res.json({ prd });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get PRD' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { title, content, status } = req.body;
    const existing = await prisma.prd.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!existing) return res.status(404).json({ error: 'PRD not found' });
    const prd = await prisma.prd.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(status !== undefined ? { status } : {})
      }
    });
    res.json({ prd });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update PRD' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.prd.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });
    if (!existing) return res.status(404).json({ error: 'PRD not found' });
    await prisma.prd.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete PRD' });
  }
});

export default router;
