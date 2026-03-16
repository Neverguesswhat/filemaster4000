import { useEffect } from 'react';

interface ShortcutHandlers {
  onNewNote: () => void;
  onSearch: () => void;
}

export function useKeyboardShortcuts({ onNewNote, onSearch }: ShortcutHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      switch (e.key.toLowerCase()) {
        case 'n':
          if (!e.shiftKey) {
            e.preventDefault();
            onNewNote();
          }
          break;
        case 'k':
          e.preventDefault();
          onSearch();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNewNote, onSearch]);
}
