# Program remainder — internal one-pager

## Headline number

**~30% left** of the full **production-ready / HTML-scope** program (use **28–32%** as estimation band).

Roughly **~68–72% done** in terms of intended surface area already reflected in this repo (core product, server, Settings hub, PRD→wireframes continuity).

**Full rubric (tables, usage):** [program-remainder-rubric.md](./program-remainder-rubric.md)

---

## Six backlog pillars (what drives the remainder)

| # | Pillar | Examples |
|---|--------|----------|
| 1 | **Identity / collaboration** | Google OAuth, Microsoft Teams |
| 2 | **Productized email** | Full email product (beyond SMTP/SendGrid fields in Settings) |
| 3 | **Quality** | E2E / contract tests, WCAG |
| 4 | **Metrics** | KPI store, time series, SLIs (see `server/routes/kpi.js` placeholders) |
| 5 | **AI / design pipelines** | AI learning depth; Figma-native wireframes vs Stitch |
| 6 | **Trust / ops** | SOC2 process, observability, enterprise admin |

---

## Chosen next pillar (for execution planning)

**Pillar: Quality — E2E smoke tests + CI gate**

**Rationale:** A minimal automated smoke path (login → dashboard → settings → PRD → wireframes) catches regressions across the stack before investing heavily in integrations (Teams, Google OAuth) or compliance-heavy work. WCAG and KPI store benefit once critical flows are stable and measurable.

**Explicitly not chosen yet (defer to follow-on milestones):** Microsoft Teams, Google OAuth, full email product, SOC2 program, Figma-native pipeline depth—sequence by business priority after the quality baseline.

**Status (rolling):** Smoke + a11y CI ([`e2e/`](../e2e/), [`.github/workflows/e2e.yml`](../.github/workflows/e2e.yml)). **KPI store:** [`GenerationMetric`](../server/prisma/schema.prisma) + [`GET /api/v1/kpi/summary`](../server/routes/kpi.js) (`p95GenerationMs`, admin `mau`). **Observability:** JSON request logs ([`server/middleware/requestLog.js`](../server/middleware/requestLog.js)), DB-aware [`/health`](../server/index.js). **Google OAuth** + **Teams webhooks:** [`googleIntegrations.js`](../server/routes/googleIntegrations.js), `TEAMS`/`GOOGLE` in Settings. **Still roadmap-scale:** SOC2 program, Figma-native pipeline depth, full email product, Graph-based Teams bot, AI learning store depth—see rubric table.
