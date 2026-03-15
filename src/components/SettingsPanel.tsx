import { Settings, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onClose: () => void;
  confirmDelete: boolean;
  onToggleConfirmDelete: (value: boolean) => void;
  confirmDeleteAiChat: boolean;
  onToggleConfirmDeleteAiChat: (value: boolean) => void;
  confirmDeleteTable: boolean;
  onToggleConfirmDeleteTable: (value: boolean) => void;
}

export function SettingsPanel({ open, onClose, confirmDelete, onToggleConfirmDelete, confirmDeleteAiChat, onToggleConfirmDeleteAiChat, confirmDeleteTable, onToggleConfirmDeleteTable }: Props) {
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="sm:max-w-sm">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-sm">
            <Settings className="w-4 h-4" />
            Settings
          </SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6">
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
