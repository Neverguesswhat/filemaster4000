import { useState, useCallback } from 'react';
import type { Note, Folder, MediaFile } from '@/types/notes';

const generateId = () => crypto.randomUUID();

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const activeNote = notes.find(n => n.id === activeNoteId) ?? null;

  const createFolder = useCallback((name: string) => {
    const folder: Folder = { id: generateId(), name, createdAt: Date.now() };
    setFolders(prev => [...prev, folder]);
    return folder;
  }, []);

  const renameFolder = useCallback((id: string, name: string) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id));
    setNotes(prev => prev.map(n => n.folderId === id ? { ...n, folderId: null } : n));
  }, []);

  const createNote = useCallback((folderId: string | null = null) => {
    const note: Note = {
      id: generateId(),
      title: 'Untitled',
      content: '',
      folderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes(prev => [...prev, note]);
    setActiveNoteId(note.id);
    return note;
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'folderId'>>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    setActiveNoteId(prev => prev === id ? null : prev);
  }, []);

  const moveNoteToFolder = useCallback((noteId: string, folderId: string) => {
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, folderId, updatedAt: Date.now() } : n));
  }, []);

  const addMedia = useCallback((file: File, noteId: string, folderId: string | null): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const mediaFile: MediaFile = {
          id: generateId(),
          name: file.name,
          type: file.type,
          dataUrl: reader.result as string,
          folderId,
          noteId,
        };
        setMedia(prev => [...prev, mediaFile]);
        resolve(mediaFile.dataUrl);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const unfiledNotes = notes.filter(n => n.folderId === null);
  const getNotesByFolder = useCallback((folderId: string) => notes.filter(n => n.folderId === folderId), [notes]);

  return {
    notes, folders, media, activeNote, activeNoteId,
    setActiveNoteId, createFolder, renameFolder, deleteFolder,
    createNote, updateNote, deleteNote, moveNoteToFolder,
    addMedia, unfiledNotes, getNotesByFolder,
  };
}
