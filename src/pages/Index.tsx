import { useNotes } from '@/hooks/useNotes';
import { FolderSidebar } from '@/components/FolderSidebar';
import { NoteEditor } from '@/components/NoteEditor';
import { FileText } from 'lucide-react';

const Index = () => {
  const {
    folders, unfiledNotes, activeNote, activeNoteId,
    setActiveNoteId, createFolder, deleteFolder,
    createNote, updateNote, deleteNote, moveNoteToFolder,
    addMedia, getNotesByFolder,
  } = useNotes();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <FolderSidebar
        folders={folders}
        unfiledNotes={unfiledNotes}
        getNotesByFolder={getNotesByFolder}
        activeNoteId={activeNoteId}
        onCreateFolder={createFolder}
        onDeleteFolder={deleteFolder}
        onSelectNote={setActiveNoteId}
        onCreateNote={createNote}
        onDeleteNote={deleteNote}
        onMoveNote={moveNoteToFolder}
      />

      {activeNote ? (
        <NoteEditor
          note={activeNote}
          onUpdateTitle={(title) => updateNote(activeNote.id, { title })}
          onUpdateContent={(content) => updateNote(activeNote.id, { content })}
          onAddMedia={(file) => addMedia(file, activeNote.id, activeNote.folderId)}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-lg text-muted-foreground">Select or create a note</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Use the sidebar to get started</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
