/**
 * Atlassian Document Format → plain text and markdown-oriented strings.
 * @param {unknown} adf
 */
export function adfToPlainText(adf) {
  if (!adf || typeof adf !== 'object') return '';
  const node = /** @type {{ type?: string, content?: unknown[], text?: string }} */ (adf);
  if (node.type === 'doc' && Array.isArray(node.content)) {
    return node.content.map(walkPlain).filter(Boolean).join('\n');
  }
  return walkPlain(adf);
}

/**
 * @param {unknown} adf
 */
export function adfToMarkdown(adf) {
  if (!adf || typeof adf !== 'object') return '';
  const node = /** @type {{ type?: string, content?: unknown[], text?: string, attrs?: Record<string, unknown> }} */ (
    adf
  );
  if (node.type === 'doc' && Array.isArray(node.content)) {
    return node.content.map(walkMd).filter(Boolean).join('\n\n');
  }
  return walkMd(adf);
}

/** @param {unknown} n */
function walkPlain(n) {
  if (n == null || typeof n !== 'object') return '';
  const node = /** @type {{ type?: string, text?: string, content?: unknown[] }} */ (n);
  if (node.text) return node.text;
  if (node.type === 'hardBreak') return '\n';
  if (node.type === 'mention') {
    const text = /** @type {{ attrs?: { text?: string } }} */ (node).attrs?.text;
    return text || '@mention';
  }
  if (Array.isArray(node.content)) {
    return node.content.map(walkPlain).join('');
  }
  return '';
}

/** @param {unknown} n */
function walkMd(n) {
  if (n == null || typeof n !== 'object') return '';
  const node = /** @type {{ type?: string, text?: string, content?: unknown[], attrs?: Record<string, unknown> }} */ (
    n
  );
  if (node.text) return node.text;
  if (node.type === 'hardBreak') return '  \n';

  if (node.type === 'heading') {
    const level = Number(/** @type {{ attrs?: { level?: number } }} */ (node).attrs?.level || 1);
    const hashes = '#'.repeat(Math.min(6, Math.max(1, level)));
    const inner = Array.isArray(node.content) ? node.content.map(walkMd).join('') : '';
    return `${hashes} ${inner}`.trim();
  }

  if (node.type === 'paragraph') {
    return Array.isArray(node.content) ? node.content.map(walkMd).join('') : '';
  }

  if (node.type === 'bulletList') {
    return (Array.isArray(node.content) ? node.content : [])
      .map((li) => {
        const item = /** @type {{ content?: unknown[] }} */ (li);
        const body = Array.isArray(item.content)
          ? item.content
              .map((c) => walkMd(c))
              .join('')
              .trim()
          : '';
        return `- ${body}`;
      })
      .join('\n');
  }

  if (node.type === 'orderedList') {
    return (Array.isArray(node.content) ? node.content : [])
      .map((li, i) => {
        const item = /** @type {{ content?: unknown[] }} */ (li);
        const body = Array.isArray(item.content)
          ? item.content
              .map((c) => walkMd(c))
              .join('')
              .trim()
          : '';
        return `${i + 1}. ${body}`;
      })
      .join('\n');
  }

  if (node.type === 'listItem') {
    return Array.isArray(node.content) ? node.content.map(walkMd).join('') : '';
  }

  if (node.type === 'codeBlock') {
    const text = Array.isArray(node.content) ? node.content.map(walkMd).join('\n') : '';
    return '```\n' + text + '\n```';
  }

  if (node.type === 'blockquote') {
    const inner = Array.isArray(node.content)
      ? node.content
          .map((c) => walkMd(c))
          .join('\n')
          .split('\n')
          .map((l) => `> ${l}`)
          .join('\n')
      : '';
    return inner;
  }

  if (node.type === 'rule') return '---';

  if (node.type === 'mediaSingle' || node.type === 'mediaGroup') {
    return Array.isArray(node.content) ? node.content.map(walkMd).join('\n') : '';
  }

  if (node.type === 'media') {
    const alt = String(/** @type {{ attrs?: { alt?: string } }} */ (node).attrs?.alt || 'media');
    return `![${alt}]()`;
  }

  if (node.type === 'mention') {
    const text = String(/** @type {{ attrs?: { text?: string } }} */ (node).attrs?.text || '@user');
    return text;
  }

  if (Array.isArray(node.content)) {
    return node.content.map(walkMd).join('');
  }
  return '';
}
