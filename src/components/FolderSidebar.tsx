import { useState, useCallback, forwardRef, useMemo, useRef } from 'react';
import { FolderIcon, FolderOpenIcon, PlusIcon, DocumentTextIcon, TrashIcon, ChevronRightIcon, ChevronDownIcon, Cog6ToothIcon, MicrophoneIcon, StopIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { Pin, User, FileText, FolderPlus, Mic, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { importFile } from '@/lib/importNote';
import { toast } from 'sonner';
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
  onReorderFolder: (folderId: string, newIndex: number, parentId: string | null) => void;
  onSelectNote: (id: string) => void;
  onCreateNote: (folderId: string | null) => void;
  onDeleteNote: (id: string) => void;
  onMoveNote: (noteId: string, folderId: string | null) => void;
  onTogglePin: (id: string) => void;
  confirmDelete: boolean;
  onOpenSettings: () => void;
  onImportNote: (title: string, content: string) => void;
  isRecording: boolean;
  recordingTranscript: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function FolderSidebar({
  folders, notes, unfiledNotes, getNotesByFolder, getChildFolders, getRootFolders,
  getDescendantFolderIds, activeNoteId,
  onCreateFolder, onDeleteFolderAll, onDeleteFolderKeep, onMoveFolderToParent, onReorderFolder,
  onSelectNote, onCreateNote, onDeleteNote, onMoveNote, onTogglePin,
  confirmDelete, onOpenSettings, onImportNote,
  isRecording, recordingTranscript, onStartRecording, onStopRecording,
  searchQuery, onSearchChange,
}: Props) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ parentId: string | null; index: number } | null>(null);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [deletingFolder, setDeletingFolder] = useState<FolderType | null>(null);
  const [confirmDeleteNote, setConfirmDeleteNote] = useState<Note | null>(null);
  const [confirmDeleteEmptyFolder, setConfirmDeleteEmptyFolder] = useState<FolderType | null>(null);
  const [showPredictions, setShowPredictions] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { title, content } = await importFile(file);
      onImportNote(title, content);
      toast.success(`Imported "${title}"`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to import file');
    }
    e.target.value = '';
  }, [onImportNote]);

  const isSearching = searchQuery.trim().length > 0;

  const filteredNotes = useMemo(() => {
    if (!isSearching) return null;
    const q = searchQuery.toLowerCase();
    return notes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().replace(/<[^>]+>/g, '').includes(q)
    );
  }, [notes, searchQuery, isSearching]);

  // Predictive suggestions (top 5 title matches)
  const predictions = useMemo(() => {
    if (!isSearching) return [];
    const q = searchQuery.toLowerCase();
    return notes
      .filter(n => n.title.toLowerCase().includes(q))
      .slice(0, 5);
  }, [notes, searchQuery, isSearching]);

  const handlePredictionSelect = useCallback((note: Note) => {
    onSelectNote(note.id);
    onSearchChange('');
    setShowPredictions(false);
    setSelectedPrediction(-1);
  }, [onSelectNote, onSearchChange]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showPredictions || predictions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedPrediction(prev => (prev + 1) % predictions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedPrediction(prev => (prev <= 0 ? predictions.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && selectedPrediction >= 0) {
      e.preventDefault();
      handlePredictionSelect(predictions[selectedPrediction]);
    } else if (e.key === 'Escape') {
      setShowPredictions(false);
    }
  }, [showPredictions, predictions, selectedPrediction, handlePredictionSelect]);
  const pinnedNotes = useMemo(() => notes.filter(n => n.pinned), [notes]);

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
      // If dropping on a specific reorder position, use reorder
      if (dropIndicator) {
        const draggedFolder = folders.find(f => f.id === dragFolderId);
        if (draggedFolder && draggedFolder.parentId === dropIndicator.parentId) {
          onReorderFolder(dragFolderId, dropIndicator.index, dropIndicator.parentId);
        } else {
          onMoveFolderToParent(dragFolderId, folderId);
        }
      } else {
        onMoveFolderToParent(dragFolderId, folderId);
      }
      if (folderId) setExpandedFolders(prev => new Set([...prev, folderId]));
    }
    setDragOverFolder(null);
    setDropIndicator(null);
  };

  const handleFolderDragOver = (e: React.DragEvent, folder: FolderType, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertIndex = e.clientY < midY ? index : index + 1;
    setDropIndicator({ parentId: folder.parentId, index: insertIndex });
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
      <aside className="w-[250px] min-w-[250px] h-full bg-secondary border-r border-border flex flex-col overflow-hidden">
        {/* Search bar at top */}
        <div className="px-3 py-2 border-b border-border">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={e => {
                onSearchChange(e.target.value);
                setShowPredictions(true);
                setSelectedPrediction(-1);
              }}
              onFocus={() => { if (searchQuery.trim()) setShowPredictions(true); }}
              onBlur={() => setTimeout(() => setShowPredictions(false), 150)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search notes… (⌘K)"
              className="w-full pl-8 pr-7 py-1.5 text-sm bg-background border border-input rounded-md outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
            {searchQuery && (
              <button onClick={() => { onSearchChange(''); setShowPredictions(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Predictive dropdown */}
            {showPredictions && predictions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
                {predictions.map((note, i) => {
                  const q = searchQuery.toLowerCase();
                  const title = note.title || 'Untitled';
                  const idx = title.toLowerCase().indexOf(q);
                  return (
                    <button
                      key={note.id}
                      onMouseDown={e => { e.preventDefault(); handlePredictionSelect(note); }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                        i === selectedPrediction ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-foreground'
                      }`}
                    >
                      <DocumentTextIcon className="w-3.5 h-3.5 shrink-0 opacity-60" />
                      <span className="truncate">
                        {idx >= 0 ? (
                          <>
                            {title.slice(0, idx)}
                            <span className="font-semibold text-primary">{title.slice(idx, idx + q.length)}</span>
                            {title.slice(idx + q.length)}
                          </>
                        ) : title}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>




        <div className="flex-1 overflow-y-auto py-2 min-h-0">
          {/* Search results */}
          {isSearching && filteredNotes && (
            <div>
              <div className="px-4 py-1">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {filteredNotes.length} result{filteredNotes.length !== 1 ? 's' : ''}
                </h3>
              </div>
              {filteredNotes.map(note => (
                <NoteItem
                  key={note.id}
                  note={note}
                  isActive={note.id === activeNoteId}
                  onSelect={onSelectNote}
                  onDelete={handleDeleteNote}
                  onTogglePin={onTogglePin}
                  depth={0}
                />
              ))}
              {filteredNotes.length === 0 && (
                <p className="px-4 py-4 text-sm text-muted-foreground text-center">No notes found</p>
              )}
            </div>
          )}

          {/* Normal view */}
          {!isSearching && (
            <>
              {/* Pinned notes */}
              {pinnedNotes.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center px-4 py-1">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pinned files</h3>
                  </div>
                  {pinnedNotes.map(note => (
                    <NoteItem
                      key={note.id}
                      note={note}
                      isActive={note.id === activeNoteId}
                      onSelect={onSelectNote}
                      onDelete={handleDeleteNote}
                      onTogglePin={onTogglePin}
                      depth={0}
                      alignWithFolders
                    />
                  ))}
                </div>
              )}

              {/* Folders section title */}
              <div className="flex items-center justify-between px-4 py-1 mt-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Folders</h3>
                <button
                  onClick={() => setIsAddingFolder(true)}
                  className="p-1 rounded text-primary hover:bg-accent transition-colors"
                  title="Add folder"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>

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
              {rootFolders.map((folder, index) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  index={index}
                  depth={0}
                  expandedFolders={expandedFolders}
                  dragOverFolder={dragOverFolder}
                  dropIndicator={dropIndicator}
                  activeNoteId={activeNoteId}
                  getNotesByFolder={getNotesByFolder}
                  getChildFolders={getChildFolders}
                  getDescendantFolderIds={getDescendantFolderIds}
                  allFolders={folders}
                  onToggle={toggleFolder}
                  onDrop={handleDrop}
                  onFolderDragOver={handleFolderDragOver}
                  onDragOver={handleDragOver}
                  onDragLeave={() => { setDragOverFolder(null); setDropIndicator(null); }}
                  onCreateNote={onCreateNote}
                  onDeleteFolder={handleDeleteFolder}
                  onSelectNote={onSelectNote}
                  onDeleteNote={handleDeleteNote}
                  onTogglePin={onTogglePin}
                />
              ))}

              {/* Unfiled notes */}
              {unfiledNotes.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between px-4 py-1">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</h3>
                    <button
                      onClick={() => onCreateNote(null)}
                      className="p-1 rounded text-primary hover:bg-accent transition-colors"
                      title="Add note"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  </div>
                  {unfiledNotes.map(note => (
                    <NoteItem
                      key={note.id}
                      note={note}
                      isActive={note.id === activeNoteId}
                      onSelect={onSelectNote}
                      onDelete={handleDeleteNote}
                      onTogglePin={onTogglePin}
                      depth={0}
                    />
                  ))}
                </div>
              )}

              {rootFolders.length === 0 && unfiledNotes.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <DocumentTextIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No notes yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create a folder or note to get started</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions Section */}
        <div className="border-t border-border p-2 space-y-1">
          <button
            onClick={() => onCreateNote(null)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
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
                <StopIcon className="w-4 h-4 fill-current" />
                Stop Recording
              </>
            ) : (
              <>
                <MicrophoneIcon className="w-4 h-4" />
                New voice note
              </>
            )}
          </button>
        </div>

        {/* Import & Settings Section */}
        <div className="border-t border-border p-2">
          <button
            onClick={() => importInputRef.current?.click()}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            Import file
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".md,.markdown,.csv,.html,.htm,.pdf"
            onChange={handleImportFile}
            className="hidden"
          />
          <div className="flex items-center gap-2 px-3 py-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                <User className="w-3.5 h-3.5" />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-foreground">User</span>
          </div>
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
            title="Settings"
          >
            <Cog6ToothIcon className="w-4 h-4" />
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

// Recursive folder component - wrapped with forwardRef to fix console warning
const FolderItem = forwardRef<HTMLDivElement, {
  folder: FolderType;
  index: number;
  depth: number;
  expandedFolders: Set<string>;
  dragOverFolder: string | null;
  dropIndicator: { parentId: string | null; index: number } | null;
  activeNoteId: string | null;
  getNotesByFolder: (id: string) => Note[];
  getChildFolders: (parentId: string | null) => FolderType[];
  getDescendantFolderIds: (folderId: string, allFolders: FolderType[]) => string[];
  allFolders: FolderType[];
  onToggle: (id: string) => void;
  onDrop: (e: React.DragEvent, folderId: string | null) => void;
  onFolderDragOver: (e: React.DragEvent, folder: FolderType, index: number) => void;
  onDragOver: (e: React.DragEvent, folderId: string | null) => void;
  onDragLeave: () => void;
  onCreateNote: (folderId: string | null) => void;
  onDeleteFolder: (folder: FolderType) => void;
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string) => void;
}>(({
  folder, index, depth, expandedFolders, dragOverFolder, dropIndicator, activeNoteId,
  getNotesByFolder, getChildFolders, getDescendantFolderIds, allFolders,
  onToggle, onDrop, onFolderDragOver, onDragOver, onDragLeave,
  onCreateNote, onDeleteFolder, onSelectNote, onDeleteNote, onTogglePin,
}, ref) => {
  const folderNotes = getNotesByFolder(folder.id);
  const childFolders = getChildFolders(folder.id);
  const isExpanded = expandedFolders.has(folder.id);
  const isDragOver = dragOverFolder === folder.id;
  const paddingLeft = 12 + depth * 16;

  const allDescendantIds = getDescendantFolderIds(folder.id, allFolders);
  const totalSubfolders = allDescendantIds.length;
  const totalFiles = [folder.id, ...allDescendantIds].reduce((sum, fid) => sum + getNotesByFolder(fid).length, 0);

  const showDropBefore = dropIndicator?.parentId === folder.parentId && dropIndicator?.index === index;
  const showDropAfter = dropIndicator?.parentId === folder.parentId && dropIndicator?.index === index + 1;

  return (
    <div ref={ref}>
      {showDropBefore && (
        <div className="mx-3 h-0.5 bg-primary rounded-full" style={{ marginLeft: 12 + depth * 16 }} />
      )}
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
        onDragOver={e => onFolderDragOver(e, folder, index)}
        onDragLeave={onDragLeave}
      >
        {isExpanded ? (
          <ChevronDownIcon className="w-3 h-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRightIcon className="w-3 h-3 text-muted-foreground shrink-0" />
        )}
        {isExpanded ? (
          <FolderOpenIcon className="w-4 h-4 text-primary shrink-0" />
        ) : (
          <FolderIcon className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <span className="text-sm text-foreground truncate flex-1">{folder.name}</span>

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

        <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); onCreateNote(folder.id); }}
            className="p-0.5 hover:text-primary"
            title="New note in folder"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDeleteFolder(folder); }}
            className="p-0.5 hover:text-destructive"
            title="Delete folder"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      {showDropAfter && (
        <div className="mx-3 h-0.5 bg-primary rounded-full" style={{ marginLeft: 12 + depth * 16 }} />
      )}

      {isExpanded && (
        <>
          {childFolders.map((child, i) => (
            <FolderItem
              key={child.id}
              folder={child}
              index={i}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              dragOverFolder={dragOverFolder}
              dropIndicator={dropIndicator}
              activeNoteId={activeNoteId}
              getNotesByFolder={getNotesByFolder}
              getChildFolders={getChildFolders}
              getDescendantFolderIds={getDescendantFolderIds}
              allFolders={allFolders}
              onToggle={onToggle}
              onDrop={onDrop}
              onFolderDragOver={onFolderDragOver}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onCreateNote={onCreateNote}
              onDeleteFolder={onDeleteFolder}
              onSelectNote={onSelectNote}
              onDeleteNote={onDeleteNote}
              onTogglePin={onTogglePin}
            />
          ))}
          {folderNotes.map(note => (
            <NoteItem
              key={note.id}
              note={note}
              isActive={note.id === activeNoteId}
              onSelect={onSelectNote}
              onDelete={onDeleteNote}
              onTogglePin={onTogglePin}
              depth={depth + 1}
            />
          ))}
        </>
      )}
    </div>
  );
});
FolderItem.displayName = 'FolderItem';

const NoteItem = forwardRef<HTMLDivElement, {
  note: Note;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  depth: number;
  alignWithFolders?: boolean;
}>(({ note, isActive, onSelect, onDelete, onTogglePin, depth, alignWithFolders }, ref) => {
  const paddingLeft = (alignWithFolders && depth === 0 ? 12 : 28 + depth * 16);
  return (
    <div
      ref={ref}
      draggable
      onDragStart={e => {
        e.stopPropagation();
        e.dataTransfer.setData('noteId', note.id);
      }}
      onClick={() => onSelect(note.id)}
      className={`group relative flex items-center gap-2 py-1.5 pr-4 mx-1 rounded-md cursor-pointer transition-colors ${
        isActive ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-foreground'
      }`}
      style={{ paddingLeft }}
    >
      <DocumentTextIcon className="w-3.5 h-3.5 shrink-0 opacity-60" />
      <span className="text-sm truncate flex-1">{note.title || 'Untitled'}</span>
      <div className="absolute right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); onTogglePin(note.id); }}
          className={`p-0.5 ${note.pinned ? 'text-primary' : 'hover:text-primary'}`}
          title={note.pinned ? 'Unpin' : 'Pin'}
        >
          <Pin className="w-4 h-4" />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(note.id); }}
          className="p-0.5 hover:text-destructive"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});
NoteItem.displayName = 'NoteItem';
