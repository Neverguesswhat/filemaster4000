import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNotes } from '@/hooks/useNotes';
import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { FolderSidebar } from '@/components/FolderSidebar';
import { NoteEditor } from '@/components/NoteEditor';
import { SettingsPanel } from '@/components/SettingsPanel';
import { DocumentTextIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

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

  // Search predictions state
  const [showPredictions, setShowPredictions] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isSearching = searchQuery.trim().length > 0;

  const predictions = useMemo(() => {
    if (!isSearching) return [];
    const q = searchQuery.toLowerCase();
    return notes
      .filter(n => n.title.toLowerCase().includes(q))
      .slice(0, 5);
  }, [notes, searchQuery, isSearching]);

  const handlePredictionSelect = useCallback((note: typeof notes[0]) => {
    setActiveNoteId(note.id);
    setSearchQuery('');
    setShowPredictions(false);
    setSelectedPrediction(-1);
  }, [setActiveNoteId]);

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
    searchInputRef.current?.focus();
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
        <div className="px-4 flex items-center flex-1">
          <div className="relative w-full max-w-sm">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowPredictions(true);
                setSelectedPrediction(-1);
              }}
              onFocus={() => { if (searchQuery.trim()) setShowPredictions(true); }}
              onBlur={() => setTimeout(() => setShowPredictions(false), 150)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search notes… (⌘K)"
              className="w-full pl-8 pr-7 py-1 text-sm bg-background border border-input rounded-md outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setShowPredictions(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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
    </div>
  );
};

export default Index;
