import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Heading1, Heading2, ImagePlus, Minus, Sparkles, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Note } from '@/types/notes';

interface Props {
  note: Note;
  onUpdateTitle: (title: string) => void;
  onUpdateContent: (content: string) => void;
  onAddMedia: (file: File) => Promise<string>;
}

export function NoteEditor({ note, onUpdateTitle, onUpdateContent, onAddMedia }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: 'Start writing...' }),
    ],
    content: note.content || '',
    onUpdate: ({ editor }) => {
      onUpdateContent(editor.getHTML());
    },
    editorProps: {
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          event.preventDefault();
          Array.from(files).forEach(async file => {
            if (file.type.startsWith('image/') || file.type === 'application/pdf') {
              const dataUrl = await onAddMedia(file);
              if (file.type.startsWith('image/')) {
                view.dispatch(view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.image.create({ src: dataUrl, alt: file.name })
                ));
              }
            }
          });
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        const files = event.clipboardData?.files;
        if (files && files.length > 0) {
          event.preventDefault();
          Array.from(files).forEach(async file => {
            if (file.type.startsWith('image/')) {
              const dataUrl = await onAddMedia(file);
              view.dispatch(view.state.tr.replaceSelectionWith(
                view.state.schema.nodes.image.create({ src: dataUrl, alt: file.name })
              ));
            }
          });
          return true;
        }
        return false;
      },
    },
  }, [note.id]);

  useEffect(() => {
    if (editor && editor.getHTML() !== note.content) {
      editor.commands.setContent(note.content || '');
    }
  }, [note.id]);

  const handleImageUpload = useCallback(async () => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const dataUrl = await onAddMedia(file);
    if (file.type.startsWith('image/')) {
      editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
    }
    e.target.value = '';
  }, [editor, onAddMedia]);

  if (!editor) return null;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-6 py-2 border-b border-border bg-background sticky top-0 z-10">
        <ToolbarButton
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          icon={<Heading1 className="w-4 h-4" />}
        />
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          icon={<Heading2 className="w-4 h-4" />}
        />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          icon={<Bold className="w-4 h-4" />}
        />
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          icon={<Italic className="w-4 h-4" />}
        />
        <ToolbarButton
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          icon={<Strikethrough className="w-4 h-4" />}
        />
        <ToolbarButton
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
          icon={<Code className="w-4 h-4" />}
        />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          icon={<List className="w-4 h-4" />}
        />
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          icon={<ListOrdered className="w-4 h-4" />}
        />
        <ToolbarButton
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          icon={<Quote className="w-4 h-4" />}
        />
        <ToolbarButton
          active={false}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          icon={<Minus className="w-4 h-4" />}
        />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton
          active={false}
          onClick={handleImageUpload}
          icon={<ImagePlus className="w-4 h-4" />}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[700px] mx-auto px-6 py-8">
          <input
            value={note.title}
            onChange={e => onUpdateTitle(e.target.value)}
            placeholder="Untitled"
            className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50 mb-4 text-foreground"
          />
          <div className="tiptap-editor">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({ active, onClick, icon }: { active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors ${
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      }`}
    >
      {icon}
    </button>
  );
}
