import { useState } from 'react';
import { Folder, FolderOpen, Plus, FileText, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import type { Folder as FolderType, Note } from '@/types/notes';

interface Props {
  folders: FolderType[];
  unfiledNotes: Note[];
  getNotesByFolder: (folderId: string) => Note[];
  activeNoteId: string | null;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onSelectNote: (id: string) => void;
  onCreateNote: (folderId: string | null) => void;
  onDeleteNote: (id: string) => void;
  onMoveNote: (noteId: string, folderId: string) => void;
}

export function FolderSidebar({
  folders, unfiledNotes, getNotesByFolder, activeNoteId,
  onCreateFolder, onDeleteFolder, onSelectNote, onCreateNote, onDeleteNote, onMoveNote,
}: Props) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsAddingFolder(false);
    }
  };

  const handleDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    const noteId = e.dataTransfer.getData('noteId');
    if (noteId) {
      onMoveNote(noteId, folderId);
      setExpandedFolders(prev => new Set([...prev, folderId]));
    }
    setDragOverFolder(null);
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDragOverFolder(folderId);
  };

  return (
    <aside className="w-[250px] min-w-[250px] h-screen bg-secondary border-r border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">Folders</h2>
        <button
          onClick={() => setIsAddingFolder(true)}
          className="p-1 rounded-md text-primary hover:bg-accent transition-colors"
          title="Add folder"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 min-h-0">
        {/* New folder input */}
        {isAddingFolder && (
          <div className="px-3 py-1">
            <input
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddFolder();
                if (e.key === 'Escape') { setIsAddingFolder(false); setNewFolderName(''); }
              }}
              onBlur={handleAddFolder}
              placeholder="Folder name..."
              className="w-full px-2 py-1.5 text-sm bg-background border border-ring rounded-md outline-none placeholder:text-muted-foreground"
            />
          </div>
        )}

        {/* Folder list */}
        {folders.map(folder => {
          const folderNotes = getNotesByFolder(folder.id);
          const isExpanded = expandedFolders.has(folder.id);
          const isDragOver = dragOverFolder === folder.id;

          return (
            <div key={folder.id}>
              <div
                className={`group flex items-center gap-1.5 px-3 py-1.5 mx-1 rounded-md cursor-pointer transition-colors ${
                  isDragOver ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-accent'
                }`}
                onClick={() => toggleFolder(folder.id)}
                onDrop={e => handleDrop(e, folder.id)}
                onDragOver={e => handleDragOver(e, folder.id)}
                onDragLeave={() => setDragOverFolder(null)}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                )}
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm text-foreground truncate flex-1">{folder.name}</span>
                <span className="text-xs text-muted-foreground">{folderNotes.length}</span>
                <button
                  onClick={e => { e.stopPropagation(); onCreateNote(folder.id); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-primary transition-opacity"
                  title="New note in folder"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onDeleteFolder(folder.id); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity"
                  title="Delete folder"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {isExpanded && folderNotes.map(note => (
                <NoteItem
                  key={note.id}
                  note={note}
                  isActive={note.id === activeNoteId}
                  onSelect={onSelectNote}
                  onDelete={onDeleteNote}
                  indent
                />
              ))}
            </div>
          );
        })}

        {/* Unfiled notes */}
        {unfiledNotes.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between px-4 py-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</h3>
              <button
                onClick={() => onCreateNote(null)}
                className="p-0.5 rounded text-muted-foreground hover:text-primary transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            {unfiledNotes.map(note => (
              <NoteItem
                key={note.id}
                note={note}
                isActive={note.id === activeNoteId}
                onSelect={onSelectNote}
                onDelete={onDeleteNote}
              />
            ))}
          </div>
        )}

        {folders.length === 0 && unfiledNotes.length === 0 && (
          <div className="px-4 py-8 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notes yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create a folder or note to get started</p>
          </div>
        )}
      </div>

      {/* Bottom new note button */}
      <div className="border-t border-border p-2">
        <button
          onClick={() => onCreateNote(null)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Note
        </button>
      </div>
    </aside>
  );
}

function NoteItem({ note, isActive, onSelect, onDelete, indent = false }: {
  note: Note;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  indent?: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={e => e.dataTransfer.setData('noteId', note.id)}
      onClick={() => onSelect(note.id)}
      className={`group flex items-center gap-2 py-1.5 mx-1 rounded-md cursor-pointer transition-colors ${
        indent ? 'pl-9 pr-3' : 'px-3'
      } ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-foreground'}`}
    >
      <FileText className="w-3.5 h-3.5 shrink-0 opacity-60" />
      <span className="text-sm truncate flex-1">{note.title || 'Untitled'}</span>
      <button
        onClick={e => { e.stopPropagation(); onDelete(note.id); }}
        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}
