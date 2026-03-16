import { useState } from 'react';
import { useNotes } from '@/hooks/useNotes';
import { useSettings } from '@/hooks/useSettings';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
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
    addMedia, getNotesByFolder, getChildFolders, getRootFolders, getDescendantFolderIds,
  } = useNotes();

  const { settings, updateSetting } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { isRecording, transcript, startRecording, stopRecording } = useAudioTranscription();

  const handleStopRecording = async () => {
    const text = await stopRecording();
    if (!text) {
      toast.error('No speech was detected');
      return;
    }
    await createNoteWithContent('Voice Note', `<p>${text}</p>`);
    toast.success('Voice note created');
  };

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
        confirmDelete={settings.confirmDelete}
        onOpenSettings={() => setSettingsOpen(true)}
        isRecording={isRecording}
        recordingTranscript={transcript}
        onStartRecording={startRecording}
        onStopRecording={handleStopRecording}
      />

      {activeNote ? (
        <NoteEditor
          note={activeNote}
          onUpdateTitle={(title) => updateNote(activeNote.id, { title })}
          onUpdateContent={(content) => updateNote(activeNote.id, { content })}
          onAddMedia={(file) => addMedia(file)}
          confirmDeleteAiChat={settings.confirmDeleteAiChat}
          confirmDeleteTable={settings.confirmDeleteTable}
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
      />
    </div>
  );
};

export default Index;
