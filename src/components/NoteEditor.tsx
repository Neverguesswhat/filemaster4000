import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Heading1, Heading2, ImagePlus, Minus, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AISummaryPanel } from './AISummaryPanel';
import type { Note } from '@/types/notes';

interface Props {
  note: Note;
  onUpdateTitle: (title: string) => void;
  onUpdateContent: (content: string) => void;
  onAddMedia: (file: File) => Promise<string>;
  confirmDeleteAiChat: boolean;
}

export function NoteEditor({ note, onUpdateTitle, onUpdateContent, onAddMedia, confirmDeleteAiChat }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryNoteId, setSummaryNoteId] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const scopedSummary = summaryNoteId === note.id ? summary : null;

  // Reset AI state when switching notes
  useEffect(() => {
    setSummary(null);
    setIsSummarizing(false);
    setAiPanelOpen(false);
  }, [note.id]);

  const handleSummarize = useCallback(async () => {
    if (!note.content || note.content.trim() === '' || note.content === '<p></p>') {
      toast.error('Add some content to your note first');
      return;
    }
    setIsSummarizing(true);
    setSummary(null);
    setAiPanelOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke('summarize-note', {
        body: { content: note.content, title: note.title },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else {
        setSummary(data.summary);
      }
    } catch (e) {
      console.error('Summarize error:', e);
      toast.error('Failed to summarize note');
    } finally {
      setIsSummarizing(false);
    }
  }, [note.content, note.title]);
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
      <div className="flex items-center gap-0.5 px-6 h-[41px] border-b border-border bg-background sticky top-0 z-10">
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
        <div className="w-px h-5 bg-border mx-1" />
        <button
          onClick={() => { summary ? setAiPanelOpen(true) : handleSummarize(); }}
          disabled={isSummarizing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          {isSummarizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {summary ? 'AI Summary' : 'Summarize'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <AISummaryPanel
        open={aiPanelOpen}
        summary={summary}
        isSummarizing={isSummarizing}
        noteContent={note.content}
        noteTitle={note.title}
        noteId={note.id}
        onClose={() => setAiPanelOpen(false)}
        onSummaryLoaded={(s) => setSummary(s)}
        onClearSummary={() => setSummary(null)}
        confirmDeleteAiChat={confirmDeleteAiChat}
      />

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
