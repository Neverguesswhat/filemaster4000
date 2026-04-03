import { useState } from 'react';
import { Cog6ToothIcon, ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { exportAllAsZip } from '@/lib/exportAll';
import type { Note, Folder } from '@/types/notes';
import { toast } from 'sonner';

type Theme = 'light' | 'dark' | 'system';

interface Props {
  open: boolean;
  onClose: () => void;
  confirmDelete: boolean;
  onToggleConfirmDelete: (value: boolean) => void;
  confirmDeleteAiChat: boolean;
  onToggleConfirmDeleteAiChat: (value: boolean) => void;
  confirmDeleteTable: boolean;
  onToggleConfirmDeleteTable: (value: boolean) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  notes: Note[];
  folders: Folder[];
}

export function SettingsPanel({ open, onClose, confirmDelete, onToggleConfirmDelete, confirmDeleteAiChat, onToggleConfirmDeleteAiChat, confirmDeleteTable, onToggleConfirmDeleteTable, theme, onThemeChange, notes, folders }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExportAll = async () => {
    setExporting(true);
    try {
      await exportAllAsZip(notes, folders);
      toast.success('Export complete');
    } catch (e) {
      console.error(e);
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="sm:max-w-sm">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-sm">
            <Cog6ToothIcon className="w-4 h-4" />
            Settings
          </SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Theme */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Appearance</h3>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as Theme[]).map(t => (
                <button
                  key={t}
                  onClick={() => onThemeChange(t)}
                  className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors capitalize ${
                    theme === t
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Delete confirmation */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Delete confirmation</h3>
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="confirm-delete" className="flex flex-col gap-1 cursor-pointer">
                  <span className="text-sm font-medium">Files & folders</span>
                  <span className="text-xs text-muted-foreground font-normal">Confirm before deleting files and folders</span>
                </Label>
                <Switch id="confirm-delete" checked={confirmDelete} onCheckedChange={onToggleConfirmDelete} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="confirm-delete-ai" className="flex flex-col gap-1 cursor-pointer">
                  <span className="text-sm font-medium">AI conversations</span>
                  <span className="text-xs text-muted-foreground font-normal">Confirm before deleting AI conversations</span>
                </Label>
                <Switch id="confirm-delete-ai" checked={confirmDeleteAiChat} onCheckedChange={onToggleConfirmDeleteAiChat} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="confirm-delete-table" className="flex flex-col gap-1 cursor-pointer">
                  <span className="text-sm font-medium">Tables</span>
                  <span className="text-xs text-muted-foreground font-normal">Confirm before deleting tables in the editor</span>
                </Label>
                <Switch id="confirm-delete-table" checked={confirmDeleteTable} onCheckedChange={onToggleConfirmDeleteTable} />
              </div>
            </div>
          </div>

          {/* Export */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Data</h3>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleExportAll}
              disabled={exporting || notes.length === 0}
            >
              {exporting ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ArrowDownTrayIcon className="w-4 h-4" />}
              {exporting ? 'Exporting…' : 'Export all notes as ZIP'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Downloads all notes as printable HTML files organized in their folder structure.</p>
          </div>

          {/* Keyboard shortcuts */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Keyboard shortcuts</h3>
            <div className="space-y-2 text-sm">
              {[
                ['⌘/Ctrl + N', 'New note'],
                ['⌘/Ctrl + K', 'Search notes'],
                ['⌘/Ctrl + B', 'Bold'],
                ['⌘/Ctrl + I', 'Italic'],
                ['⌘/Ctrl + Shift + S', 'Strikethrough'],
              ].map(([keys, desc]) => (
                <div key={keys} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{desc}</span>
                  <kbd className="px-2 py-0.5 text-xs font-mono bg-muted rounded border border-border">{keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
