import { useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { api } from '../lib/api';

type Props = {
  content: string;
  onChange?: (html: string) => void;
  placeholder?: string;
};

export function TiptapEditor({ content, onChange, placeholder = 'Start writing…' }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Placeholder.configure({ placeholder }),
      Image.configure({ HTMLAttributes: { class: 'max-w-full rounded-md' }, allowBase64: false }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'tiptap-surface',
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML());
    },
  });

  const onPickImage = useCallback(() => { fileRef.current?.click(); }, []);

  const onFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editor) return;
    try {
      const { uploadUrl, publicUrl } = await api.presignUpload({ contentType: file.type || 'image/png', prefix: 'editor-images' });
      const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
      if (!put.ok) throw new Error('Upload failed');
      const src = publicUrl || uploadUrl.split('?')[0];
      editor.chain().focus().setImage({ src }).run();
    } catch {
      // S3 may not be configured
    }
  }, [editor]);

  if (!editor) return <div className="text-[var(--text-muted)]">Loading editor…</div>;

  return (
    <div className="tiptap-editor">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <div className="mb-2 flex flex-wrap gap-0.5">
        <TBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></TBtn>
        <TBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></TBtn>
        <TBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></TBtn>
        <TBtn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} style={{ fontFamily: 'monospace' }}>&lt;/&gt;</TBtn>
        <div className="mx-1 w-px self-stretch" style={{ background: 'var(--border)' }} />
        <TBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</TBtn>
        <TBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</TBtn>
        <TBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>≡</TBtn>
        <TBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</TBtn>
        <div className="mx-1 w-px self-stretch" style={{ background: 'var(--border)' }} />
        <TBtn onClick={onPickImage}>🖼</TBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function TBtn({ children, active, onClick, style }: { children: React.ReactNode; active?: boolean; onClick: () => void; style?: React.CSSProperties }) {
  return (
    <button
      type="button"
      className="flex h-[30px] w-[30px] items-center justify-center rounded-md text-[13px] font-semibold transition-all"
      style={{
        background: active ? 'var(--indigo-dim)' : 'transparent',
        color: active ? 'var(--indigo)' : 'var(--text-muted)',
        ...style,
      }}
      onClick={onClick}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
    >
      {children}
    </button>
  );
}
