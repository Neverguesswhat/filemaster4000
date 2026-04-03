import { useState, useCallback, useEffect, useRef } from 'react';
import { SparklesIcon, XMarkIcon, ArrowPathIcon, PaperAirplaneIcon, TrashIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConversationItem {
  question: string;
  answer: string;
}

interface Props {
  open: boolean;
  summary: string | null;
  isSummarizing: boolean;
  noteContent: string;
  noteTitle: string;
  noteId: string;
  onClose: () => void;
  onSummaryLoaded: (summary: string) => void;
  onClearSummary: () => void;
  confirmDeleteAiChat: boolean;
}

export function AISummaryPanel({ open, summary, isSummarizing, noteContent, noteTitle, noteId, onClose, onSummaryLoaded, onClearSummary, confirmDeleteAiChat }: Props) {
  const [followUp, setFollowUp] = useState('');
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const lastSavedSignatureRef = useRef<string | null>(null);
  const suppressSaveRef = useRef(false);
  const loadedRef = useRef(false);

  // Reset and load existing conversation for this note
  useEffect(() => {
    let isCurrent = true;

    // Immediately reset state to prevent showing stale data from another note
    setConversationId(null);
    setConversation([]);
    lastSavedSignatureRef.current = null;
    loadedRef.current = false;

    const loadConversation = async () => {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('note_id', noteId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!isCurrent) return;

      if (!error && data) {
        const loadedConversation = (data.conversation as unknown as ConversationItem[]) || [];
        setConversationId(data.id);
        setConversation(loadedConversation);
        onSummaryLoaded(data.summary);
        lastSavedSignatureRef.current = `${noteId}::${data.summary}::${JSON.stringify(loadedConversation)}`;
        loadedRef.current = true;
      } else {
        loadedRef.current = true;
      }
    };

    loadConversation();

    return () => {
      isCurrent = false;
    };
  }, [noteId, onSummaryLoaded]);

  // Re-enable autosave after deletion clears summary
  useEffect(() => {
    if (!summary) {
      suppressSaveRef.current = false;
    }
  }, [summary]);

  // Save conversation when summary or conversation changes
  useEffect(() => {
    if (!summary || suppressSaveRef.current || !loadedRef.current) return;

    const signature = `${noteId}::${summary}::${JSON.stringify(conversation)}`;
    if (signature === lastSavedSignatureRef.current) return;

    let isCurrent = true;

    const save = async () => {
      const convJson = JSON.parse(JSON.stringify(conversation));
      const payload = {
        note_id: noteId,
        summary,
        conversation: convJson,
        updated_at: new Date().toISOString(),
      };

      let targetId = conversationId;

      if (!targetId) {
        const { data: existingRows } = await supabase
          .from('ai_conversations')
          .select('id')
          .eq('note_id', noteId)
          .order('updated_at', { ascending: false });

        if (existingRows && existingRows.length > 0) {
          targetId = existingRows[0].id;
          const duplicateIds = existingRows.slice(1).map((row) => row.id);

          if (duplicateIds.length > 0) {
            await supabase.from('ai_conversations').delete().in('id', duplicateIds);
          }
        }
      }

      if (targetId) {
        await supabase.from('ai_conversations').update(payload).eq('id', targetId);
        if (!conversationId && isCurrent) {
          setConversationId(targetId);
        }
      } else {
        const { data } = await supabase.from('ai_conversations').insert([payload]).select().single();
        if (data && isCurrent) {
          setConversationId(data.id);
        }
      }

      if (isCurrent) {
        lastSavedSignatureRef.current = signature;
      }
    };

    save();

    return () => {
      isCurrent = false;
    };
  }, [summary, conversation, noteId]);

  const handleAsk = useCallback(async () => {
    if (!followUp.trim() || !summary) return;
    const question = followUp.trim();
    setFollowUp('');
    setIsAsking(true);

    try {
      const currentSummary = conversation.length > 0
        ? conversation[conversation.length - 1].answer
        : summary;

      const { data, error } = await supabase.functions.invoke('summarize-note', {
        body: { content: noteContent, title: noteTitle, followUp: question, currentSummary },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else {
        setConversation(prev => [...prev, { question, answer: data.summary }]);
      }
    } catch (e) {
      console.error('Follow-up error:', e);
      toast.error('Failed to get response');
    } finally {
      setIsAsking(false);
    }
  }, [followUp, summary, conversation, noteContent, noteTitle]);

  const executeDelete = useCallback(async () => {
    suppressSaveRef.current = true;
    await supabase.from('ai_conversations').delete().eq('note_id', noteId);
    setConversationId(null);
    setConversation([]);
    lastSavedSignatureRef.current = null;
    onClearSummary();
    setShowDeleteConfirm(false);
    toast.success('AI conversation deleted');
  }, [noteId, onClearSummary]);

  const handleDelete = useCallback(() => {
    if (confirmDeleteAiChat) {
      setShowDeleteConfirm(true);
    } else {
      executeDelete();
    }
  }, [confirmDeleteAiChat, executeDelete]);

  return (
    <>
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-md [&>button]:hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <SparklesIcon className="w-4 h-4 text-primary" />
            AI Summary
          </span>
          <div className="flex items-center gap-1">
            {summary && !isSummarizing && (
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Delete conversation"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-4 space-y-4">
            {isSummarizing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                <span>Generating summary…</span>
              </div>
            ) : summary ? (
              <>
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                  <p className="text-sm text-foreground leading-relaxed">{summary}</p>
                </div>

                {conversation.map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-end">
                      <div className="rounded-lg bg-accent px-3 py-2 max-w-[85%]">
                        <p className="text-sm text-foreground">{item.question}</p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                      <p className="text-sm text-foreground leading-relaxed">{item.answer}</p>
                    </div>
                  </div>
                ))}

                {isAsking && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                    <span>Thinking…</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Click "Summarize" in the toolbar to generate a summary.</p>
            )}
          </div>
        </ScrollArea>

        {summary && !isSummarizing && (
          <div className="border-t border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                value={followUp}
                onChange={e => setFollowUp(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAsk()}
                placeholder="Ask a follow-up…"
                disabled={isAsking}
                className="flex-1 text-sm bg-background border border-border rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50 disabled:opacity-50"
              />
              <button
                onClick={handleAsk}
                disabled={isAsking || !followUp.trim()}
                className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>

    <ConfirmDeleteDialog
      open={showDeleteConfirm}
      title="Delete AI conversation"
      description="Are you sure you want to delete this AI conversation? This action cannot be undone."
      onConfirm={executeDelete}
      onCancel={() => setShowDeleteConfirm(false)}
    />
    </>
  );
}
