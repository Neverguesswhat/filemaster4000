import { useState, useCallback } from 'react';
import { Folder, FolderOpen, Plus, FileText, Trash2, ChevronRight, ChevronDown, Settings, Mic, Square } from 'lucide-react';
import type { Folder as FolderType, Note } from '@/types/notes';
import { DeleteFolderDialog } from './DeleteFolderDialog';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

interface Props {
  folders: FolderType[];
  notes: Note[];
  unfiledNotes: Note[];
  getNotesByFolder: (folderId: string) => Note[];
  getChildFolders: (parentId: string | null) => FolderType[];
  getRootFolders: () => FolderType[];
  getDescendantFolderIds: (folderId: string, allFolders: FolderType[]) => string[];
  activeNoteId: string | null;
  onCreateFolder: (name: string, parentId?: string | null) => void;
  onDeleteFolderAll: (id: string) => void;
  onDeleteFolderKeep: (id: string, noteIds: string[]) => void;
  onMoveFolderToParent: (folderId: string, parentId: string | null) => void;
  onSelectNote: (id: string) => void;
  onCreateNote: (folderId: string | null) => void;
  onDeleteNote: (id: string) => void;
  onMoveNote: (noteId: string, folderId: string | null) => void;
  confirmDelete: boolean;
  onOpenSettings: () => void;
  isRecording: boolean;
  recordingTranscript: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export function FolderSidebar({
  folders, notes, unfiledNotes, getNotesByFolder, getChildFolders, getRootFolders,
  getDescendantFolderIds, activeNoteId,
  onCreateFolder, onDeleteFolderAll, onDeleteFolderKeep, onMoveFolderToParent,
  onSelectNote, onCreateNote, onDeleteNote, onMoveNote,
  confirmDelete, onOpenSettings,
  isRecording, recordingTranscript, onStartRecording, onStopRecording,
}: Props) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [deletingFolder, setDeletingFolder] = useState<FolderType | null>(null);
  const [confirmDeleteNote, setConfirmDeleteNote] = useState<Note | null>(null);
  const [confirmDeleteEmptyFolder, setConfirmDeleteEmptyFolder] = useState<FolderType | null>(null);

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

  const getAllNotesInFolder = useCallback((folderId: string): Note[] => {
    const descendantIds = getDescendantFolderIds(folderId, folders);
    const allIds = [folderId, ...descendantIds];
    return notes.filter(n => allIds.includes(n.folderId ?? ''));
  }, [folders, notes, getDescendantFolderIds]);

  const handleDeleteFolder = (folder: FolderType) => {
    const allNotes = getAllNotesInFolder(folder.id);
    if (allNotes.length === 0) {
      if (confirmDelete) {
        setConfirmDeleteEmptyFolder(folder);
      } else {
        onDeleteFolderAll(folder.id);
      }
    } else {
      setDeletingFolder(folder);
    }
  };

