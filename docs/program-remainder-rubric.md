# Full-program completion rubric (~30% left)

Canonical in-repo copy of the program remainder rubric. Use this for links from the [one-pager](./program-remainder-onepager.md).

## Single number

**~30%** of the overall **production-ready / full HTML-scope** program remains (same band as **~32%**; treat **28–32%** as normal estimation noise).

**Interpretation:** roughly **~68–72%** of that program is represented by what is already in the repo across core product, server capabilities, and the Settings hub + PRD→wireframe continuity work—not “100% shipped product,” but a large share of the **intended surface** for a multi-phase roadmap.

## Why this number barely moved after the Settings milestone

The Settings milestone (`SettingsPage`, `useIntegrationStatus`, wireframes/PRD continuity, `GET /api/v1/prds/:id/wireframes`) addresses:

- User-configurable integrations and preferences
- Capability-aware UX (banners, Settings CTAs)
- PRD → wireframes handoff (deep links, linked wireframes list)

That is a **narrow slice** of the full program. The bulk of the remaining **~30%** is **not** “finish core PRD editor,” but **integrations, quality/compliance, observability, and enterprise** work that was always outside that milestone.

## What still dominates the remainder

| Area | Typical scope | Note for this repo |
|------|----------------|-------------------|
| Identity / collaboration | Google OAuth, Microsoft Teams | Not covered by Jira/Figma OAuth in Settings |
| Productized email | Full email flows (not just SMTP fields in `server/routes/settings.js`) | Deeper product + deliverability |
| Quality | E2E/contract tests, WCAG | No `e2e/` suite at repo root; accessibility pass is separate |
| Metrics | KPI **store**, time series, SLIs | `server/routes/kpi.js` summary has `p95GenerationMs` / `mau` **null**—placeholder for richer metrics |
| AI / design pipelines | AI learning depth; Figma-native wireframes vs Stitch | Stitch path exists; “native Figma generation” is additional |
| Trust / ops | SOC2 **process**, observability, enterprise admin | Process + tooling, not only UI |

## How to use this rubric

- **Stakeholder comms:** headline **“~30% of full program scope left”**; clarify that **core PRD/wireframes UX** is largely in place while **enterprise/compliance/quality** drives the remainder.
- **Roadmap slicing:** sequence by dependency (e.g. observability before hard SLAs; E2E before refactors) and by business priority (Teams vs Google SSO vs WCAG).
- **Avoid double-counting:** items like “richer Settings/admin” are **partially** satisfied by the current Settings hub; the remainder is **org-wide / enterprise** admin, not user integration cards.

## Optional next execution plans

Pick a **single pillar** per phase (e.g. “E2E smoke + CI” or “WCAG pass on `apps/web`”) and scope it to 1–2 milestones—mixing all remainder items in one phase usually fails.
