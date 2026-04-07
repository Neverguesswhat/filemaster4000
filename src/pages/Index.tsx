import { useState, useEffect, useRef, useCallback } from 'react';
import { useNotes } from '@/hooks/useNotes';
import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { FolderSidebar } from '@/components/FolderSidebar';
import { NoteEditor } from '@/components/NoteEditor';
import { SettingsPanel } from '@/components/SettingsPanel';
import { DocumentTextIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { FileText, FolderPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Index = () => {
  const {
    notes, folders, unfiledNotes, activeNote, activeNoteId,
    setActiveNoteId, createFolder,
    deleteFolderAndContents, deleteFolderKeepNotes, moveFolderToParent, reorderFolder,
    createNote, createNoteWithContent, updateNote, deleteNote, moveNoteToFolder,
    togglePin,
    addMedia, getNotesByFolder, getChildFolders, getRootFolders, getDescendantFolderIds,
  } = useNotes();

  const { settings, updateSetting } = useSettings();
  const { theme, setTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { isRecording, transcript, startRecording, stopRecording } = useAudioTranscription();
  const voiceNoteIdRef = useRef<string | null>(null);

  const handleStartRecording = async () => {
    const note = await createNoteWithContent('Voice Note', '<p>Listening...</p>');
    if (note) {
      voiceNoteIdRef.current = note.id;
      startRecording();
    }
  };

  useEffect(() => {
    if (isRecording && voiceNoteIdRef.current && transcript) {
      updateNote(voiceNoteIdRef.current, { content: `<p>${transcript}</p>` });
    }
  }, [transcript, isRecording, updateNote]);

  const handleStopRecording = async () => {
    const text = await stopRecording();
    const noteId = voiceNoteIdRef.current;
    voiceNoteIdRef.current = null;
    if (!text && noteId) {
      deleteNote(noteId);
      toast.error('No speech was detected');
      return;
    }
    if (noteId && text) {
      await updateNote(noteId, { content: `<p>${text}</p>` });
      toast.success('Voice note created');
    }
  };

  // Keyboard shortcuts
  const handleNewNote = useCallback(() => createNote(null), [createNote]);
  const handleSearchFocus = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
    input?.focus();
  }, []);

  useKeyboardShortcuts({
    onNewNote: handleNewNote,
    onSearch: handleSearchFocus,
  });

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      {/* Top header bar */}
      <div className="flex items-center h-[41px] min-h-[41px] border-b border-border bg-secondary">
        <div className="w-[250px] min-w-[250px] px-4 flex items-center">
          <h1 className="text-sm font-semibold text-foreground tracking-wide">File Master 4000</h1>
        </div>
        <div className="px-4 flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors outline-none">
              New
              <ChevronDownIcon className="w-3.5 h-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => createNote(null)} className="gap-2">
                <FileText className="w-4 h-4" />
                Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createFolder('New Folder')} className="gap-2">
                <FolderPlus className="w-4 h-4" />
                Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
      <FolderSidebar
        folders={folders}
        notes={notes}
        unfiledNotes={unfiledNotes}
        getNotesByFolder={getNotesByFolder}
        getChildFolders={getChildFolders}
        getRootFolders={getRootFolders}
        getDescendantFolderIds={getDescendantFolderIds}
        activeNoteId={activeNoteId}
        onCreateFolder={createFolder}
        onDeleteFolderAll={deleteFolderAndContents}
        onDeleteFolderKeep={deleteFolderKeepNotes}
        onMoveFolderToParent={moveFolderToParent}
        onReorderFolder={reorderFolder}
        onSelectNote={setActiveNoteId}
        onCreateNote={createNote}
        onDeleteNote={deleteNote}
        onMoveNote={moveNoteToFolder}
        onTogglePin={togglePin}
        confirmDelete={settings.confirmDelete}
        onOpenSettings={() => setSettingsOpen(true)}
        isRecording={isRecording}
        recordingTranscript={transcript}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onImportNote={(title, content) => createNoteWithContent(title, content)}
      />

      {activeNote ? (
        <NoteEditor
          note={activeNote}
          onUpdateTitle={(title) => updateNote(activeNote.id, { title })}
          onUpdateContent={(content) => updateNote(activeNote.id, { content })}
          onAddMedia={(file) => addMedia(file)}
          onTogglePin={togglePin}
          confirmDeleteAiChat={settings.confirmDeleteAiChat}
          confirmDeleteTable={settings.confirmDeleteTable}
          isRecording={isRecording}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <DocumentTextIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-lg text-muted-foreground">Select or create a note</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Use the sidebar to get started</p>
          </div>
        </div>
      )}

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        confirmDelete={settings.confirmDelete}
        onToggleConfirmDelete={(v) => updateSetting('confirmDelete', v)}
        confirmDeleteAiChat={settings.confirmDeleteAiChat}
        onToggleConfirmDeleteAiChat={(v) => updateSetting('confirmDeleteAiChat', v)}
        confirmDeleteTable={settings.confirmDeleteTable}
        onToggleConfirmDeleteTable={(v) => updateSetting('confirmDeleteTable', v)}
        theme={theme}
        onThemeChange={setTheme}
        notes={notes}
        folders={folders}
      />
    </div>
  );
};

export default Index;