  const handleDeleteNote = (id: string) => {
    if (confirmDelete) {
      const note = notes.find(n => n.id === id);
      if (note) setConfirmDeleteNote(note);
    } else {
      onDeleteNote(id);
    }
  };

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    const noteId = e.dataTransfer.getData('noteId');
    const dragFolderId = e.dataTransfer.getData('folderId');
    if (noteId) {
      onMoveNote(noteId, folderId);
      if (folderId) setExpandedFolders(prev => new Set([...prev, folderId]));
    } else if (dragFolderId && dragFolderId !== folderId) {
      onMoveFolderToParent(dragFolderId, folderId);
      if (folderId) setExpandedFolders(prev => new Set([...prev, folderId]));
    }
    setDragOverFolder(null);
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(folderId);
  };

  const rootFolders = getRootFolders();

  return (
    <>
      <aside className="w-[250px] min-w-[250px] h-screen bg-secondary border-r border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-[41px] border-b border-border">
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

          {/* Recursive folder tree */}
          {rootFolders.map(folder => (
            <FolderItem
              key={folder.id}
              folder={folder}
              depth={0}
              expandedFolders={expandedFolders}
              dragOverFolder={dragOverFolder}
              activeNoteId={activeNoteId}
              getNotesByFolder={getNotesByFolder}
              getChildFolders={getChildFolders}
              getDescendantFolderIds={getDescendantFolderIds}
              allFolders={folders}
              onToggle={toggleFolder}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragOverFolder(null)}
              onCreateNote={onCreateNote}
              onDeleteFolder={handleDeleteFolder}
              onSelectNote={onSelectNote}
              onDeleteNote={handleDeleteNote}
            />
          ))}

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
                  onDelete={handleDeleteNote}
                  depth={0}
                />
              ))}
            </div>
          )}

          {rootFolders.length === 0 && unfiledNotes.length === 0 && (
            <div className="px-4 py-8 text-center">
              <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notes yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create a folder or note to get started</p>
            </div>
          )}
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="px-3 py-2 mx-2 mb-1 rounded-md bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-xs font-medium text-destructive">Recording...</span>
            </div>
            {recordingTranscript && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{recordingTranscript}</p>
            )}
          </div>
        )}

        {/* Actions Section */}
        <div className="border-t border-border p-2 space-y-1">
          <button
            onClick={() => onCreateNote(null)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            New note
          </button>
          <button
            onClick={isRecording ? onStopRecording : onStartRecording}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
              isRecording
                ? 'text-destructive hover:bg-destructive/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                New voice note
              </>
            )}
          </button>
        </div>

        {/* Settings Section */}
        <div className="border-t border-border p-2">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </aside>

      {deletingFolder && (
        <DeleteFolderDialog
          open={!!deletingFolder}
          folderName={deletingFolder.name}
          notes={getAllNotesInFolder(deletingFolder.id)}
          onClose={() => setDeletingFolder(null)}
          onDeleteAll={() => { onDeleteFolderAll(deletingFolder.id); setDeletingFolder(null); }}
          onKeepSelected={(ids) => { onDeleteFolderKeep(deletingFolder.id, ids); setDeletingFolder(null); }}
        />
      )}

      <ConfirmDeleteDialog
        open={!!confirmDeleteNote}
        title={`Delete "${confirmDeleteNote?.title || 'Untitled'}"?`}
        description="This note will be permanently deleted. This action cannot be undone."
        onConfirm={() => { if (confirmDeleteNote) onDeleteNote(confirmDeleteNote.id); setConfirmDeleteNote(null); }}
        onCancel={() => setConfirmDeleteNote(null)}
      />

      <ConfirmDeleteDialog
        open={!!confirmDeleteEmptyFolder}
        title={`Delete "${confirmDeleteEmptyFolder?.name}"?`}
        description="This empty folder will be permanently deleted."
        onConfirm={() => { if (confirmDeleteEmptyFolder) onDeleteFolderAll(confirmDeleteEmptyFolder.id); setConfirmDeleteEmptyFolder(null); }}
        onCancel={() => setConfirmDeleteEmptyFolder(null)}
      />
    </>
  );
}

