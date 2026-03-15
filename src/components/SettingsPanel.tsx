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
}

export function SettingsPanel({ open, onClose, confirmDelete, onToggleConfirmDelete, confirmDeleteAiChat, onToggleConfirmDeleteAiChat }: Props) {
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
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="confirm-delete" className="flex flex-col gap-1 cursor-pointer">
              <span className="text-sm font-medium">Delete confirmation</span>
              <span className="text-xs text-muted-foreground font-normal">Show a confirmation dialog before deleting files and folders</span>
            </Label>
            <Switch
              id="confirm-delete"
              checked={confirmDelete}
              onCheckedChange={onToggleConfirmDelete}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
