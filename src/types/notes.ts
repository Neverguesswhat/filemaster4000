export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  position: number;
  createdAt: number;
}

export interface MediaFile {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  folderId: string | null;
  noteId: string;
}