// Recursive folder component
function FolderItem({
  folder, depth, expandedFolders, dragOverFolder, activeNoteId,
  getNotesByFolder, getChildFolders, getDescendantFolderIds, allFolders,
  onToggle, onDrop, onDragOver, onDragLeave,
  onCreateNote, onDeleteFolder, onSelectNote, onDeleteNote,
}: {
  folder: FolderType;
  depth: number;
  expandedFolders: Set<string>;
  dragOverFolder: string | null;
  activeNoteId: string | null;
  getNotesByFolder: (id: string) => Note[];
  getChildFolders: (parentId: string | null) => FolderType[];
  getDescendantFolderIds: (folderId: string, allFolders: FolderType[]) => string[];
  allFolders: FolderType[];
  onToggle: (id: string) => void;
  onDrop: (e: React.DragEvent, folderId: string | null) => void;
  onDragOver: (e: React.DragEvent, folderId: string | null) => void;
  onDragLeave: () => void;
  onCreateNote: (folderId: string | null) => void;
  onDeleteFolder: (folder: FolderType) => void;
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
}) {
  const folderNotes = getNotesByFolder(folder.id);
  const childFolders = getChildFolders(folder.id);
  const isExpanded = expandedFolders.has(folder.id);
  const isDragOver = dragOverFolder === folder.id;
  const paddingLeft = 12 + depth * 16;

  // Count all descendant subfolders
  const allDescendantIds = getDescendantFolderIds(folder.id, allFolders);
  const totalSubfolders = allDescendantIds.length;
  // Count all files across this folder + all descendant folders
  const totalFiles = [folder.id, ...allDescendantIds].reduce((sum, fid) => sum + getNotesByFolder(fid).length, 0);

  return (
    <div>
      <div
        draggable
        onDragStart={e => {
          e.stopPropagation();
          e.dataTransfer.setData('folderId', folder.id);
        }}
        className={`group relative flex items-center gap-1.5 py-1.5 pr-4 mx-1 rounded-md cursor-pointer transition-colors ${
          isDragOver ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-accent'
        }`}
        style={{ paddingLeft }}
        onClick={() => onToggle(folder.id)}
        onDrop={e => onDrop(e, folder.id)}
        onDragOver={e => onDragOver(e, folder.id)}
        onDragLeave={onDragLeave}
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

        {/* Badges — visible by default, hidden on hover when action buttons show */}
        <div className="flex items-center gap-2 shrink-0 group-hover:invisible">
          {totalSubfolders > 0 && (
            <span className="text-[10px] font-medium text-muted-foreground" title={`${totalSubfolders} subfolder${totalSubfolders > 1 ? 's' : ''}`}>
              {totalSubfolders}
            </span>
          )}
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-medium rounded-full bg-primary/10 text-primary" title={`${totalFiles} file${totalFiles !== 1 ? 's' : ''}`}>
            {totalFiles}
          </span>
        </div>

        {/* Action buttons — hidden by default, shown on hover in same position */}
        <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); onCreateNote(folder.id); }}
            className="p-0.5 hover:text-primary"
            title="New note in folder"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDeleteFolder(folder); }}
            className="p-0.5 hover:text-destructive"
            title="Delete folder"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {childFolders.map(child => (
            <FolderItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              dragOverFolder={dragOverFolder}
              activeNoteId={activeNoteId}
              getNotesByFolder={getNotesByFolder}
              getChildFolders={getChildFolders}
              getDescendantFolderIds={getDescendantFolderIds}
              allFolders={allFolders}
              onToggle={onToggle}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onCreateNote={onCreateNote}
              onDeleteFolder={onDeleteFolder}
              onSelectNote={onSelectNote}
              onDeleteNote={onDeleteNote}
            />
          ))}
          {folderNotes.map(note => (
            <NoteItem
              key={note.id}
              note={note}
              isActive={note.id === activeNoteId}
              onSelect={onSelectNote}
              onDelete={onDeleteNote}
              depth={depth + 1}
            />
          ))}
        </>
      )}
    </div>
  );
}

function NoteItem({ note, isActive, onSelect, onDelete, depth }: {
  note: Note;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  depth: number;
}) {
  const paddingLeft = 28 + depth * 16;
  return (
    <div
      draggable
      onDragStart={e => {
        e.stopPropagation();
        e.dataTransfer.setData('noteId', note.id);
      }}
      onClick={() => onSelect(note.id)}
      className={`group flex items-center gap-2 py-1.5 pr-3 mx-1 rounded-md cursor-pointer transition-colors ${
        isActive ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-foreground'
      }`}
      style={{ paddingLeft }}
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
