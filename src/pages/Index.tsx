import { useState, useEffect, useRef, useCallback } from 'react';
import { useNotes } from '@/hooks/useNotes';
import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { FolderSidebar } from '@/components/FolderSidebar';
import { NoteEditor } from '@/components/NoteEditor';
import { SettingsPanel } from '@/components/SettingsPanel';
import { FolderSidebar } from '@/components/FolderSidebar';
import { NoteEditor } from '@/components/NoteEditor';
import { SettingsPanel } from '@/components/SettingsPanel';
import { FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const {
    notes, folders, unfiledNotes, activeNote, activeNoteId,
    setActiveNoteId, createFolder,
    deleteFolderAndContents, deleteFolderKeepNotes, moveFolderToParent,
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
    <div className="flex h-screen w-full overflow-hidden">
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
      />

      {activeNote ? (
        <NoteEditor
          note={activeNote}
          onUpdateTitle={(title) => debouncedUpdateNote(activeNote.id, { title })}
          onUpdateContent={(content) => debouncedUpdateNote(activeNote.id, { content })}
          onAddMedia={(file) => addMedia(file)}
          onTogglePin={togglePin}
          confirmDeleteAiChat={settings.confirmDeleteAiChat}
          confirmDeleteTable={settings.confirmDeleteTable}
          isRecording={isRecording}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
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
      />
    </div>
  );
};

export default Index;
