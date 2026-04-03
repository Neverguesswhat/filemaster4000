import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DocumentTextIcon, TrashIcon, FolderIcon } from '@heroicons/react/24/outline';
import type { Note } from '@/types/notes';

type Step = 'choose' | 'select-files';

interface Props {
  open: boolean;
  folderName: string;
  notes: Note[];
  onClose: () => void;
  onDeleteAll: () => void;
  onKeepSelected: (noteIds: string[]) => void;
}

export function DeleteFolderDialog({ open, folderName, notes, onClose, onDeleteAll, onKeepSelected }: Props) {
  const [step, setStep] = useState<Step>('choose');
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());

  const handleClose = () => {
    setStep('choose');
    setSelectedNotes(new Set());
    onClose();
  };

  const toggleNote = (id: string) => {
    setSelectedNotes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleKeep = () => {
    onKeepSelected(Array.from(selectedNotes));
    handleClose();
  };

  const handleDeleteAll = () => {
    onDeleteAll();
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        {step === 'choose' ? (
          <>
            <DialogHeader>
              <DialogTitle>Delete "{folderName}"</DialogTitle>
              <DialogDescription>
                This folder contains {notes.length} {notes.length === 1 ? 'file' : 'files'}. What would you like to do?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-4">
              <Button
                variant="destructive"
                className="justify-start gap-2"
                onClick={handleDeleteAll}
              >
                <Trash2 className="w-4 h-4" />
                Delete all files
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2"
                onClick={() => setStep('select-files')}
              >
                <FolderCheck className="w-4 h-4" />
                Select files to keep
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Select files to keep</DialogTitle>
              <DialogDescription>
                Selected files will be moved to a "To Sort" folder. Unselected files will be deleted.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-1 py-2">
                {notes.map(note => (
                  <label
                    key={note.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedNotes.has(note.id)}
                      onCheckedChange={() => toggleNote(note.id)}
                    />
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground truncate">{note.title || 'Untitled'}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setStep('choose')}>Back</Button>
              <Button onClick={handleKeep}>
                {selectedNotes.size > 0
                  ? `Keep ${selectedNotes.size} file${selectedNotes.size > 1 ? 's' : ''}`
                  : 'Delete all files'
                }
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
