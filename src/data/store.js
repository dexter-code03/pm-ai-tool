/* ═══════════════════════════════════════════════════════════
   PM AI TOOL — Data Store (localStorage-backed)
   Complete CRUD: PRDs, Templates, Wireframes, Versions,
   Comments, Feedback, Notifications, Settings
   ═══════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'pm_ai_tool_data';

// ─── Seed PRDs ───
const SEED_PRDS = [
  {
    id: 'prd-1',
    title: 'Checkout & Payment Flow Redesign',
    status: 'review',
    jiraKey: 'PROJ-441',
    template: 'Standard Feature PRD',
    icon: '📄',
    iconColor: 'blue',
    progress: 75,
    progressColor: '',
    sectionCount: 15,
    collaborators: [
      { initials: 'AK', name: 'Arjun Kumar', gradient: 'linear-gradient(135deg,#5B7EF8,#7C5BF8)', status: 'Editing now', statusColor: 'var(--teal)' },
      { initials: 'SR', name: 'Sarah Raina', gradient: 'linear-gradient(135deg,#2DD4B7,#5B7EF8)', status: '2h ago' },
      { initials: 'MJ', name: 'Mihail J.', gradient: 'linear-gradient(135deg,#F59E0B,#EF4444)', status: 'Yesterday' }
    ],
    lastEdited: '2h ago',
    createdAt: '2026-03-27T10:00:00Z',
    updatedAt: '2026-03-29T14:00:00Z',
    linkedWireframe: { id: 'wf-1', title: 'Payment Flow Screens', screens: 6, updated: '4h ago' },
    sections: [
      { id: 's1', num: '01', title: 'Executive Summary', confidence: 'high', type: 'text', locked: false, collapsed: false,
        content: 'The Checkout & Payment Flow Redesign aims to streamline the purchase journey for end-users by reducing friction at key conversion points. This initiative addresses a 23% cart abandonment rate identified in Q4 2025 analytics and introduces a unified payment interface supporting card payments, UPI, and BNPL options.\n\nThe expected outcome is a 15% increase in payment conversion and a 40% reduction in average checkout time from 4.2 minutes to under 2.5 minutes.',
        feedback: null },
      { id: 's2', num: '02', title: 'Problem Statement', confidence: 'high', type: 'text', locked: false, collapsed: false,
        content: 'Users face significant friction during the checkout process due to a multi-step form requiring 14 separate interactions, lack of saved payment methods, and no support for popular local payment methods (UPI, Paytm). This results in elevated drop-off rates particularly on mobile (38% abandonment) compared to desktop (12%).',
        feedback: null },
      { id: 's3', num: '03', title: 'User Personas & Stakeholders', confidence: 'high', type: 'list', locked: false, collapsed: false,
        items: ['Power Shopper — Recurring buyer, places 3+ orders/month, expects saved payment methods and one-click checkout', 'First-Time Buyer — New user discovering the platform, needs trust signals and simple payment flow', 'Mobile-First User — 68% of traffic, expects UPI/mobile wallet support and thumb-friendly UI', 'International Buyer — Needs multi-currency support and international card processing'],
        feedback: null },
      { id: 's4', num: '04', title: 'Goals & Success Metrics', confidence: 'mid', type: 'list', locked: false, collapsed: false,
        banner: { type: 'mid', text: '⚡ Medium confidence — inferred from ticket context. Please verify KPI targets.' },
        items: ['Reduce checkout abandonment rate from 23% to below 12% within 60 days of launch', 'Decrease average checkout completion time from 4.2 min to <2.5 min', 'Achieve 95%+ payment success rate across all supported methods', 'Support UPI, Paytm, NetBanking, Cards (Visa, MC, Amex), and BNPL (LazyPay, ZestMoney)', 'Mobile checkout conversion parity with desktop within Q2 2026'],
        feedback: null },
      { id: 's5', num: '05', title: 'User Stories', confidence: 'high', type: 'list', locked: false, collapsed: false,
        items: ['As a returning user, I want my saved cards to appear at checkout, so I can pay in one tap', 'As a mobile user, I want to pay via UPI, so I can use my preferred payment method', 'As a first-time buyer, I want guest checkout, so I don\'t need to create an account', 'As a budget-conscious user, I want to see BNPL options, so I can split my payment'],
        feedback: null },
      { id: 's6', num: '06', title: 'User Story Maps', confidence: 'mid', type: 'text', locked: false, collapsed: false,
        content: 'The user journey maps across three key pathways:\n\n1. Express Checkout — Saved card → One-tap pay → Confirmation (3 interactions)\n2. New Payment — Select method → Enter details → Verify → Confirmation (6 interactions)\n3. Guest Checkout — Enter email → Select method → Pay → Confirmation (5 interactions)',
        feedback: null },
      { id: 's7', num: '07', title: 'Functional Requirements', confidence: 'high', type: 'list', locked: false, collapsed: false,
        items: ['FR-001: One-page checkout consolidating shipping, billing, and payment into a single scrollable view', 'FR-002: Saved payment methods with tokenised card storage (PCI-DSS compliant)', 'FR-003: UPI intent flow and QR code generation for desktop', 'FR-004: Real-time payment status polling with optimistic UI updates', 'FR-005: Auto-fill address from previously completed orders', 'FR-006: BNPL eligibility check inline before payment method selection', 'FR-007: Guest checkout without mandatory account creation'],
        feedback: null },
      { id: 's8', num: '08', title: 'Non-Functional Requirements', confidence: 'high', type: 'list', locked: false, collapsed: false,
        items: ['NFR-001: Payment page load time < 1.5s on 4G connections', 'NFR-002: PCI-DSS Level 1 compliance for all card data handling', 'NFR-003: 99.99% uptime for payment processing endpoints', 'NFR-004: Support for 10,000 concurrent checkout sessions', 'NFR-005: WCAG 2.1 AA accessibility compliance'],
        feedback: null },
      { id: 's9', num: '09', title: 'Out of Scope', confidence: 'high', type: 'list', locked: false, collapsed: false,
        items: ['Cryptocurrency payment methods', 'International shipping cost calculator (handled by logistics module)', 'Subscription/recurring billing (planned for Q3 2026)', 'Loyalty points redemption at checkout'],
        feedback: null },
      { id: 's10', num: '10', title: 'Technical Considerations', confidence: 'mid', type: 'list', locked: false, collapsed: false,
        banner: { type: 'mid', text: '⚡ Medium confidence — AI inferred. Please verify with engineering team.' },
        items: ['Payment gateway: Razorpay (primary) with Stripe fallback for international cards', 'Card tokenisation via Razorpay Token HQ — no raw card data stored', 'UPI integration via PSP framework — deep link + QR fallback', 'WebSocket for real-time payment status updates', 'Redis-based idempotency keys for payment deduplication'],
        feedback: null },
      { id: 's11', num: '11', title: 'Acceptance Criteria', confidence: 'high', type: 'table', locked: false, collapsed: false,
        headers: ['#', 'Acceptance Criterion', 'Priority', 'Status'],
        rows: [
          ['AC-001', 'Given a user on the checkout page, when they select UPI, then a QR code appears within 2 seconds', 'P0', '✓ Done'],
          ['AC-002', 'Payment confirmation screen appears within 3 seconds of successful transaction', 'P0', 'In Dev'],
          ['AC-003', 'Guest checkout available without requiring account creation or email verification', 'P1', 'Pending'],
          ['AC-004', 'Saved card tokenisation passes PCI-DSS Level 1 security scan', 'P0', 'Pending']
        ],
        feedback: null },
      { id: 's12', num: '12', title: 'Dependencies', confidence: 'mid', type: 'list', locked: false, collapsed: false,
        items: ['Razorpay API v2 — payment gateway integration (contract pending)', 'Design team — Hi-Fi mockups for checkout flow (ETA: Apr 5)', 'Security team — PCI-DSS compliance review (scheduled: Apr 10)', 'Backend — Payment microservice API endpoints (in progress)'],
        feedback: null },
      { id: 's13', num: '13', title: 'Timeline & Milestones', confidence: 'mid', type: 'list', locked: false, collapsed: false,
        items: ['Week 1-2: Design finalization and API contract definition', 'Week 3-4: Core checkout UI + payment gateway integration', 'Week 5: UPI + BNPL integration and testing', 'Week 6: Security review + PCI-DSS compliance check', 'Week 7: Beta rollout (10% traffic) + monitoring', 'Week 8: Full rollout + post-launch analytics'],
        feedback: null },
      { id: 's14', num: '14', title: 'Open Questions', confidence: 'low', type: 'list', locked: false, collapsed: false,
        banner: { type: 'low', text: '⚠️ Low confidence — AI inferred these from ticket context. Please verify carefully.' },
        items: ['Should BNPL options be shown to all users or only based on eligibility pre-check at cart stage?', 'What is the fallback behaviour when UPI intent fails on the user\'s device?', 'Is international card support (non-INR) in scope for v1 or deferred?', 'Who owns PCI-DSS compliance sign-off — Security team or Engineering?'],
        feedback: null },
      { id: 's15', num: '15', title: 'Appendix & References', confidence: 'high', type: 'list', locked: false, collapsed: false,
        items: ['Jira Epic: PROJ-440 — Checkout Revamp', 'Figma: Payment Flow Screens v2.1', 'Razorpay API Documentation: https://razorpay.com/docs/api/', 'Q4 2025 Analytics Report — Cart Abandonment Analysis'],
        feedback: null }
    ],
    versions: [],
    comments: [],
    exports: []
  },
  {
    id: 'prd-2',
    title: 'Mobile Onboarding Revamp — iOS & Android',
    status: 'approved',
    jiraKey: 'PROJ-388',
    template: 'Mobile Feature PRD',
    icon: '📱',
    iconColor: 'teal',
    progress: 100,
    progressColor: 'green',
    sectionCount: 15,
    collaborators: [
      { initials: 'AK', name: 'Arjun Kumar', gradient: 'linear-gradient(135deg,#5B7EF8,#7C5BF8)' },
      { initials: 'PD', name: 'Priya Das', gradient: 'linear-gradient(135deg,#22C55E,#2DD4B7)' }
    ],
    lastEdited: '1d ago',
    hasFigmaLink: true,
    sections: generateDefaultSections('Mobile Onboarding Revamp'),
    versions: [],
    comments: [],
    exports: []
  },
  {
    id: 'prd-3',
    title: 'Payments API v3 — Developer Platform',
    status: 'draft',
    jiraKey: 'PROJ-502',
    template: 'API PRD Template',
    icon: '🔌',
    iconColor: 'amber',
    progress: 40,
    progressColor: 'teal',
    sectionCount: 8,
    collaborators: [
      { initials: 'AK', name: 'Arjun Kumar', gradient: 'linear-gradient(135deg,#5B7EF8,#7C5BF8)' }
    ],
    lastEdited: '3h ago',
    sections: generateDefaultSections('Payments API v3'),
    versions: [],
    comments: [],
    exports: []
  },
  {
    id: 'prd-4',
    title: 'Analytics Dashboard — User Retention Metrics',
    status: 'approved',
    jiraKey: 'PROJ-319',
    template: 'Data / Analytics PRD',
    icon: '📊',
    iconColor: 'blue',
    progress: 100,
    progressColor: 'green',
    sectionCount: 12,
    collaborators: [
      { initials: 'AK', name: 'Arjun Kumar', gradient: 'linear-gradient(135deg,#5B7EF8,#7C5BF8)' },
      { initials: 'SR', name: 'Sarah Raina', gradient: 'linear-gradient(135deg,#2DD4B7,#5B7EF8)' }
    ],
    lastEdited: '2d ago',
    sections: generateDefaultSections('Analytics Dashboard'),
    versions: [],
    comments: [],
    exports: []
  },
  {
    id: 'prd-5',
    title: 'A/B Test — Homepage Hero Experiment',
    status: 'draft',
    jiraKey: 'PROJ-557',
    template: 'Growth / Experiment PRD',
    icon: '🧪',
    iconColor: 'teal',
    progress: 30,
    progressColor: '',
    sectionCount: 6,
    collaborators: [
      { initials: 'AK', name: 'Arjun Kumar', gradient: 'linear-gradient(135deg,#5B7EF8,#7C5BF8)' }
    ],
    lastEdited: '5h ago',
    sections: generateDefaultSections('A/B Test Homepage Hero'),
    versions: [],
    comments: [],
    exports: []
  },
  {
    id: 'prd-6',
    title: 'Critical Bug Fix — Session Timeout Auth',
    status: 'review',
    jiraKey: 'PROJ-498',
    template: 'Bug Fix PRD',
    icon: '🐛',
    iconColor: 'amber',
    progress: 80,
    progressColor: 'teal',
    sectionCount: 5,
    collaborators: [
      { initials: 'AK', name: 'Arjun Kumar', gradient: 'linear-gradient(135deg,#5B7EF8,#7C5BF8)' },
      { initials: 'MJ', name: 'Mihail J.', gradient: 'linear-gradient(135deg,#F59E0B,#EF4444)' }
    ],
    lastEdited: '1d ago',
    sections: generateDefaultSections('Session Timeout Bug Fix'),
    versions: [],
    comments: [],
    exports: []
  }
];

function generateDefaultSections(title) {
  return [
    { id: 'ds1', num: '01', title: 'Executive Summary', confidence: 'high', type: 'text', locked: false, collapsed: false,
      content: `This PRD covers the ${title} initiative. It outlines the problem space, proposed solutions, success criteria, and implementation timeline to ensure alignment across product, engineering, and design stakeholders.`, feedback: null },
    { id: 'ds2', num: '02', title: 'Problem Statement', confidence: 'high', type: 'text', locked: false, collapsed: false,
      content: `The current implementation has several identified pain points that impact user satisfaction and business metrics. This section details the specific issues and their measurable impact on the user experience.`, feedback: null },
    { id: 'ds3', num: '03', title: 'Goals & Success Metrics', confidence: 'mid', type: 'list', locked: false, collapsed: false,
      banner: { type: 'mid', text: '⚡ Medium confidence — inferred from ticket context. Please verify KPI targets.' },
      items: ['Primary goal: Improve core user experience metric by 25%+', 'Secondary goal: Reduce support tickets related to this feature by 40%', 'Success metric: NPS improvement of +10 points within 90 days'], feedback: null },
    { id: 'ds4', num: '04', title: 'User Personas & Stakeholders', confidence: 'high', type: 'list', locked: false, collapsed: false,
      items: ['Primary user — Core audience with daily interaction needs', 'Secondary user — Admin/Power user with management responsibilities', 'Stakeholder — Product leadership and cross-functional teams'], feedback: null },
    { id: 'ds5', num: '05', title: 'User Stories', confidence: 'high', type: 'list', locked: false, collapsed: false,
      items: ['As a user, I want a streamlined experience so that I can complete my task efficiently', 'As an admin, I want configuration options so that I can customize the feature for my team', 'As a new user, I want intuitive onboarding so that I can get started quickly'], feedback: null },
    { id: 'ds6', num: '06', title: 'Functional Requirements', confidence: 'high', type: 'list', locked: false, collapsed: false,
      items: ['FR-001: Core functionality implementation with complete user flow', 'FR-002: Error handling and graceful degradation', 'FR-003: Real-time feedback and status indicators', 'FR-004: Backward compatibility with existing integrations', 'FR-005: Data validation and sanitization on all inputs'], feedback: null },
    { id: 'ds7', num: '07', title: 'Non-Functional Requirements', confidence: 'high', type: 'list', locked: false, collapsed: false,
      items: ['NFR-001: Page load time < 2s on broadband connections', 'NFR-002: Support 5,000 concurrent users', 'NFR-003: 99.9% uptime SLA', 'NFR-004: WCAG 2.1 AA accessibility compliance'], feedback: null },
    { id: 'ds8', num: '08', title: 'Out of Scope', confidence: 'high', type: 'list', locked: false, collapsed: false,
      items: ['Mobile native app support (planned for future phase)', 'Third-party API integrations beyond current providers', 'Multi-language support (deferred to next quarter)'], feedback: null },
    { id: 'ds9', num: '09', title: 'Technical Considerations', confidence: 'mid', type: 'list', locked: false, collapsed: false,
      banner: { type: 'mid', text: '⚡ Medium confidence — AI inferred. Verify with engineering.' },
      items: ['Technology stack alignment with current architecture', 'Database migration requirements and rollback plan', 'CI/CD pipeline updates needed', 'Performance profiling and load testing plan'], feedback: null },
    { id: 'ds10', num: '10', title: 'Acceptance Criteria', confidence: 'high', type: 'table', locked: false, collapsed: false,
      headers: ['#', 'Acceptance Criterion', 'Priority', 'Status'],
      rows: [
        ['AC-001', 'Core user flow completes without errors', 'P0', 'Pending'],
        ['AC-002', 'Performance meets defined SLA targets', 'P0', 'Pending'],
        ['AC-003', 'All edge cases handled gracefully', 'P1', 'Pending']
      ], feedback: null },
    { id: 'ds11', num: '11', title: 'Dependencies', confidence: 'mid', type: 'list', locked: false, collapsed: false,
      items: ['Design team — Final mockups and design review', 'Backend — API endpoints and service readiness', 'QA — Test plan and automation coverage'], feedback: null },
    { id: 'ds12', num: '12', title: 'Timeline & Milestones', confidence: 'mid', type: 'list', locked: false, collapsed: false,
      items: ['Week 1-2: Design finalization and technical planning', 'Week 3-4: Core implementation sprint', 'Week 5: Testing, QA, and bug fixes', 'Week 6: Beta rollout (10% traffic) and monitoring', 'Week 7: Full production rollout'], feedback: null },
    { id: 'ds13', num: '13', title: 'Open Questions', confidence: 'low', type: 'list', locked: false, collapsed: false,
      banner: { type: 'low', text: '⚠️ Low confidence — AI inferred. Please verify carefully.' },
      items: ['What is the rollback strategy if metrics degrade post-launch?', 'Should we implement feature flags for gradual rollout?', 'What analytics events need to be tracked?'], feedback: null },
    { id: 'ds14', num: '14', title: 'Appendix & References', confidence: 'high', type: 'list', locked: false, collapsed: false,
      items: ['Source ticket and related documentation', 'Design mockups and prototype links', 'Generated by PM AI Tool v1.0'], feedback: null }
  ];
}

// ─── AI Content Generator (Simulated) ───
export function generateAIContent(title, jiraKey, template, inputContent = '') {
  const ctx = inputContent || title;
  return [
    { id: 'g1', num: '01', title: 'Document Header', confidence: 'high', type: 'text', locked: false, collapsed: false,
      content: `PRD: ${title}\nJira: ${jiraKey}\nTemplate: ${template}\nAuthor: Arjun Kumar\nCreated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\nStatus: Draft`, feedback: null },
    { id: 'g2', num: '02', title: 'Executive Summary', confidence: 'high', type: 'text', locked: false, collapsed: false,
      content: `This PRD outlines the implementation plan for "${title}". The initiative aims to address key user needs and business objectives identified in ${jiraKey}. This document provides a comprehensive overview of the problem space, proposed solution, success metrics, and implementation roadmap.\n\nThe primary goal is to deliver a high-quality feature that improves user experience and drives measurable business impact within the planned timeline.`, feedback: null },
    { id: 'g3', num: '03', title: 'Problem Statement', confidence: 'high', type: 'text', locked: false, collapsed: false,
      content: `The current state presents several challenges that impact both user satisfaction and core business metrics. Users have reported friction points that lead to reduced engagement and increased churn. Key pain points include suboptimal workflows, missing functionality, and inconsistent experiences across platforms.\n\nQuantitative data indicates room for significant improvement, with current metrics falling below industry benchmarks in several areas.`, feedback: null },
    { id: 'g4', num: '04', title: 'Goals & Success Metrics', confidence: 'mid', type: 'list', locked: false, collapsed: false,
      banner: { type: 'mid', text: '⚡ Medium confidence — inferred from ticket context. Please verify KPI targets.' },
      items: [
        'Primary: Improve primary conversion metric by 20%+ within 60 days of launch',
        'Reduce user-reported issues related to this area by 35%',
        'Achieve feature adoption rate >60% among target users within 30 days',
        'Maintain or improve page performance (load time < 2s on broadband)',
        'NPS improvement of +10 points within 90 days post-launch'
      ], feedback: null },
    { id: 'g5', num: '05', title: 'User Personas & Stakeholders', confidence: 'mid', type: 'list', locked: false, collapsed: false,
      items: [
        'Primary User — Core audience interacting with this feature daily, expects intuitive and fast experience',
        'Power User — Advanced user requiring customization, bulk operations, and keyboard shortcuts',
        'Admin User — Manages configuration, permissions, and team settings',
        'Stakeholder: Product Leadership — Sponsors the initiative, defines success criteria',
        'Stakeholder: Engineering Lead — Owns technical architecture and delivery timeline'
      ], feedback: null },
    { id: 'g6', num: '06', title: 'User Stories', confidence: 'high', type: 'list', locked: false, collapsed: false,
      items: [
        'As a user, I want a streamlined workflow so that I can complete my tasks 50% faster',
        'As a new user, I want intuitive onboarding so that I can get value within my first session',
        'As a power user, I want keyboard shortcuts and bulk actions so that I can work efficiently at scale',
        'As an admin, I want configuration controls so that I can customize the experience for my team'
      ], feedback: null },
    { id: 'g7', num: '07', title: 'Functional Requirements', confidence: 'high', type: 'list', locked: false, collapsed: false,
      items: [
        'FR-001: Core feature implementation with complete happy-path user flow',
        'FR-002: Input validation and sanitization on all user-facing fields',
        'FR-003: Error handling with user-friendly messages and recovery actions',
        'FR-004: Real-time status indicators and progress feedback',
        'FR-005: Undo/redo support for destructive actions',
        'FR-006: Backward compatibility with existing integrations and data',
        'FR-007: Responsive design supporting desktop, tablet, and mobile viewports'
      ], feedback: null },
    { id: 'g8', num: '08', title: 'Non-Functional Requirements', confidence: 'high', type: 'list', locked: false, collapsed: false,
      items: [
        'NFR-001: Page load time < 2 seconds on broadband connections',
        'NFR-002: Support 5,000+ concurrent users without degradation',
        'NFR-003: 99.9% uptime SLA with automated monitoring and alerting',
        'NFR-004: WCAG 2.1 AA accessibility compliance',
        'NFR-005: All data encrypted at rest (AES-256) and in transit (TLS 1.3)'
      ], feedback: null },
    { id: 'g9', num: '09', title: 'Out of Scope', confidence: 'high', type: 'list', locked: false, collapsed: false,
      items: [
        'Native mobile application (web responsive only for v1)',
        'Multi-language / i18n support (English only for launch)',
        'Advanced analytics dashboard (planned for subsequent release)',
        'Third-party integrations beyond currently supported platforms'
      ], feedback: null },
    { id: 'g10', num: '10', title: 'Technical Considerations', confidence: 'mid', type: 'list', locked: false, collapsed: false,
      banner: { type: 'mid', text: '⚡ Medium confidence — AI inferred. Please verify with engineering team.' },
      items: [
        'Architecture: Follows existing microservice patterns with dedicated service',
        'Database: Requires schema migration — backward-compatible changes only',
        'Caching: Redis caching layer for frequently accessed data',
        'API: RESTful endpoints following existing API versioning convention (v1)',
        'Testing: Unit tests (>80% coverage), integration tests, E2E tests'
      ], feedback: null },
    { id: 'g11', num: '11', title: 'Acceptance Criteria', confidence: 'high', type: 'table', locked: false, collapsed: false,
      headers: ['#', 'Acceptance Criterion', 'Priority', 'Status'],
      rows: [
        ['AC-001', 'Core user flow completes without errors in all supported browsers', 'P0', 'Pending'],
        ['AC-002', 'Performance meets defined SLA targets under load', 'P0', 'Pending'],
        ['AC-003', 'All input validations enforce correct data formats', 'P1', 'Pending'],
        ['AC-004', 'Error states display user-friendly messages with recovery actions', 'P1', 'Pending'],
        ['AC-005', 'Feature is accessible via keyboard navigation', 'P1', 'Pending']
      ], feedback: null },
    { id: 'g12', num: '12', title: 'Dependencies', confidence: 'mid', type: 'list', locked: false, collapsed: false,
      items: [
        'Design team — Final mockups and design system updates',
        'Backend engineering — API endpoints and database migrations',
        'QA — Test plan, automation scripts, and regression suite',
        'DevOps — CI/CD pipeline and staging environment setup',
        'Security — Compliance review and penetration testing'
      ], feedback: null },
    { id: 'g13', num: '13', title: 'Timeline & Milestones', confidence: 'mid', type: 'list', locked: false, collapsed: false,
      items: [
        'Week 1-2: Design finalization + API contract definition',
        'Week 3-4: Core implementation sprint',
        'Week 5: Integration testing + QA sprint',
        'Week 6: Security review + performance testing',
        'Week 7: Beta rollout (10% traffic) + monitoring',
        'Week 8: Full production rollout + post-launch tracking'
      ], feedback: null },
    { id: 'g14', num: '14', title: 'Open Questions', confidence: 'low', type: 'list', locked: false, collapsed: false,
      banner: { type: 'low', text: '⚠️ Low confidence — AI inferred these from ticket context. Please verify carefully.' },
      items: [
        'What is the rollback strategy if key metrics degrade post-launch?',
        'Should we implement feature flags for gradual rollout?',
        'What are the exact analytics events needed for success measurement?',
        'Is there budget for external security audit before launch?'
      ], feedback: null },
    { id: 'g15', num: '15', title: 'Appendix & References', confidence: 'high', type: 'list', locked: false, collapsed: false,
      items: [
        `Jira Ticket: ${jiraKey}`,
        `Template: ${template}`,
        'Design Mockups: [Link to Figma]',
        'API Documentation: [Link to Swagger/OpenAPI]',
        `Generated by PM AI Tool v1.0 on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
      ], feedback: null }
  ];
}

// ─── Regenerate Section Content (Simulated AI) ───
export function regenerateSection(section, hint = '') {
  const hintNote = hint ? ` Incorporating feedback: "${hint}".` : '';
  const newSection = { ...section };

  if (section.type === 'text') {
    newSection.content = `[Regenerated] ${section.content}\n\nThis section has been regenerated by AI with improved clarity and detail.${hintNote} The content above has been enhanced to provide more specific and actionable information based on the latest context.`;
  } else if (section.type === 'list') {
    newSection.items = [
      ...(section.items || []),
      `[NEW] Additional insight generated by AI${hintNote ? ` — ${hint}` : ''}`,
      `[NEW] Enhanced detail based on cross-referencing similar PRDs`
    ];
  }
  return newSection;
}

// ─── Templates Seed ───
const SEED_TEMPLATES = [
  { id: 'tpl-1', name: 'Standard Feature PRD', description: 'Complete PRD with all 15 sections for general features', icon: '📄', isDefault: true, visibility: 'org', sections: 15, tags: ['feature', 'general'], usageCount: 47 },
  { id: 'tpl-2', name: 'Bug Fix PRD', description: 'Focused on problem, root cause, fix scope, test plan', icon: '🐛', isDefault: true, visibility: 'org', sections: 8, tags: ['bug', 'fix'], usageCount: 23 },
  { id: 'tpl-3', name: 'API PRD Template', description: 'Endpoints, auth, rate limits, error codes, SDK notes', icon: '🔌', isDefault: true, visibility: 'org', sections: 12, tags: ['api', 'developer'], usageCount: 18 },
  { id: 'tpl-4', name: 'Mobile Feature PRD', description: 'Platform-specific NFRs, App Store considerations', icon: '📱', isDefault: true, visibility: 'org', sections: 14, tags: ['mobile', 'ios', 'android'], usageCount: 31 },
  { id: 'tpl-5', name: 'Data / Analytics PRD', description: 'Data sources, schema, metrics definitions, governance', icon: '📊', isDefault: true, visibility: 'org', sections: 11, tags: ['data', 'analytics'], usageCount: 12 },
  { id: 'tpl-6', name: 'Growth / Experiment PRD', description: 'Hypothesis, control/variant, success metric, power', icon: '🧪', isDefault: true, visibility: 'org', sections: 10, tags: ['growth', 'experiment', 'ab-test'], usageCount: 9 },
];

// ─── Default settings (merged on read so new keys work after app updates) ───
const DEFAULT_SETTINGS = {
  aiModel: 'Claude Sonnet 4',
  autoSaveInterval: 60,
  theme: 'dark',
  language: 'English',
  defaultTemplate: 'Standard Feature PRD',
  editorFontSize: 14,
  sidebarWidth: 240,
  notificationsEmail: true,
  notificationsInApp: true,
  stitchApiKey: '',
  stitchDeviceType: 'DESKTOP'
};

// ─── Notifications Seed ───
const SEED_NOTIFICATIONS = [
  { id: 'n1', title: 'Design Updated — Payment Flow PRD', sub: 'Figma component \'Checkout Form\' was modified', time: '2 min ago', color: 'var(--indigo)', read: false, type: 'figma' },
  { id: 'n2', title: '@Alex commented on Section 7', sub: '"Can we clarify the error handling for failed payments?"', time: '18 min ago', color: 'var(--indigo)', read: false, type: 'comment' },
  { id: 'n3', title: 'PRD Approved — Onboarding Revamp', sub: 'Sarah approved the document', time: '1 hr ago', color: 'var(--green)', read: false, type: 'approval' },
  { id: 'n4', title: 'Jira Ticket Updated — PROJ-441', sub: 'Acceptance criteria changed — PRD may need update', time: '3 hr ago', color: 'var(--amber)', read: false, type: 'jira' },
  { id: 'n5', title: 'Template used 12 times this week', sub: '"Mobile Feature PRD" gaining traction in your org', time: 'Yesterday', color: 'var(--bg-active)', read: true, type: 'info' }
];

// ─── Wireframes Seed ───
const SEED_WIREFRAMES = [
  { id: 'wf-1', title: 'Payment Flow Screens', screens: 6, figma: true, updated: '4h ago', linkedPrd: 'prd-1', status: 'active',
    preview: [
      { bars: [{ cls: 'accent w80' }, { cls: 'w60' }], box: true, accent: { cls: 'teal' } },
      { bars: [{ cls: 'w40' }], box: true, accent: { cls: 'accent w60' } },
      { opacity: 0.6, bars: [{ cls: 'w60' }], box: true, smallBox: true }
    ]},
  { id: 'wf-2', title: 'Mobile Onboarding — 4-Step Flow', screens: 12, figma: true, updated: '1d ago', linkedPrd: 'prd-2', status: 'active',
    preview: [
      { bars: [{ cls: 'w80', style: 'background:var(--teal)' }, { cls: 'w40' }], box: true, accent: { cls: 'w60' } },
      { bars: [{ cls: 'w60' }], box: true, accent: { cls: 'w80', style: 'background:var(--teal)' } },
      { opacity: 0.5, bars: [{ cls: 'w40', style: 'background:var(--teal)' }, { cls: 'w60' }], box: true }
    ]},
  { id: 'wf-3', title: 'Analytics Dashboard — Web', screens: 8, figma: true, updated: '2d ago', linkedPrd: 'prd-4', status: 'active',
    preview: [
      { bars: [{ cls: 'accent w80' }, { cls: 'w60' }, { cls: 'w40' }], box: true },
      { bars: [{ cls: 'w60' }], smallBox: true, accent: { cls: 'accent w80' }, box: true }
    ]},
  { id: 'wf-4', title: 'Developer API Console — Portal', screens: 15, figma: false, updated: '3d ago', status: 'draft',
    preview: [
      { bars: [{ cls: 'w80', style: 'background:#a259ff;opacity:0.6' }, { cls: 'w40' }], box: true, accent: { cls: 'w60' } },
      { opacity: 0.7, bars: [{ cls: 'w60' }], box: true, accent: { cls: 'w80', style: 'background:#a259ff;opacity:0.6' } }
    ]},
  { id: 'wf-5', title: 'A/B Test Landing — Hero Variants', screens: 6, figma: false, updated: '5h ago', status: 'draft',
    preview: [
      { bars: [{ cls: 'w60', style: 'background:var(--amber);opacity:0.7' }], smallBox: true, accent: { cls: 'w80' }, box: true },
      { opacity: 0.6, bars: [{ cls: 'w40' }], box: true, accent: { cls: 'w60', style: 'background:var(--amber);opacity:0.7' } }
    ]}
];

// ─── Store Class ───
class Store {
  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: ensure all new fields exist
        if (parsed.templates) {
          this.data = parsed;
        } else {
          this.data = null; // Force re-seed if old format
        }
      } catch { this.data = null; }
    }
    if (!this.data) {
      this.data = {
        prds: [],
        wireframes: [],
        templates: SEED_TEMPLATES,
        notifications: [],
        settings: { ...DEFAULT_SETTINGS }
      };
      this.save();
    }
  }

  mergePrdFromApi(normalized) {
    const idx = this.data.prds.findIndex(p => p.id === normalized.id);
    if (idx >= 0) this.data.prds[idx] = normalized;
    else this.data.prds.unshift(normalized);
    this.save();
  }

  mergeWireframeFromApi(normalized) {
    const idx = this.data.wireframes.findIndex(w => w.id === normalized.id);
    if (idx >= 0) this.data.wireframes[idx] = normalized;
    else this.data.wireframes.unshift(normalized);
    this.save();
  }

  async hydrateFromApi() {
    const { getToken } = await import('./api.js');
    if (!getToken()) return;
    const { api } = await import('./api.js');
    const { normalizePrdFromApi, normalizeWireframeFromApi } = await import('./normalize.js');
    try {
      const { prds } = await api.getPrds();
      this.data.prds = (prds || []).map(normalizePrdFromApi);
    } catch (e) {
      console.warn('hydrate prds', e);
    }
    try {
      const { wireframes } = await api.getWireframes();
      this.data.wireframes = (wireframes || []).map(normalizeWireframeFromApi);
    } catch (e) {
      console.warn('hydrate wireframes', e);
    }
    try {
      const { notifications } = await api.getNotifications();
      if (notifications?.length) {
        this.data.notifications = notifications.map(n => ({
          id: n.id,
          title: n.title || 'Notification',
          sub: n.message || '',
          time: n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Just now',
          color: 'var(--indigo)',
          read: !!n.read,
          type: n.type || 'info'
        }));
      }
    } catch (e) {
      console.warn('hydrate notifications', e);
    }
    try {
      const { preferences } = await api.getPreferences();
      if (preferences && typeof preferences === 'object') {
        this.data.settings = { ...this.data.settings, ...preferences };
      }
    } catch {
      /* optional */
    }
    this.save();
  }

  _syncPrdToApi(id, updates) {
    return (async () => {
      const { getToken } = await import('./api.js');
      if (!getToken()) return;
      const { api } = await import('./api.js');
      const body = {};
      if (updates.title !== undefined) body.title = updates.title;
      if (updates.sections !== undefined) body.content = updates.sections;
      if (updates.status !== undefined) body.status = updates.status;
      if (Object.keys(body).length === 0) return;
      await api.updatePrd(id, body);
    })().catch(e => console.warn('sync PRD', e));
  }

  _persistVersionToServer(prdId, label) {
    return (async () => {
      const { getToken } = await import('./api.js');
      if (!getToken()) return;
      const { api } = await import('./api.js');
      const prd = this.getPRD(prdId);
      if (!prd) return;
      await api.updatePrd(prdId, { content: prd.sections });
      await api.savePrdVersion(prdId, label);
    })().catch(e => console.warn('save version', e));
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  }

  // ─── PRDs ───
  getPRDs() { return this.data.prds; }

  getPRD(id) { return this.data.prds.find(p => p.id === id); }

  createPRD(prd) {
    this.data.prds.unshift(prd);
    this.addNotification({
      title: `PRD Created — ${prd.title}`,
      sub: `New ${prd.template} generated from ${prd.jiraKey}`,
      type: 'info',
      color: 'var(--green)'
    });
    this.save();
    return prd;
  }

  updatePRD(id, updates) {
    const idx = this.data.prds.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.data.prds[idx] = { ...this.data.prds[idx], ...updates, updatedAt: new Date().toISOString() };
      this.save();
      this._syncPrdToApi(id, updates);
      return this.data.prds[idx];
    }
    return null;
  }

  deletePRD(id) {
    const prd = this.getPRD(id);
    (async () => {
      const { getToken } = await import('./api.js');
      if (!getToken()) return;
      const { api } = await import('./api.js');
      await api.deletePrd(id);
    })().catch(e => console.warn('delete PRD API', e));
    this.data.prds = this.data.prds.filter(p => p.id !== id);
    if (prd) {
      this.addNotification({
        title: `PRD Deleted — ${prd.title}`,
        sub: `${prd.jiraKey} moved to trash`,
        type: 'info',
        color: 'var(--red)'
      });
    }
    this.save();
  }

  async duplicatePRD(id) {
    const original = this.getPRD(id);
    if (!original) return null;
    const { getToken } = await import('./api.js');
    if (getToken()) {
      try {
        const { api } = await import('./api.js');
        const { normalizePrdFromApi } = await import('./normalize.js');
        const { prd } = await api.duplicatePrd(id);
        const n = normalizePrdFromApi(prd);
        this.mergePrdFromApi(n);
        return n;
      } catch (e) {
        console.warn('duplicatePrd API', e);
      }
    }
    const copy = JSON.parse(JSON.stringify(original));
    copy.id = 'prd-' + Date.now();
    copy.title = original.title + ' (Copy)';
    copy.status = 'draft';
    copy.progress = 15;
    copy.lastEdited = 'Just now';
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = new Date().toISOString();
    copy.versions = [];
    copy.comments = [];
    copy.exports = [];
    return this.createPRD(copy);
  }

  // ─── PRD Status Workflow ───
  updatePRDStatus(id, newStatus) {
    const prd = this.getPRD(id);
    if (!prd) return null;
    const validTransitions = {
      'draft': ['review'],
      'review': ['approved', 'draft'],
      'approved': ['archived', 'review'],
      'archived': ['draft']
    };
    const current = prd.status;
    if (!validTransitions[current]?.includes(newStatus)) return null;

    const progressMap = { draft: 15, review: 60, approved: 100, archived: 100 };
    const colorMap = { draft: '', review: 'teal', approved: 'green', archived: '' };

    this.updatePRD(id, {
      status: newStatus,
      progress: progressMap[newStatus] || prd.progress,
      progressColor: colorMap[newStatus] || prd.progressColor
    });

    this.addNotification({
      title: `PRD Status → ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
      sub: prd.title,
      type: 'approval',
      color: newStatus === 'approved' ? 'var(--green)' : 'var(--amber)'
    });

    return this.getPRD(id);
  }

  // ─── Versions ───
  saveVersion(prdId, label = '') {
    const prd = this.getPRD(prdId);
    if (!prd) return null;
    if (!prd.versions) prd.versions = [];
    const version = {
      id: 'v-' + Date.now(),
      versionNumber: prd.versions.length + 1,
      label: label || `Auto-save`,
      contentSnapshot: JSON.parse(JSON.stringify(prd.sections)),
      createdBy: 'Arjun Kumar',
      createdAt: new Date().toISOString()
    };
    prd.versions.push(version);
    this.save();
    this._persistVersionToServer(prdId, label);
    return version;
  }

  getVersions(prdId) {
    const prd = this.getPRD(prdId);
    return prd?.versions || [];
  }

  restoreVersion(prdId, versionId) {
    const prd = this.getPRD(prdId);
    if (!prd) return null;
    const version = prd.versions.find(v => v.id === versionId);
    if (!version) return null;
    // Save current before restore
    this.saveVersion(prdId, 'Before restore');
    prd.sections = JSON.parse(JSON.stringify(version.contentSnapshot));
    this.save();
    return prd;
  }

  // ─── Comments ───
  async addComment(prdId, sectionId, text, author = 'Arjun Kumar') {
    const prd = this.getPRD(prdId);
    if (!prd) return null;
    if (!prd.comments) prd.comments = [];
    const { getToken } = await import('./api.js');
    if (getToken()) {
      try {
        const { api } = await import('./api.js');
        const { normalizeCommentFromApi } = await import('./normalize.js');
        const { comment } = await api.postPrdComment(prdId, { sectionId, content: text });
        const n = normalizeCommentFromApi(comment);
        prd.comments.push(n);
        this.save();
        return n;
      } catch (e) {
        console.warn('addComment API', e);
      }
    }
    const comment = {
      id: 'c-' + Date.now(),
      sectionId,
      text,
      author,
      authorInitials: author.split(' ').map(w => w[0]).join(''),
      status: 'open',
      createdAt: new Date().toISOString(),
      replies: []
    };
    prd.comments.push(comment);
    this.save();
    return comment;
  }

  async loadPrdComments(prdId) {
    const { getToken } = await import('./api.js');
    if (!getToken()) return;
    const prd = this.getPRD(prdId);
    if (!prd) return;
    try {
      const { api } = await import('./api.js');
      const { normalizeCommentFromApi } = await import('./normalize.js');
      const { comments } = await api.getPrdComments(prdId);
      prd.comments = (comments || []).map(normalizeCommentFromApi);
      this.save();
    } catch (e) {
      console.warn('loadPrdComments', e);
    }
  }

  getComments(prdId, sectionId = null) {
    const prd = this.getPRD(prdId);
    if (!prd?.comments) return [];
    if (sectionId) return prd.comments.filter(c => c.sectionId === sectionId);
    return prd.comments;
  }

  async resolveComment(prdId, commentId) {
    const prd = this.getPRD(prdId);
    if (!prd) return;
    const comment = prd.comments?.find(c => c.id === commentId);
    if (!comment) return;
    const next = comment.status === 'resolved' ? 'open' : 'resolved';
    const { getToken } = await import('./api.js');
    if (getToken()) {
      try {
        const { api } = await import('./api.js');
        await api.patchPrdComment(prdId, commentId, { status: next });
      } catch (e) {
        console.warn('resolveComment API', e);
      }
    }
    comment.status = next;
    this.save();
  }

  // ─── Section Feedback ───
  setSectionFeedback(prdId, sectionId, feedback) {
    const prd = this.getPRD(prdId);
    if (!prd) return;
    const section = prd.sections.find(s => s.id === sectionId);
    if (section) {
      section.feedback = feedback; // 'up' | 'down' | null
      this.save();
    }
  }

  // ─── Exports ───
  addExport(prdId, format) {
    const prd = this.getPRD(prdId);
    if (!prd) return;
    if (!prd.exports) prd.exports = [];
    prd.exports.push({
      id: 'exp-' + Date.now(),
      format,
      exportedBy: 'Arjun Kumar',
      exportedAt: new Date().toISOString()
    });
    this.save();
  }

  // ─── Stats ───
  getStats() {
    const prds = this.data.prds;
    return {
      total: prds.length,
      review: prds.filter(p => p.status === 'review').length,
      approved: prds.filter(p => p.status === 'approved').length,
      draft: prds.filter(p => p.status === 'draft').length,
    };
  }

  // ─── Templates ───
  getTemplates() { return this.data.templates; }
  getTemplate(id) { return this.data.templates.find(t => t.id === id); }

  createTemplate(template) {
    this.data.templates.push(template);
    this.save();
    return template;
  }

  deleteTemplate(id) {
    this.data.templates = this.data.templates.filter(t => t.id !== id);
    this.save();
  }

  // ─── Wireframes ───
  getWireframes() { return this.data.wireframes; }
  getWireframe(id) { return this.data.wireframes.find(w => w.id === id); }

  createWireframe(wf) {
    this.data.wireframes.unshift(wf);
    this.addNotification({
      title: `Wireframe Created — ${wf.title}`,
      sub: `${wf.screens} screens generated`,
      type: 'info',
      color: 'var(--teal)'
    });
    this.save();
    return wf;
  }

  deleteWireframe(id) {
    (async () => {
      const { getToken } = await import('./api.js');
      if (!getToken()) return;
      const { api } = await import('./api.js');
      await api.deleteWireframe(id);
    })().catch(e => console.warn('delete wireframe API', e));
    this.data.wireframes = this.data.wireframes.filter(w => w.id !== id);
    this.save();
  }

  // ─── Notifications ───
  getNotifications() { return this.data.notifications; }
  getUnreadCount() { return this.data.notifications.filter(n => !n.read).length; }

  addNotification(notif) {
    this.data.notifications.unshift({
      id: 'n-' + Date.now(),
      title: notif.title,
      sub: notif.sub,
      time: 'Just now',
      color: notif.color || 'var(--indigo)',
      read: false,
      type: notif.type || 'info'
    });
    // Keep max 20 notifications
    if (this.data.notifications.length > 20) {
      this.data.notifications = this.data.notifications.slice(0, 20);
    }
  }

  markAllRead() {
    this.data.notifications.forEach(n => n.read = true);
    this.save();
    (async () => {
      const { getToken } = await import('./api.js');
      if (!getToken()) return;
      const { api } = await import('./api.js');
      await api.markAllNotificationsRead();
    })().catch(() => {});
  }

  markRead(id) {
    const notif = this.data.notifications.find(n => n.id === id);
    if (notif) { notif.read = true; this.save(); }
    (async () => {
      const { getToken } = await import('./api.js');
      if (!getToken()) return;
      const { api } = await import('./api.js');
      await api.markNotificationRead(id);
    })().catch(() => {});
  }

  // ─── Settings ───
  getSettings() {
    return { ...DEFAULT_SETTINGS, ...this.data.settings };
  }
  updateSettings(updates) {
    this.data.settings = { ...this.data.settings, ...updates };
    this.save();
    const prefsKeys = ['theme', 'autoSaveInterval', 'editorFontSize', 'language', 'defaultTemplate', 'sidebarWidth'];
    const prefs = {};
    for (const k of prefsKeys) {
      if (updates[k] !== undefined) prefs[k] = updates[k];
    }
    if (Object.keys(prefs).length === 0) return;
    (async () => {
      const { getToken } = await import('./api.js');
      if (!getToken()) return;
      const { api } = await import('./api.js');
      await api.updatePreferences(prefs);
    })().catch(() => {});
  }

  // ─── Comment Replies (Phase 2) ───
  addReply(prdId, commentId, text, author = 'Arjun Kumar') {
    const prd = this.getPRD(prdId);
    if (!prd) return null;
    const comment = prd.comments?.find(c => c.id === commentId);
    if (!comment) return null;
    if (!comment.replies) comment.replies = [];
    const reply = {
      id: 'r-' + Date.now(),
      text,
      author,
      authorInitials: author.split(' ').map(w => w[0]).join(''),
      createdAt: new Date().toISOString()
    };
    comment.replies.push(reply);
    this.save();
    return reply;
  }

  updateCommentStatus(prdId, commentId, status) {
    const prd = this.getPRD(prdId);
    if (!prd) return;
    const comment = prd.comments?.find(c => c.id === commentId);
    if (comment) {
      comment.status = status; // 'open' | 'in-review' | 'resolved'
      this.save();
    }
  }

  // ─── Version Diffing (Phase 2) ───
  diffVersions(prdId, v1Id, v2Id) {
    const prd = this.getPRD(prdId);
    if (!prd) return null;
    const v1 = v1Id === 'current' ? { contentSnapshot: prd.sections } : prd.versions?.find(v => v.id === v1Id);
    const v2 = v2Id === 'current' ? { contentSnapshot: prd.sections } : prd.versions?.find(v => v.id === v2Id);
    if (!v1 || !v2) return null;

    const s1 = v1.contentSnapshot || [];
    const s2 = v2.contentSnapshot || [];
    const diffs = [];

    const maxLen = Math.max(s1.length, s2.length);
    for (let i = 0; i < maxLen; i++) {
      const a = s1[i];
      const b = s2[i];
      if (!a) { diffs.push({ type: 'added', section: b }); continue; }
      if (!b) { diffs.push({ type: 'removed', section: a }); continue; }
      const aText = a.content || (a.items || []).join('\n') || JSON.stringify(a.rows || []);
      const bText = b.content || (b.items || []).join('\n') || JSON.stringify(b.rows || []);
      if (aText !== bText || a.title !== b.title) {
        diffs.push({ type: 'modified', before: a, after: b });
      } else {
        diffs.push({ type: 'unchanged', section: a });
      }
    }
    return { diffs, summary: `${diffs.filter(d => d.type === 'modified').length} modified, ${diffs.filter(d => d.type === 'added').length} added, ${diffs.filter(d => d.type === 'removed').length} removed` };
  }

  renameVersion(prdId, versionId, label) {
    const prd = this.getPRD(prdId);
    if (!prd) return;
    const version = prd.versions?.find(v => v.id === versionId);
    if (version) {
      version.label = label;
      this.save();
    }
  }

  // ─── Suggestions (Phase 2) ───
  addSuggestion(prdId, sectionId, text) {
    const prd = this.getPRD(prdId);
    if (!prd) return;
    if (!prd.suggestions) prd.suggestions = [];
    prd.suggestions.push({
      id: 'sug-' + Date.now(),
      sectionId,
      text,
      author: 'Arjun Kumar',
      createdAt: new Date().toISOString()
    });
    this.save();
  }

  getSuggestions(prdId, sectionId = null) {
    const prd = this.getPRD(prdId);
    if (!prd?.suggestions) return [];
    if (sectionId) return prd.suggestions.filter(s => s.sectionId === sectionId);
    return prd.suggestions;
  }

  // ─── Ratings (Phase 2) ───
  addRating(prdId, rating, comment = '') {
    const prd = this.getPRD(prdId);
    if (!prd) return;
    if (!prd.ratings) prd.ratings = [];
    prd.ratings.push({
      id: 'rat-' + Date.now(),
      rating, // 1-5
      comment,
      author: 'Arjun Kumar',
      createdAt: new Date().toISOString()
    });
    this.save();
  }

  // ─── Edit Distance (Phase 2) ───
  trackEditDistance(prdId, sectionId, originalContent, currentContent) {
    const prd = this.getPRD(prdId);
    if (!prd) return;
    if (!prd.editMetrics) prd.editMetrics = [];
    const distance = Math.abs((originalContent?.length || 0) - (currentContent?.length || 0));
    const ratio = originalContent?.length ? (distance / originalContent.length * 100).toFixed(1) : 0;
    prd.editMetrics.push({
      sectionId,
      originalLength: originalContent?.length || 0,
      currentLength: currentContent?.length || 0,
      changePercent: parseFloat(ratio),
      timestamp: new Date().toISOString()
    });
    this.save();
  }

  // ─── Audit Log (Phase 2) ───
  getAuditLog() {
    return this.data.auditLog || [];
  }

  addAuditEntry(action, details = '') {
    if (!this.data.auditLog) this.data.auditLog = [];
    this.data.auditLog.unshift({
      id: 'aud-' + Date.now(),
      action, // 'prd.created', 'prd.edited', 'prd.exported', 'prd.shared', 'prd.status_changed', 'template.created'
      details,
      user: 'Arjun Kumar',
      timestamp: new Date().toISOString()
    });
    if (this.data.auditLog.length > 100) this.data.auditLog = this.data.auditLog.slice(0, 100);
    this.save();
  }

  // ─── Simulated User Directory (Phase 2) ───
  getUsers() {
    return [
      { id: 'u1', name: 'Arjun Kumar', email: 'arjun@company.com', initials: 'AK', role: 'admin', gradient: 'linear-gradient(135deg,#5B7EF8,#7C5BF8)', status: 'online' },
      { id: 'u2', name: 'Sarah Raina', email: 'sarah@company.com', initials: 'SR', role: 'editor', gradient: 'linear-gradient(135deg,#2DD4B7,#5B7EF8)', status: 'online' },
      { id: 'u3', name: 'Mihail J.', email: 'mihail@company.com', initials: 'MJ', role: 'editor', gradient: 'linear-gradient(135deg,#F59E0B,#EF4444)', status: 'away' },
      { id: 'u4', name: 'Priya Das', email: 'priya@company.com', initials: 'PD', role: 'viewer', gradient: 'linear-gradient(135deg,#22C55E,#2DD4B7)', status: 'offline' },
      { id: 'u5', name: 'Alex Chen', email: 'alex@company.com', initials: 'AC', role: 'editor', gradient: 'linear-gradient(135deg,#a259ff,#6366f1)', status: 'online' },
      { id: 'u6', name: 'Maya Singh', email: 'maya@company.com', initials: 'MS', role: 'viewer', gradient: 'linear-gradient(135deg,#f472b6,#ef4444)', status: 'offline' }
    ];
  }

  searchUsers(query) {
    if (!query) return [];
    const q = query.toLowerCase();
    return this.getUsers().filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }

  // ─── Share Links (Phase 2) ───
  createShareLink(prdId, access = 'view', password = '') {
    const prd = this.getPRD(prdId);
    if (!prd) return null;
    if (!prd.shareLinks) prd.shareLinks = [];
    const token = btoa(`${prdId}-${Date.now()}-${Math.random().toString(36).substring(2)}`).substring(0, 24);
    const link = {
      id: 'sl-' + Date.now(),
      token,
      url: `${location.origin}/#/shared/${token}`,
      access, // 'view' | 'edit'
      password: password || null,
      createdBy: 'Arjun Kumar',
      createdAt: new Date().toISOString(),
      active: true
    };
    prd.shareLinks.push(link);
    this.addAuditEntry('prd.shared', `${prd.title} — ${access} link created`);
    this.save();
    return link;
  }

  getShareLinks(prdId) {
    const prd = this.getPRD(prdId);
    return prd?.shareLinks?.filter(l => l.active) || [];
  }

  revokeShareLink(prdId, linkId) {
    const prd = this.getPRD(prdId);
    if (!prd) return;
    const link = prd.shareLinks?.find(l => l.id === linkId);
    if (link) { link.active = false; this.save(); }
  }

  // ─── Enhanced Template CRUD (Phase 2) ───
  updateTemplate(id, updates) {
    const idx = this.data.templates.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.templates[idx] = { ...this.data.templates[idx], ...updates, updatedAt: new Date().toISOString() };
      this.save();
      return this.data.templates[idx];
    }
    return null;
  }

  duplicateTemplate(id) {
    const original = this.getTemplate(id);
    if (!original) return null;
    const copy = JSON.parse(JSON.stringify(original));
    copy.id = 'tpl-' + Date.now();
    copy.name = original.name + ' (Copy)';
    copy.isDefault = false;
    copy.usageCount = 0;
    return this.createTemplate(copy);
  }

  incrementTemplateUsage(id) {
    const tpl = this.getTemplate(id);
    if (tpl) {
      tpl.usageCount = (tpl.usageCount || 0) + 1;
      this.save();
    }
  }

  importTemplate(jsonString) {
    try {
      const tpl = JSON.parse(jsonString);
      tpl.id = 'tpl-' + Date.now();
      tpl.isDefault = false;
      tpl.usageCount = 0;
      tpl.importedAt = new Date().toISOString();
      return this.createTemplate(tpl);
    } catch {
      return null;
    }
  }

  exportTemplate(id) {
    const tpl = this.getTemplate(id);
    if (!tpl) return null;
    return JSON.stringify(tpl, null, 2);
  }

  // Reset to seed data
  reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.data = null;
    location.reload();
  }
}

export const store = new Store();
export { SEED_WIREFRAMES, SEED_TEMPLATES };
