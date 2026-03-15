import { useState, useCallback, useEffect } from 'react';
import { Sparkles, X, Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConversationItem {
  question: string;
  answer: string;
}

interface Props {
  summary: string | null;
  isSummarizing: boolean;
  noteContent: string;
  noteTitle: string;
  noteId: string;
  onClose: () => void;
  onSummaryLoaded: (summary: string) => void;
}

export function AISummaryPanel({ summary, isSummarizing, noteContent, noteTitle, noteId, onClose, onSummaryLoaded }: Props) {
  const [followUp, setFollowUp] = useState('');
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Load existing conversation for this note
  useEffect(() => {
    const loadConversation = async () => {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('note_id', noteId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setConversationId(data.id);
        setConversation((data.conversation as ConversationItem[]) || []);
        onSummaryLoaded(data.summary);
      } else {
        setConversationId(null);
        setConversation([]);
      }
    };
    loadConversation();
  }, [noteId]);

  // Save conversation when summary or conversation changes
  useEffect(() => {
    if (!summary) return;
    const save = async () => {
      const payload = {
        note_id: noteId,
        summary,
        conversation: conversation as unknown as Record<string, unknown>[],
        updated_at: new Date().toISOString(),
      };

      if (conversationId) {
        await supabase.from('ai_conversations').update(payload).eq('id', conversationId);
      } else {
        const { data } = await supabase.from('ai_conversations').insert(payload).select().single();
        if (data) setConversationId(data.id);
      }
    };
    save();
  }, [summary, conversation, noteId, conversationId]);

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

  if (!summary && !isSummarizing) return null;

  return (
    <div className="mx-6 mt-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">AI Summary</span>
        {!isSummarizing && (
          <button onClick={onClose} className="ml-auto p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isSummarizing ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Generating summary…</span>
        </div>
      ) : (
        <>
          <p className="text-sm text-foreground leading-relaxed">{summary}</p>

          {conversation.map((item, i) => (
            <div key={i} className="mt-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">You: {item.question}</p>
              <p className="text-sm text-foreground leading-relaxed">{item.answer}</p>
            </div>
          ))}

          {isAsking && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Thinking…</span>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <input
              value={followUp}
              onChange={e => setFollowUp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAsk()}
              placeholder="Ask a follow-up question…"
              disabled={isAsking}
              className="flex-1 text-sm bg-background border border-border rounded-md px-3 py-1.5 outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50 disabled:opacity-50"
            />
            <button
              onClick={handleAsk}
              disabled={isAsking || !followUp.trim()}
              className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
