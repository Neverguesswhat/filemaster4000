import { useState } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { ArrowUp, ArrowDown, Plus, Minus, Trash2 } from 'lucide-react';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

interface Props {
  editor: Editor;
  confirmDeleteTable: boolean;
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

  const handleDeleteTable = () => {
    if (confirmDeleteTable) {
      setShowDeleteConfirm(true);
    } else {
      editor.chain().focus().deleteTable().run();
    }
  };

  return (
    <>
      <BubbleMenu
        editor={editor}
        shouldShow={({ editor }) => editor.isActive('table')}
        className="flex items-center gap-1 bg-popover border border-border rounded-lg shadow-lg p-1"
      >
        {/* Row movement: ↑ ↓ */}
        <MenuButton
          onClick={() => moveRowUp(editor)}
          icon={<ArrowUp className="w-4 h-4" />}
          label="Move row up"
        />
        <MenuButton
          onClick={() => moveRowDown(editor)}
          icon={<ArrowDown className="w-4 h-4" />}
          label="Move row down"
        />
        <div className="w-px h-5 bg-border mx-0.5" />
        {/* Add / remove rows */}
        <MenuButton
          onClick={() => editor.chain().focus().addRowAfter().run()}
          icon={<Plus className="w-4 h-4" />}
          label="Add row"
        />
        <MenuButton
          onClick={() => editor.chain().focus().deleteRow().run()}
          icon={<Minus className="w-4 h-4" />}
          label="Delete row"
          destructive
        />
        <div className="w-px h-5 bg-border mx-0.5" />
        {/* Add / remove columns */}
        <MenuButton
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          icon={<Plus className="w-4 h-4" />}
          label="Add column"
        />
        <MenuButton
          onClick={() => editor.chain().focus().deleteColumn().run()}
          icon={<Minus className="w-4 h-4" />}
          label="Delete column"
          destructive
        />
        <div className="w-px h-5 bg-border mx-0.5" />
        {/* Delete table */}
        <MenuButton
          onClick={handleDeleteTable}
          icon={<Trash2 className="w-4 h-4" />}
          label="Delete table"
          destructive
        />
      </BubbleMenu>

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

function MenuButton({ onClick, icon, label, destructive }: { onClick: () => void; icon: React.ReactNode; label: string; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-1.5 rounded-md transition-colors flex items-center gap-0.5 ${
        destructive
          ? 'text-destructive hover:bg-destructive/10 font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      }`}
    >
      {icon}
    </button>
  );
}
