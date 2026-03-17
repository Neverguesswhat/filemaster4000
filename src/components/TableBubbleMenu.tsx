import { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { ArrowUp, ArrowDown, Plus, Minus, Trash2, Rows3, Columns3 } from 'lucide-react';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

interface Props {
  editor: Editor;
  confirmDeleteTable: boolean;
}

interface MenuButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
}

function MenuButton({ onClick, icon, label, destructive }: MenuButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-1.5 rounded-md transition-colors flex items-center gap-0.5 ${
        destructive
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      }`}
    >
      {icon}
    </button>
  );
}

function moveRowUp(editor: Editor) {
  const { state, dispatch } = editor.view;
  const { $from } = state.selection;
  let tablePos = -1;
  let rowIndex = -1;
  let tableNode: any = null;

  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'table') {
      tablePos = $from.before(depth);
      tableNode = node;
      const rowNode = $from.node(depth + 1);
      tableNode.forEach((child: any, _offset: number, index: number) => {
        if (child === rowNode) rowIndex = index;
      });
      break;
    }
  }

  if (tablePos === -1 || rowIndex <= 0 || !tableNode) return;

  const rows: any[] = [];
  tableNode.forEach((row: any) => rows.push(row));
  const newRows = [...rows];
  [newRows[rowIndex - 1], newRows[rowIndex]] = [newRows[rowIndex], newRows[rowIndex - 1]];

  const newTable = tableNode.type.create(tableNode.attrs, newRows);
  const tr = state.tr.replaceWith(tablePos, tablePos + tableNode.nodeSize, newTable);
  dispatch(tr);
}

function moveRowDown(editor: Editor) {
  const { state, dispatch } = editor.view;
  const { $from } = state.selection;
  let tablePos = -1;
  let rowIndex = -1;
  let tableNode: any = null;

  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'table') {
      tablePos = $from.before(depth);
      tableNode = node;
      const rowNode = $from.node(depth + 1);
      tableNode.forEach((child: any, _offset: number, index: number) => {
        if (child === rowNode) rowIndex = index;
      });
      break;
    }
  }

  if (tablePos === -1 || !tableNode || rowIndex >= tableNode.childCount - 1) return;

  const rows: any[] = [];
  tableNode.forEach((row: any) => rows.push(row));
  const newRows = [...rows];
  [newRows[rowIndex], newRows[rowIndex + 1]] = [newRows[rowIndex + 1], newRows[rowIndex]];

  const newTable = tableNode.type.create(tableNode.attrs, newRows);
  const tr = state.tr.replaceWith(tablePos, tablePos + tableNode.nodeSize, newTable);
  dispatch(tr);
}

export function TableBubbleMenu({ editor, confirmDeleteTable }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const cell = target.closest('td, th');
    if (!cell) return;
    // Ensure the cell is inside the editor's table
    const editorDom = editor.view.dom;
    if (!editorDom.contains(cell)) return;

    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
  }, [editor]);

  const closeMenu = useCallback(() => {
    setMenuPos(null);
  }, []);

  useEffect(() => {
    const editorDom = editor.view.dom;
    editorDom.addEventListener('contextmenu', handleContextMenu);
    return () => editorDom.removeEventListener('contextmenu', handleContextMenu);
  }, [editor, handleContextMenu]);

  // Close on click outside
  useEffect(() => {
    if (!menuPos) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuPos, closeMenu]);

  const handleDeleteTable = () => {
    if (confirmDeleteTable) {
      setShowDeleteConfirm(true);
    } else {
      editor.chain().focus().deleteTable().run();
    }
    closeMenu();
  };

  const runAndClose = (fn: () => void) => {
    fn();
    closeMenu();
  };

  return (
    <>
      {menuPos && (
        <div
          ref={menuRef}
          className="fixed z-50 flex items-center gap-0.5 bg-popover border border-border rounded-lg shadow-lg p-1"
          style={{ left: menuPos.x, top: menuPos.y - 48 }}
        >
          <MenuButton
            onClick={() => runAndClose(() => moveRowUp(editor))}
            icon={<ArrowUp className="w-4 h-4" />}
            label="Move row up"
          />
          <MenuButton
            onClick={() => runAndClose(() => moveRowDown(editor))}
            icon={<ArrowDown className="w-4 h-4" />}
            label="Move row down"
          />
          <div className="w-px h-5 bg-border mx-0.5" />
          <MenuButton
            onClick={() => runAndClose(() => editor.chain().focus().addRowAfter().run())}
            icon={<><Plus className="w-3 h-3" /><Rows3 className="w-4 h-4" /></>}
            label="Add row"
          />
          <MenuButton
            onClick={() => runAndClose(() => editor.chain().focus().deleteRow().run())}
            icon={<><Minus className="w-3 h-3" /><Rows3 className="w-4 h-4" /></>}
            label="Delete row"
            destructive
          />
          <div className="w-px h-5 bg-border mx-0.5" />
          <MenuButton
            onClick={() => runAndClose(() => editor.chain().focus().addColumnAfter().run())}
            icon={<><Plus className="w-3 h-3" /><Columns3 className="w-4 h-4" /></>}
            label="Add column"
          />
          <MenuButton
            onClick={() => runAndClose(() => editor.chain().focus().deleteColumn().run())}
            icon={<><Minus className="w-3 h-3" /><Columns3 className="w-4 h-4" /></>}
            label="Delete column"
            destructive
          />
          <div className="w-px h-5 bg-border mx-0.5" />
          <MenuButton
            onClick={handleDeleteTable}
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete table"
            destructive
          />
        </div>
      )}

      <ConfirmDeleteDialog
        open={showDeleteConfirm}
        onConfirm={() => {
          editor.chain().focus().deleteTable().run();
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete table?"
        description="This will permanently delete the entire table and its contents."
      />
    </>
  );
}
