import { useState, useEffect, useReducer } from 'react';
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
  disabled?: boolean;
}

function MenuButton({ onClick, icon, label, destructive, disabled }: MenuButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      disabled={disabled}
      className={`p-1.5 rounded-md transition-colors flex items-center gap-0.5 ${
        disabled
          ? 'text-muted-foreground/40 cursor-not-allowed'
          : destructive
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

export function TableToolbar({ editor, confirmDeleteTable }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  useEffect(() => {
    editor.on('selectionUpdate', forceUpdate);
    editor.on('update', forceUpdate);
    return () => {
      editor.off('selectionUpdate', forceUpdate);
      editor.off('update', forceUpdate);
    };
  }, [editor]);

  const { $from } = editor.state.selection;

  const isCellSelected = (() => {
    for (let depth = $from.depth; depth > 0; depth--) {
      const nodeName = $from.node(depth).type.name;
      if (nodeName === 'tableCell' || nodeName === 'tableHeader') return true;
    }
    return false;
  })();

  let hasTable = false;
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'table') {
      hasTable = true;
      return false;
    }
    return true;
  });

  const handleDeleteTable = () => {
    if (confirmDeleteTable) {
      setShowDeleteConfirm(true);
    } else {
      editor.chain().focus().deleteTable().run();
    }
  };

  if (!hasTable) return null;

  return (
    <>
      <div className={`flex items-center gap-0.5 pl-6 pr-2 py-1 border-b border-border bg-background/50 flex-wrap transition-opacity ${!isCellSelected ? 'opacity-50 pointer-events-none' : ''}`}>
        <MenuButton
          onClick={() => moveRowUp(editor)}
          icon={<ArrowUp className="w-4 h-4" />}
          label="Move row up"
          disabled={!isCellSelected}
        />
        <MenuButton
          onClick={() => moveRowDown(editor)}
          icon={<ArrowDown className="w-4 h-4" />}
          label="Move row down"
          disabled={!isCellSelected}
        />
        <div className="w-px h-4 bg-border mx-0.5" />
        <MenuButton
          onClick={() => editor.chain().focus().addRowAfter().run()}
          icon={<><Plus className="w-3 h-3" /><Rows3 className="w-4 h-4" /></>}
          label="Add row"
          disabled={!isCellSelected}
        />
        <MenuButton
          onClick={() => editor.chain().focus().deleteRow().run()}
          icon={<><Minus className="w-3 h-3" /><Rows3 className="w-4 h-4" /></>}
          label="Delete row"
          destructive
          disabled={!isCellSelected}
        />
        <div className="w-px h-4 bg-border mx-0.5" />
        <MenuButton
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          icon={<><Plus className="w-3 h-3" /><Columns3 className="w-4 h-4" /></>}
          label="Add column"
          disabled={!isCellSelected}
        />
        <MenuButton
          onClick={() => editor.chain().focus().deleteColumn().run()}
          icon={<><Minus className="w-3 h-3" /><Columns3 className="w-4 h-4" /></>}
          label="Delete column"
          destructive
          disabled={!isCellSelected}
        />
        <div className="w-px h-4 bg-border mx-0.5" />
        <MenuButton
          onClick={handleDeleteTable}
          icon={<Trash2 className="w-4 h-4" />}
          label="Delete table"
          destructive
          disabled={!isCellSelected}
        />
      </div>

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
