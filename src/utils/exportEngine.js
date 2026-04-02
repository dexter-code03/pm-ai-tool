/* ═══════════════════════════════════════════════════════════
   PM AI TOOL — Export Engine
   Real file generation: PDF, Markdown, JSON, DOCX, Clipboard
   ═══════════════════════════════════════════════════════════ */

import { showToast } from '../components/notifications.js';
import { store } from '../data/store.js';

// ─── Helpers ───
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
}

function sanitizeFilename(title) {
  return title.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '_').substring(0, 60);
}

function sectionToText(section) {
  if (section.type === 'text') return section.content || '';
  if (section.type === 'list') return (section.items || []).map(i => `• ${i}`).join('\n');
  if (section.type === 'table') {
    const headers = (section.headers || []).join(' | ');
    const sep = section.headers?.map(() => '---').join(' | ') || '';
    const rows = (section.rows || []).map(r => r.join(' | ')).join('\n');
    return `${headers}\n${sep}\n${rows}`;
  }
  return '';
}

// ─── PDF Export ───
export function exportToPDF(prd) {
  const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>${prd.title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; font-size: 12px; line-height: 1.7; color: #1a1a2e; padding: 48px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 28px; font-weight: 700; color: #0a0a1a; margin-bottom: 8px; letter-spacing: -0.5px; }
  .meta { display: flex; gap: 24px; font-size: 11px; color: #666; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #eee; flex-wrap: wrap; }
  .meta span { display: flex; align-items: center; gap: 4px; }
  .meta strong { color: #333; }
  .toc { background: #f8f8fc; border: 1px solid #e8e8f0; border-radius: 8px; padding: 20px 24px; margin-bottom: 32px; }
  .toc h2 { font-size: 14px; font-weight: 700; color: #333; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  .toc-item { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #555; border-bottom: 1px dotted #ddd; }
  .toc-item:last-child { border-bottom: none; }
  .toc-num { color: #6366f1; font-weight: 600; margin-right: 8px; }
  .section { margin-bottom: 28px; page-break-inside: avoid; }
  .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e8e8f0; }
  .section-num { font-size: 11px; font-weight: 700; color: #6366f1; background: #f0f0ff; padding: 2px 8px; border-radius: 4px; }
  .section-title { font-size: 16px; font-weight: 700; color: #1a1a2e; }
  .section-content { font-size: 13px; color: #333; line-height: 1.8; white-space: pre-wrap; }
  .confidence { font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 600; margin-left: auto; }
  .confidence.high { background: #dcfce7; color: #166534; }
  .confidence.mid { background: #fef3c7; color: #92400e; }
  .confidence.low { background: #fee2e2; color: #991b1b; }
  ul { padding-left: 20px; margin: 0; }
  li { margin-bottom: 6px; font-size: 13px; color: #333; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
  th { background: #f0f0f8; padding: 8px 12px; text-align: left; font-weight: 600; color: #333; border-bottom: 2px solid #ddd; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; color: #444; }
  .banner { padding: 10px 14px; border-radius: 6px; font-size: 11px; margin-bottom: 12px; }
  .banner.mid { background: #fef3c7; border: 1px solid #fcd34d; color: #92400e; }
  .banner.low { background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 2px solid #eee; font-size: 10px; color: #999; text-align: center; }
  @media print { body { padding: 24px; } .section { page-break-inside: avoid; } }
</style>
</head><body>
<h1>${prd.title}</h1>
<div class="meta">
  <span>Status: <strong>${prd.status?.charAt(0).toUpperCase() + prd.status?.slice(1)}</strong></span>
  <span>Source: <strong>${prd.jiraKey || 'Manual'}</strong></span>
  <span>Template: <strong>${prd.template || 'Standard'}</strong></span>
  <span>Author: <strong>${prd.collaborators?.[0]?.name || 'Arjun Kumar'}</strong></span>
  <span>Updated: <strong>${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong></span>
</div>
<div class="toc">
  <h2>Table of Contents</h2>
  ${(prd.sections || []).map(s => `<div class="toc-item"><span><span class="toc-num">§${s.num}</span>${s.title}</span></div>`).join('')}
</div>
${(prd.sections || []).map(s => {
  let content = '';
  if (s.banner) content += `<div class="banner ${s.banner.type}">${s.banner.text}</div>`;
  if (s.type === 'text') content += `<div class="section-content">${s.content || ''}</div>`;
  else if (s.type === 'list') content += `<ul>${(s.items || []).map(i => `<li>${i}</li>`).join('')}</ul>`;
  else if (s.type === 'table') {
    content += `<table><thead><tr>${(s.headers || []).map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${(s.rows || []).map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  return `<div class="section">
    <div class="section-header">
      <span class="section-num">§${s.num}</span>
      <span class="section-title">${s.title}</span>
      <span class="confidence ${s.confidence}">${s.confidence}</span>
    </div>
    ${content}
  </div>`;
}).join('')}
<div class="footer">Generated by PM AI Tool v1.0 · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
</body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }
  store.addExport(prd.id, 'pdf');
  showToast('📄 PDF export opened in new tab', 'success');
}

// ─── Markdown Export ───
export function exportToMarkdown(prd) {
  let md = `# ${prd.title}\n\n`;
  md += `**Status:** ${prd.status} · **Source:** ${prd.jiraKey || 'Manual'} · **Template:** ${prd.template || 'Standard'}\n`;
  md += `**Author:** ${prd.collaborators?.[0]?.name || 'Arjun Kumar'} · **Updated:** ${new Date().toLocaleDateString()}\n\n---\n\n`;

  for (const s of (prd.sections || [])) {
    md += `## §${s.num} ${s.title}\n\n`;
    if (s.banner) md += `> ⚡ ${s.banner.text}\n\n`;
    if (s.type === 'text') md += `${s.content || ''}\n\n`;
    else if (s.type === 'list') {
      for (const item of (s.items || [])) md += `- ${item}\n`;
      md += '\n';
    } else if (s.type === 'table') {
      md += `| ${(s.headers || []).join(' | ')} |\n`;
      md += `| ${(s.headers || []).map(() => '---').join(' | ')} |\n`;
      for (const row of (s.rows || [])) md += `| ${row.join(' | ')} |\n`;
      md += '\n';
    }
  }
  md += `\n---\n*Generated by PM AI Tool v1.0 · ${new Date().toLocaleDateString()}*\n`;

  downloadBlob(new Blob([md], { type: 'text/markdown' }), `${sanitizeFilename(prd.title)}.md`);
  store.addExport(prd.id, 'markdown');
  showToast('📝 Markdown exported successfully', 'success');
}

// ─── JSON Export ───
export function exportToJSON(prd) {
  const data = {
    id: prd.id,
    title: prd.title,
    status: prd.status,
    jiraKey: prd.jiraKey,
    template: prd.template,
    author: prd.collaborators?.[0]?.name || 'Arjun Kumar',
    createdAt: prd.createdAt,
    updatedAt: prd.updatedAt,
    sections: (prd.sections || []).map(s => ({
      number: s.num,
      title: s.title,
      type: s.type,
      confidence: s.confidence,
      content: s.type === 'text' ? s.content : s.type === 'list' ? s.items : { headers: s.headers, rows: s.rows },
      feedback: s.feedback
    })),
    metadata: {
      exportedAt: new Date().toISOString(),
      exportedBy: 'PM AI Tool v1.0',
      sectionCount: prd.sections?.length || 0,
      versionCount: prd.versions?.length || 0,
      commentCount: prd.comments?.length || 0
    }
  };

  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `${sanitizeFilename(prd.title)}.json`);
  store.addExport(prd.id, 'json');
  showToast('{ } JSON exported successfully', 'success');
}

// ─── DOCX Export (HTML-based) ───
export function exportToDOCX(prd) {
  // Generate a Word-compatible HTML document
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #333; }
  h1 { font-size: 24pt; color: #1a1a2e; margin-bottom: 6pt; }
  h2 { font-size: 14pt; color: #6366f1; margin-top: 18pt; margin-bottom: 6pt; border-bottom: 1pt solid #e0e0e0; padding-bottom: 4pt; }
  .meta { font-size: 10pt; color: #666; margin-bottom: 12pt; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  th { background: #f0f0f8; padding: 6pt 10pt; text-align: left; font-weight: bold; border: 1pt solid #ddd; }
  td { padding: 6pt 10pt; border: 1pt solid #ddd; }
  ul { margin: 4pt 0 4pt 20pt; }
  li { margin-bottom: 4pt; }
  .banner { padding: 8pt; border-radius: 4pt; font-size: 10pt; margin-bottom: 8pt; background: #fef3c7; border: 1pt solid #fbbf24; }
  .footer { margin-top: 24pt; border-top: 1pt solid #ccc; padding-top: 8pt; font-size: 9pt; color: #999; }
</style></head><body>
<h1>${prd.title}</h1>
<div class="meta">Status: ${prd.status} · Source: ${prd.jiraKey || 'Manual'} · Template: ${prd.template || 'Standard'} · Author: ${prd.collaborators?.[0]?.name || 'Arjun Kumar'}</div>`;

  for (const s of (prd.sections || [])) {
    html += `<h2>§${s.num} ${s.title}</h2>`;
    if (s.banner) html += `<div class="banner">${s.banner.text}</div>`;
    if (s.type === 'text') html += `<p>${(s.content || '').replace(/\n/g, '<br>')}</p>`;
    else if (s.type === 'list') html += `<ul>${(s.items || []).map(i => `<li>${i}</li>`).join('')}</ul>`;
    else if (s.type === 'table') {
      html += `<table><thead><tr>${(s.headers || []).map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`;
      for (const row of (s.rows || [])) html += `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`;
      html += '</tbody></table>';
    }
  }
  html += `<div class="footer">Generated by PM AI Tool v1.0 · ${new Date().toLocaleDateString()}</div></body></html>`;

  downloadBlob(new Blob([html], { type: 'application/vnd.ms-word' }), `${sanitizeFilename(prd.title)}.doc`);
  store.addExport(prd.id, 'docx');
  showToast('📃 DOCX exported successfully', 'success');
}

// ─── Copy to Clipboard ───
export async function copyToClipboard(prd) {
  let text = `${prd.title}\n${'═'.repeat(prd.title.length)}\n\n`;
  text += `Status: ${prd.status} | Source: ${prd.jiraKey || 'Manual'} | Template: ${prd.template || 'Standard'}\n\n`;

  for (const s of (prd.sections || [])) {
    text += `── §${s.num} ${s.title} ──\n\n`;
    text += sectionToText(s) + '\n\n';
  }

  try {
    await navigator.clipboard.writeText(text);
    store.addExport(prd.id, 'clipboard');
    showToast('📋 Copied to clipboard!', 'success');
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    store.addExport(prd.id, 'clipboard');
    showToast('📋 Copied to clipboard!', 'success');
  }
}
