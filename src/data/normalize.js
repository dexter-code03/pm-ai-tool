function formatRelative(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function normalizePrdFromApi(p) {
  const raw = p.content;
  const sections = Array.isArray(raw) ? raw : typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : [];
  const statusMap = { draft: 'draft', review: 'review', approved: 'approved', archived: 'archived' };
  const st = statusMap[p.status] || 'draft';
  return {
    id: p.id,
    title: p.title,
    status: st,
    jiraKey: p.jiraKey || '—',
    template: 'Standard Feature PRD',
    icon: '📄',
    iconColor: 'blue',
    progress: st === 'approved' ? 100 : st === 'review' ? 60 : 15,
    progressColor: st === 'approved' ? 'green' : '',
    sectionCount: sections.length,
    collaborators: [],
    lastEdited: formatRelative(p.updatedAt),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    sections,
    versions: [],
    comments: [],
    exports: [],
    linkedWireframe: null
  };
}

export function normalizeCommentFromApi(c) {
  const name = c.user?.name || 'User';
  const initials = name
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';
  return {
    id: c.id,
    sectionId: c.sectionId,
    text: c.content,
    author: name,
    authorInitials: initials,
    status: c.status === 'resolved' ? 'resolved' : 'open',
    createdAt: c.createdAt,
    replies: []
  };
}

export function normalizeWireframeFromApi(w) {
  const screens = w.screens || [];
  const preview = screens.slice(0, 3).map(s =>
    s.screenshotUrl
      ? { screenshotUrl: s.screenshotUrl, title: s.title }
      : { bars: [{ cls: 'accent w80' }, { cls: 'w60' }], box: true }
  );
  const linked = w.links?.[0]?.prd;
  return {
    id: w.id,
    title: w.title,
    screens: screens.length,
    figma: false,
    updated: formatRelative(w.updatedAt),
    linkedPrd: linked?.id || null,
    status: w.status,
    preview: preview.length ? preview : [{ bars: [{ cls: 'w60' }], box: true }],
    _apiScreens: screens,
    flowScreens: screens.map(s => ({
      id: s.id,
      title: s.title,
      prompt: s.prompt,
      screenshotUrl: s.screenshotUrl,
      htmlUrl: s.htmlUrl
    }))
  };
}
