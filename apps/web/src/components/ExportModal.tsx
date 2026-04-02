import { useState } from 'react';
import { api } from '../lib/api';
import { useToast } from '../hooks/useToast';

type Props = {
  open: boolean;
  onClose: () => void;
  prdId?: string;
  prdTitle?: string;
};

const formats = [
  { id: 'pdf', icon: '📄', name: 'PDF', desc: 'Print-ready PDF via browser (opens HTML for print)' },
  { id: 'docx', icon: '📝', name: 'DOCX', desc: 'Microsoft Word document with full formatting' },
  { id: 'md', icon: '📋', name: 'Markdown', desc: 'Clean markdown for GitHub, wikis, or docs' },
  { id: 'html', icon: '🌐', name: 'HTML', desc: 'Standalone HTML with embedded styles' },
  { id: 'confluence', icon: '🏢', name: 'Confluence', desc: 'HTML formatted for Confluence paste' },
  { id: 'notion', icon: '📓', name: 'Notion', desc: 'Markdown formatted for Notion import' },
  { id: 'json', icon: '🔌', name: 'JSON', desc: 'Structured data for integrations & APIs' },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportModal({ open, onClose, prdId, prdTitle }: Props) {
  const { showToast } = useToast();
  const [selected, setSelected] = useState('pdf');
  const [exporting, setExporting] = useState(false);

  if (!open) return null;

  async function handleExport() {
    if (!prdId) { showToast('No PRD to export', 'error'); return; }
    setExporting(true);
    try {
      const fmt = selected === 'pdf' ? 'html' : selected;
      const data = await api.exportPrd(prdId, fmt) as Record<string, string>;

      if (selected === 'pdf') {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(data.html || data.content || '');
          win.document.close();
          setTimeout(() => win.print(), 500);
        }
      } else if (data.encoding === 'base64') {
        const bytes = Uint8Array.from(atob(data.content), c => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: data.mime || 'application/octet-stream' });
        downloadBlob(blob, data.filename || `export.${selected}`);
      } else if (selected === 'html') {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(data.html || data.content || '');
          win.document.close();
        }
      } else {
        const content = data.html || data.content || '';
        const mimeMap: Record<string, string> = {
          md: 'text/markdown', json: 'application/json',
          confluence: 'text/html', notion: 'text/markdown'
        };
        const blob = new Blob([content], { type: mimeMap[selected] || 'text/plain' });
        downloadBlob(blob, data.filename || `${prdTitle || 'prd'}.${selected}`);
      }

      if (data.hint) showToast(data.hint, 'info');
      showToast(`Exported "${prdTitle || 'PRD'}" as ${selected.toUpperCase()}`, 'success');
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="animate-modal-in w-[560px] max-w-[95vw] rounded-2xl border shadow-2xl" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-light)', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
        <div className="flex items-start justify-between px-6 pt-5 pb-4">
          <div>
            <h2 className="font-heading text-lg font-bold text-[var(--text-primary)]">Export PRD</h2>
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">Choose an export format for "{prdTitle || 'Untitled PRD'}"</p>
          </div>
          <button type="button" className="text-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={onClose}>✕</button>
        </div>
        <div className="px-6 pb-5">
          <div className="grid grid-cols-2 gap-2">
            {formats.map((f) => (
              <button
                key={f.id}
                type="button"
                className="rounded-[9px] border p-3 text-left transition-all"
                style={{
                  background: selected === f.id ? 'var(--indigo-dim)' : 'var(--bg-base)',
                  borderColor: selected === f.id ? 'var(--indigo)' : 'var(--border)',
                }}
                onClick={() => setSelected(f.id)}
              >
                <div className="text-[13px] font-semibold text-[var(--text-primary)]">{f.icon} {f.name}</div>
                <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2.5 border-t px-6 py-4" style={{ borderColor: 'var(--border)' }}>
          <button type="button" className="rounded-lg border px-3.5 py-1.5 text-[13px] font-medium" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderColor: 'var(--border-light)' }} onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-white shadow hover:-translate-y-px disabled:opacity-50"
            style={{ background: 'var(--indigo)', boxShadow: '0 2px 8px rgba(91,126,248,0.35)' }}
            disabled={exporting}
            onClick={handleExport}
          >
            {exporting ? 'Exporting…' : `📦 Export as ${formats.find(f => f.id === selected)?.name || selected.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
