/** Aligns with server PRD `content` sections and export pipeline. */
export type PrdSectionType = 'text' | 'list' | 'table';

export type PrdSectionConfidence = 'high' | 'mid' | 'low';

export type PrdSection = {
  id: string;
  num?: number | string;
  title?: string;
  type: PrdSectionType;
  content?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
  confidence?: PrdSectionConfidence;
};

export function newSectionId(): string {
  return `sec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptySection(type: PrdSectionType = 'text'): PrdSection {
  const id = newSectionId();
  if (type === 'list') {
    return { id, type: 'list', title: 'New list', items: [''] };
  }
  if (type === 'table') {
    return {
      id,
      type: 'table',
      title: 'New table',
      headers: ['Column A', 'Column B'],
      rows: [
        ['', ''],
        ['', '']
      ]
    };
  }
  return { id, type: 'text', title: 'New section', content: '' };
}

export function normalizeSections(raw: unknown): PrdSection[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s, i) => normalizeOne(s, i)).filter(Boolean) as PrdSection[];
}

function normalizeOne(s: unknown, index: number): PrdSection | null {
  if (!s || typeof s !== 'object') return null;
  const o = s as Record<string, unknown>;
  const type = o.type === 'list' || o.type === 'table' ? o.type : 'text';
  const id = typeof o.id === 'string' ? o.id : newSectionId();
  const base: PrdSection = {
    id,
    num: o.num as number | string | undefined,
    title: typeof o.title === 'string' ? o.title : `Section ${index + 1}`,
    type,
    confidence: o.confidence as PrdSectionConfidence | undefined
  };
  if (type === 'list') {
    base.items = Array.isArray(o.items) ? o.items.map(String) : [''];
  } else if (type === 'table') {
    base.headers = Array.isArray(o.headers) ? o.headers.map(String) : ['Column A', 'Column B'];
    base.rows = Array.isArray(o.rows)
      ? (o.rows as unknown[]).map((r) => (Array.isArray(r) ? r.map(String) : []))
      : [['', '']];
  } else {
    base.content = typeof o.content === 'string' ? o.content : '';
  }
  return base;
}
